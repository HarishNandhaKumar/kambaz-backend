# Security

This document describes the threat model and defenses of the Kambaz backend. It is intended for code reviewers, contributors, and anyone evaluating the project's security posture. Every claim below is backed by code referenced inline.

---

## Why this document exists

Most LMS-clone tutorials stop at "session auth works." That's a starting point, not a security model. Kambaz was hardened over five focused phases, each addressing a specific class of threat. This file documents what those threats are, how they're defended, and where the defenses live.

---

## Threat model

We assume an adversary who can:

- Send arbitrary HTTP requests to the backend (curl, DevTools, replayed requests)
- Inspect network traffic from a browser session they own
- Read all client-side code (it's public)
- Brute-force credentials at HTTP rates

We do **not** defend against:

- A compromised database (server-side encryption-at-rest is Atlas's responsibility)
- A compromised hosting platform (Render / Vercel)
- Sophisticated browser-side attacks (XSS via supply chain, malicious extensions)
- Insider threats with admin credentials

The threats we explicitly defend against, and where:

| Threat | Mitigation | Code |
|---|---|---|
| Plaintext password storage | bcrypt with per-user salt, cost 10 | [`Kambaz/Users/dao.js`](Kambaz/Users/dao.js) |
| Password leakage in API responses | `sanitize()` strips `password` from every user-returning route | [`Kambaz/Users/routes.js`](Kambaz/Users/routes.js) |
| Brute-force credential stuffing | Per-IP rate limit on signin (5 / 15 min) | [`Kambaz/Middleware/rateLimit.js`](Kambaz/Middleware/rateLimit.js) |
| Privilege escalation via unknown body fields | Zod schemas with `.strict()` reject unknown keys | [`Kambaz/Users/validators.js`](Kambaz/Users/validators.js) |
| NoSQL operator injection (`{ $ne: null }`) | Schema enforces string types on credentials | [`Kambaz/Users/validators.js`](Kambaz/Users/validators.js) |
| Client-controlled quiz scores | Server-side grading from DB-stored answers | [`Kambaz/QuizAttempts/grader.js`](Kambaz/QuizAttempts/grader.js) |
| Quiz attempt-limit bypass | Server checks attempt count against quiz settings | [`Kambaz/QuizAttempts/routes.js`](Kambaz/QuizAttempts/routes.js) |
| Unauthorized state mutation by students | Role-based middleware on every faculty operation | [`Kambaz/Middleware/auth.js`](Kambaz/Middleware/auth.js) |
| Cross-user data access ("read someone else's profile") | Ownership-based middleware (`requireSelfOrRole`) | [`Kambaz/Middleware/auth.js`](Kambaz/Middleware/auth.js) |
| Clickjacking, MIME sniffing, mixed content | `helmet` defaults | [`app.js`](app.js) |
| Information disclosure via Mongoose internals | `versionKey: false` on all schemas | every `*/schema.js` |

---

## Defense architecture

### The middleware pipeline

Every request to a write endpoint flows through this sequence of gates. Each gate has a single responsibility; none of them know about the others.

```
request
  │
  ▼
helmet ─────────────► sets security headers on every response
  │
  ▼
cors ───────────────► origin allowlist (CLIENT_URL env var)
  │
  ▼
session ────────────► attaches req.session from cookie
  │
  ▼
json body parser
  │
  ▼
signinLimiter ──────► [signin only] 5 attempts / 15min / IP
  │
  ▼
requireUser ────────► [protected only] 401 if no session
  │
  ▼
requireRole │
  or          ──────► [authorized only] 403 if wrong role/owner
requireSelfOrRole │
  │
  ▼
validateBody(schema) ► 400 if body fails zod parse, mutates req.body to clean version
  │
  ▼
handler ────────────► business logic, never sees malformed input or unauthorized callers
```

Each gate is composable. A route's full security model is declared at registration:

```js
app.put("/api/users/:userId",
    requireUser,
    requireSelfOrRole("userId", "ADMIN"),
    validateBody(updateUserSchema),
    updateUser);
```

This reads as: *"to update a user, the caller must be authenticated, be either the user themselves or an admin, and submit a body that parses against the update schema."* Reordering, swapping, or composing differently is a one-line change.

### Why this composition matters

A single fused `requireFacultyAndValidateBody` function would couple two responsibilities, making the security model implicit. Decomposed into atoms:

- The same `requireUser` is reused on 30+ routes
- A new policy ("requireOwnerOfCourse") is one new file, no edits to existing ones
- Tests can exercise each gate independently

This is the **chain of responsibility** pattern applied to authorization.

---

## Defenses by layer

### 1. Authentication — `bcrypt` + sessions

Passwords are hashed with bcrypt at cost 10 before persistence. The DAO exposes only credential-comparing methods; routes never see plaintext passwords after signup.

```js
// Kambaz/Users/dao.js
const createUser = async (user) => {
    const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
    return model.create({ ...user, password: hashedPassword, _id: uuidv4() });
};

const findUserByCredentials = async (username, password) => {
    const user = await model.findOne({ username });
    if (!user) return null;
    const matches = await bcrypt.compare(password, user.password);
    return matches ? user : null;
};
```

`bcrypt.compare` is constant-time, defeating timing attacks that distinguish "wrong password" from "user does not exist."

**Migration**: a one-shot, idempotent script (`migrate-hash-passwords.js`) detects bcrypt's `$2` prefix to skip already-hashed users. Safe to re-run; no flag file or applied-migrations table needed at this scale.

### 2. Password handling at the API boundary

Every endpoint that returns a user object passes it through a `sanitize()` helper that strips `password`. The session store also receives the sanitized form, so a debug log of the session never leaks the hash.

```js
// Kambaz/Users/routes.js
const sanitize = (user) => {
    if (!user) return user;
    const obj = typeof user.toObject === "function" ? user.toObject() : { ...user };
    delete obj.password;
    return obj;
};
```

Centralizing this in a helper means future fields (a hypothetical `passwordResetToken`, `failedLoginCount`) get filtered in one place.

### 3. Input validation — zod with `.strict()` mode

Every write endpoint passes its body through a zod schema before reaching the handler. Schemas use `.strict()` mode, which **rejects unknown keys**.

```js
// Kambaz/Users/validators.js
export const signupSchema = z.object({
    username: z.string().trim().min(3).max(30),
    password: z.string().min(6).max(100),
    firstName: z.string().trim().max(50).optional(),
    lastName: z.string().trim().max(50).optional(),
    email: z.string().trim().email().optional(),
    dob: z.coerce.date().optional(),
}).strict();
```

Two security implications of `.strict()`:

- **Privilege escalation via `role` field is impossible.** A POST with `{ role: "ADMIN" }` is rejected with 400 before any DAO call. The schema doesn't list `role` — defaults are server-controlled.
- **Field-shadowing attacks fail.** Unknown keys can't sneak into Mongoose's spread.

The middleware factory replaces `req.body` with the *parsed* version (parse-don't-validate) so handlers always see clean, typed data:

```js
// Kambaz/Middleware/validate.js
export const validateBody = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({
            message: "Invalid request body",
            errors: result.error.flatten().fieldErrors,
        });
    }
    req.body = result.data;
    next();
};
```

### 4. Authorization — role-based and ownership-based

Authorization is split across three composable middlewares:

- **`requireUser`** — must be authenticated. Attaches `req.user`.
- **`requireRole(...allowedRoles)`** — must have one of the listed roles.
- **`requireSelfOrRole(paramName, ...allowedRoles)`** — must own the resource (URL param matches `req.user._id`, or value is `"current"`), OR have one of the listed roles.

Faculty operations (create/update/delete on courses, modules, assignments, quizzes, questions) are gated with `requireRole("FACULTY", "ADMIN")`. User-scoped operations (read profile, update profile, view enrollments) use `requireSelfOrRole`.

Notable design call: **`PUT /api/users/:userId` requires self or ADMIN — *not* FACULTY.** Profile data is personal; faculty can't edit other users' names or emails. If domain requirements change (e.g., a registrar correcting student records), the policy is one line.

### 5. Server-side authority — quiz grading and attempt limits

This is the architectural lesson the codebase exists to teach. **The server does not trust the client to compute its own grade.**

The original implementation accepted `score` and `maxScore` from the request body. Any student could open DevTools and POST `{ score: 100 }` for a perfect grade. The fix:

1. The submit schema (`submitAttemptSchema`) accepts only `answers`. Any extra `score` or `maxScore` field is rejected with 400.
2. The route handler fetches the quiz's questions from the DB and calls a pure function `gradeAttempt(answers, questions)` to compute the score from the *server's* knowledge of correct answers.
3. The handler stores the server-computed score, ignoring whatever the client may have tried to claim.

```js
// Kambaz/QuizAttempts/routes.js
const submitAttempt = async (req, res) => {
    const { quizId } = req.params;
    const quiz = await quizzesDao.findQuizById(quizId);
    // ... attempt-limit check ...
    const questions = await questionsDao.findQuestionsForQuiz(quizId);
    const { score, maxScore } = gradeAttempt(req.body.answers, questions);
    const attempt = await dao.createAttempt({
        quiz: quizId,
        student: req.user._id,
        answers: req.body.answers,
        score,                         // server-computed
        maxScore,                      // server-computed
    });
    res.status(201).json(attempt);
};
```

The grader is a pure function in [`Kambaz/QuizAttempts/grader.js`](Kambaz/QuizAttempts/grader.js) — no I/O, no Mongoose, no `req`/`res`. This is the **functional core, imperative shell** pattern: side-effecting code (route handler) is a thin adapter around side-effect-free logic (the grader). The grader has 9 unit tests that verify it without touching the database.

**Attempt-limit enforcement** follows the same principle: the server reads the quiz's `multipleAttempts` and `howManyAttempts` settings, looks up the student's prior attempt count, and rejects a 6th submission to a quiz capped at 5. Faculty users bypass the limit so they can test their own quizzes.

### 6. Rate limiting

Brute-force protection on the signin endpoint via `express-rate-limit`:

```js
// Kambaz/Middleware/rateLimit.js
export const signinLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: "Too many login attempts. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});
```

Five attempts per IP per 15 minutes. Both successful and failed attempts count, intentionally — the limiter is also a defense against credential-stuffing (which uses correct passwords from a leaked database).

The limiter is in-memory by default. In a multi-instance deployment, this means each backend instance has its own counter — so a determined attacker hitting a load-balancer round-robin gets ~`max * instance_count` attempts. Replace with the Redis store (`rate-limit-redis`) when scaling beyond one instance.

### 7. HTTP hardening — `helmet`

`helmet()` is mounted before `cors` so its headers apply to every response, including CORS preflights. The defaults are sensible:

| Header | Purpose |
|---|---|
| `Content-Security-Policy` | restricts script/style/image origins |
| `Cross-Origin-Resource-Policy: same-origin` | prevents cross-origin embedding |
| `Strict-Transport-Security` | forces HTTPS for one year after first connection |
| `X-Content-Type-Options: nosniff` | disables browser MIME-type guessing |
| `X-Frame-Options: SAMEORIGIN` | prevents iframe embedding (clickjacking) |
| `Referrer-Policy: no-referrer` | strips Referer header on outbound navigation |

Cookie configuration adapts to environment:

```js
if (process.env.SERVER_ENV !== "development") {
    sessionOptions.proxy = true;
    sessionOptions.cookie = {
        sameSite: "none",
        secure: true,
    };
}
```

Production uses `Secure: true` cookies (HTTPS-only) with `SameSite: None` to support the cross-origin Vercel-frontend → Render-backend flow. Development relaxes both for `http://localhost`.

### 8. Information disclosure — `versionKey: false`

All Mongoose schemas suppress the auto-generated `__v` field. Three reasons:

- It tells API consumers "this is a Mongoose backend" — minor reconnaissance value
- It clutters API responses with framework noise
- If the project ever migrates off Mongoose, hardcoded `__v` checks break clients

```js
// every Kambaz/*/schema.js
{ collection: "...", versionKey: false }
```

---

## Worked example: how the score-cheat is defended in three layers

A student trying to POST a fake score is blocked at three independent layers. Each fails closed (the request is rejected) regardless of whether other layers exist.

```
Attacker: POST /api/quizzes/abc/attempts { answers: [], score: 9999 }
                            │
                            ▼
                    [Layer 1: requireUser]
              Anonymous → 401, request stops here.
              Authenticated student → continues.
                            │
                            ▼
                  [Layer 2: validateBody(submitAttemptSchema)]
              schema is .strict() and does not list `score`.
              Result: 400, "Unrecognized key: 'score'"
                            │
                            ▼
            (Even if Layer 2 somehow accepted the score,
             Layer 3 would still ignore it.)
                            │
                            ▼
                    [Layer 3: server-side grader]
              Handler does NOT read req.body.score.
              It calls gradeAttempt(req.body.answers, questions),
              passing only the answers and DB-fetched questions.
              The 9999 in the body is ignored even if it's there.
```

This is **defense in depth**: removing any single layer still leaves two more behind. The corresponding tests verify each layer independently:

- [`__tests__/auth-routes.test.js`](__tests__/auth-routes.test.js) — anonymous request to `/attempts` → 401 (Layer 1)
- [`__tests__/validators.test.js`](__tests__/validators.test.js) — `submitAttemptSchema.safeParse({ answers: [], score: 9999 })` → fails (Layer 2)
- [`__tests__/grader.test.js`](__tests__/grader.test.js) — `gradeAttempt(answers, questions)` doesn't take `score` as an input at all (Layer 3 by construction)

---

## Verification

Security claims are verified by 36 automated tests across three layers:

| Layer | File | What it proves |
|---|---|---|
| Unit | `__tests__/grader.test.js` | Grading logic is correct for all three question types |
| Unit | `__tests__/validators.test.js` | Schemas reject ADMIN escalation, NoSQL injection, score-cheat fields |
| Integration | `__tests__/auth-routes.test.js` | HTTP wiring routes anonymous calls to 401, malformed bodies to 400, helmet headers are present on every response |

The suite runs in `~7s` with no MongoDB dependency. All test paths short-circuit at validation or auth before any DAO call. Tests run on every push and PR via GitHub Actions (`backend-ci`).

---

## Known limitations

Documented honestly, in priority order:

1. **In-memory rate-limit store.** `express-rate-limit`'s default store is per-process. A horizontally scaled deployment would need `rate-limit-redis` to share state. *Not a concern for current single-instance deploy.*
2. **Default `express-session` MemoryStore.** Sessions are lost on container restart. Replace with `connect-mongo` (~5-line change, reuses the existing Atlas connection) for restart-resilient sessions. *Tracked as a follow-up.*
3. **No DB-touching tests.** Tests cover the schema and HTTP layers but skip paths that exercise `bcrypt.compare` or attempt-limit enforcement against a real database. Adding `mongodb-memory-server` would close this gap.
4. **No CSRF protection.** The session cookie is `SameSite: None` to support cross-origin Vercel→Render, which weakens CSRF protection. A SameSite-aware approach (e.g., `__Host-` cookies + token endpoint) would be stricter. Currently mitigated by the cross-origin allowlist in CORS — a malicious site can't read responses, only send unauthenticated requests, which the auth middleware blocks.
5. **No request-ID logging.** Errors aren't tagged with a per-request ID, so correlating a user-reported failure to server logs requires manual hunting. Trivially fixable with `req.id = randomUUID()` middleware.
6. **No password complexity rules beyond length.** A 6-character all-numeric password passes validation. Adding a denylist (`zxcvbn`-style) is a defensible improvement.
7. **In-memory bcrypt cost factor (10) is fixed.** Periodic re-hashing on next login as the constant-of-time floor rises is industry-standard. Not implemented.

---

## Reporting a vulnerability

This is a portfolio project, not a production service. If you find a security issue and want to report it, **open a private security advisory on GitHub** (`Security` tab → `Advisories` → `Report a vulnerability`) or email the repository owner directly. Public issues are fine for non-exploitable concerns (typos in this doc, etc.).
