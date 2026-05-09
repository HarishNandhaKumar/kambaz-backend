# Kambaz Backend

Express + Mongoose LMS API serving courses, modules, assignments, quizzes, and quiz attempts. Session-based auth, server-side quiz grading, layered authorization with role + ownership middleware.

> Companion frontend: [`kambaz-frontend`](https://github.com/HarishNandhaKumar/kambaz-next-js) (Next.js 15 + TypeScript + Redux Toolkit).

## Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 5
- **Database**: MongoDB via Mongoose 8
- **Auth**: `express-session` + `bcrypt`
- **Validation**: `zod` (parse-don't-validate, strict mode)
- **Security**: `helmet`, `express-rate-limit`
- **Tests**: `jest` 30 + `supertest`

## What's interesting in this codebase

This started as a typical Express LMS clone and was hardened over five focused phases. The interesting bits, in order of "things you'd actually point to in a code walkthrough":

1. **Server-side quiz grading.** The original handler accepted `score` from the client (a real privilege bug — anyone could POST `{ score: 100 }` and ace any quiz). Replaced with a pure `gradeAttempt(answers, questions)` function in `Kambaz/QuizAttempts/grader.js`, called from the route after fetching the question's correct answers from the DB. Pure-function design makes it independently unit-testable.
2. **Composable middleware atoms** in `Kambaz/Middleware/`: `validateBody(schema)`, `requireUser`, `requireRole(...roles)`, `requireSelfOrRole(paramName, ...roles)`, `signinLimiter`. Each is a single-responsibility gate. Routes declare their security model declaratively:
   ```js
   app.put("/api/users/:userId",
       requireUser,
       requireSelfOrRole("userId", "ADMIN"),
       updateUser);
   ```
3. **Strict-mode zod schemas** reject unknown keys at the request boundary. The `role: "ADMIN"` privilege-escalation attack and the NoSQL injection (`password: { $ne: null }`) attack are both blocked at validation, before any DAO call.
4. **Idempotent migration** at `migrate-hash-passwords.js` — detects `$2`-prefix bcrypt hashes and skips already-migrated users, so it's safe to re-run.
5. **`app.js` / `index.js` split** — the Express app is exported separately from the listen call, so tests can import the app without binding to a port.

## Architecture

### Layout

Domain-per-folder, each domain owns its own routes, DAO, model, and schema. Cross-cutting concerns live in `Kambaz/Middleware/`.

```
kambaz-node-backend/
├── app.js                       Express app definition (no listen)
├── index.js                     Process entry: connect Mongo + listen
├── migrate-hash-passwords.js    One-shot bcrypt migration
├── jest.config.js
├── __tests__/
│   ├── grader.test.js           Unit tests on pure gradeAttempt
│   ├── validators.test.js       Unit tests on zod schemas
│   └── auth-routes.test.js      Integration tests via supertest
└── Kambaz/
    ├── Middleware/
    │   ├── auth.js              requireUser, requireRole, requireSelfOrRole
    │   ├── rateLimit.js         signinLimiter
    │   └── validate.js          validateBody factory
    ├── Users/
    │   ├── routes.js  dao.js  model.js  schema.js  validators.js
    ├── Courses/
    ├── Modules/
    ├── Assignments/
    ├── Enrollments/
    ├── Quizzes/
    ├── Questions/
    └── QuizAttempts/
        ├── routes.js  dao.js  model.js  schema.js  validators.js
        └── grader.js            Pure function for server-side scoring
```

### Request pipeline

A typical write endpoint runs through this sequence of middlewares:

```
request
  ↓ helmet (security headers)
  ↓ cors (origin allowlist + credentials)
  ↓ session (cookie-based)
  ↓ json body parser
  ↓ signinLimiter             [signin only]
  ↓ requireUser               [protected endpoints]
  ↓ requireRole / requireSelfOrRole
  ↓ validateBody(schema)
  ↓ handler
response
```

Each gate has a single responsibility. Reordering them is a deliberate choice (e.g. auth before validation so we cheap-fail anonymous requests before running the schema parser).

## Security model

| Concern | Layer |
|---|---|
| Plaintext password storage | bcrypt with per-user salt, cost 10 (`Users/dao.js`) |
| Password leaking in API responses | `sanitize()` strips `password` from every user-returning route (`Users/routes.js`) |
| Brute-force password guessing | `signinLimiter` — 5 attempts / 15 min / IP |
| Untrusted request bodies | `validateBody(schema)` with zod `.strict()` — rejects unknown keys |
| Privilege escalation via `role` field | Schema doesn't accept `role`; signup defaults to `"USER"` |
| NoSQL injection | Schema enforces string types on credentials |
| Client-controlled quiz scores | Server-side grading via `gradeAttempt()` — client's score/maxScore are ignored |
| Quiz attempt-limit cheating | Server checks `getAttemptCount` against `quiz.howManyAttempts` (faculty bypass for testing) |
| Privilege escalation via direct API call | `requireRole("FACULTY", "ADMIN")` on every faculty operation |
| Cross-user data access | `requireSelfOrRole("userId", "ADMIN")` on user-scoped routes |
| Information disclosure | `helmet` headers + `versionKey: false` on schemas |

## Getting started

### Prerequisites

- Node.js 20+
- A running MongoDB instance (local or Atlas)

### Setup

```bash
git clone https://github.com/HarishNandhaKumar/kambaz-backend.git
cd kambaz-backend
npm install
```

### Environment variables

Create a `.env` in the repo root:

```env
DATABASE_CONNECTION_STRING=mongodb://127.0.0.1:27017/kambaz
SESSION_SECRET=<a-long-random-string>
CLIENT_URL=http://localhost:3000
SERVER_ENV=development     # disables Secure-cookie flag for local HTTP
PORT=4000
```

`SERVER_ENV=development` is important for local dev — without it, sessions use `Secure: true` cookies which require HTTPS.

### Run

```bash
npm start                           # starts on http://localhost:4000
npm test                            # runs the jest suite
npm run migrate:hash-passwords      # idempotent bcrypt migration for legacy plaintext-password users
```

## Testing

```bash
npm test
```

36 tests across 3 suites, ~7s. No DB needed — all tests run against the schema layer or short-circuit at validation/auth before any DAO call.

| Suite | Layer | What's covered |
|---|---|---|
| `grader.test.js` | Unit | All three question types (Multiple Choice, True/False, Fill in the Blank), partial credit, case-insensitive matching, edge cases |
| `validators.test.js` | Unit | ADMIN escalation rejected, NoSQL injection rejected, score-cheat fields rejected, password length rules, email format, question-type enum |
| `auth-routes.test.js` | Integration (supertest) | Validation runs through HTTP, auth runs before validation on protected endpoints, helmet headers present, correct status codes |

Tests that need a real MongoDB connection (bcrypt round-trip, attempt-limit enforcement) are deferred until `mongodb-memory-server` is added.

## API overview

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/users/signup` | public | rate-limited indirectly via per-IP signin limiter |
| POST | `/api/users/signin` | public | rate-limited (5 / 15min / IP) |
| POST | `/api/users/signout` | public | |
| POST | `/api/users/profile` | public | returns current session user |
| GET | `/api/users` | FACULTY/ADMIN | |
| GET | `/api/users/:userId` | self OR FACULTY/ADMIN | |
| PUT | `/api/users/:userId` | self OR ADMIN | faculty deliberately can't edit other people's profiles |
| DELETE | `/api/users/:userId` | ADMIN | |
| GET | `/api/courses` | any signed-in | |
| POST/PUT/DELETE | `/api/courses/...` | FACULTY/ADMIN | |
| GET | `/api/courses/:cid/modules` | any signed-in | |
| POST/PUT/DELETE | `/api/modules/...` | FACULTY/ADMIN | |
| GET | `/api/courses/:cid/assignments` | any signed-in | |
| POST/PUT/DELETE | `/api/assignments/...` | FACULTY/ADMIN | |
| GET | `/api/courses/:cid/quizzes` | any signed-in | |
| POST/PUT/DELETE | `/api/quizzes/...` | FACULTY/ADMIN | |
| GET | `/api/quizzes/:qid/questions` | any signed-in | |
| POST/PUT/DELETE | `/api/questions/...` | FACULTY/ADMIN | |
| POST | `/api/quizzes/:qid/attempts` | any signed-in | server grades, faculty bypass attempt-limit |
| GET | `/api/quizzes/:qid/attempts` | any signed-in | filtered to own attempts |
| GET | `/api/enrollments` | FACULTY/ADMIN | full list |
| GET | `/api/users/:uid/enrollments` | self OR FACULTY/ADMIN | |
| POST/DELETE | `/api/users/:uid/courses/:cid` | self OR FACULTY/ADMIN | enroll/unenroll |
| GET | `/api/courses/:cid/users` | FACULTY/ADMIN | course roster |

## License

ISC
