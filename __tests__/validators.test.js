import { signupSchema, signinSchema } from "../Kambaz/Users/validators.js";
import { submitAttemptSchema } from "../Kambaz/QuizAttempts/validators.js";
import { createQuestionSchema } from "../Kambaz/Questions/validators.js";

describe("signupSchema", () => {
    test("accepts a well-formed signup body", () => {
        const result = signupSchema.safeParse({
            username: "newguy",
            password: "secret123",
            email: "a@b.com",
        });
        expect(result.success).toBe(true);
    });

    test("trims username whitespace (parse-don't-validate)", () => {
        const result = signupSchema.safeParse({ username: "  spacedguy  ", password: "secret123" });
        expect(result.success).toBe(true);
        expect(result.data.username).toBe("spacedguy");
    });

    test("rejects role:ADMIN attack via .strict() (privilege escalation)", () => {
        const result = signupSchema.safeParse({
            username: "evil",
            password: "secret123",
            role: "ADMIN",
        });
        expect(result.success).toBe(false);
        const errMsg = JSON.stringify(result.error);
        expect(errMsg).toMatch(/role/);
    });

    test("rejects passwords shorter than 6 chars", () => {
        const result = signupSchema.safeParse({ username: "ok", password: "x" });
        expect(result.success).toBe(false);
    });

    test("rejects username shorter than 3 chars", () => {
        const result = signupSchema.safeParse({ username: "ab", password: "secret123" });
        expect(result.success).toBe(false);
    });

    test("rejects invalid email format", () => {
        const result = signupSchema.safeParse({
            username: "ok123",
            password: "secret123",
            email: "not-an-email",
        });
        expect(result.success).toBe(false);
    });
});

describe("signinSchema", () => {
    test("accepts username + password", () => {
        const result = signinSchema.safeParse({ username: "iron_man", password: "stark123" });
        expect(result.success).toBe(true);
    });

    test("rejects NoSQL injection via password operator object", () => {
        const result = signinSchema.safeParse({
            username: "iron_man",
            password: { $ne: null },
        });
        expect(result.success).toBe(false);
    });

    test("rejects empty username", () => {
        const result = signinSchema.safeParse({ username: "", password: "secret" });
        expect(result.success).toBe(false);
    });
});

describe("submitAttemptSchema", () => {
    test("accepts valid answers array", () => {
        const result = submitAttemptSchema.safeParse({
            answers: [{ questionId: "abc", answer: "Paris" }],
        });
        expect(result.success).toBe(true);
    });

    test("rejects extra 'score' field (cheat-attempt)", () => {
        const result = submitAttemptSchema.safeParse({
            answers: [],
            score: 9999,
            maxScore: 100,
        });
        expect(result.success).toBe(false);
    });

    test("rejects extra 'student' field (impersonation-attempt)", () => {
        const result = submitAttemptSchema.safeParse({
            answers: [],
            student: "i-am-someone-else",
        });
        expect(result.success).toBe(false);
    });

    test("rejects answers as a string instead of array", () => {
        const result = submitAttemptSchema.safeParse({ answers: "not-an-array" });
        expect(result.success).toBe(false);
    });

    test("accepts boolean answer (True/False question)", () => {
        const result = submitAttemptSchema.safeParse({
            answers: [{ questionId: "q1", answer: true }],
        });
        expect(result.success).toBe(true);
    });

    test("accepts string-array answer (Fill in the Blank)", () => {
        const result = submitAttemptSchema.safeParse({
            answers: [{ questionId: "q1", answer: ["east", "west"] }],
        });
        expect(result.success).toBe(true);
    });
});

describe("createQuestionSchema", () => {
    test("requires question text and type", () => {
        const result = createQuestionSchema.safeParse({});
        expect(result.success).toBe(false);
    });

    test("rejects unknown question types via enum", () => {
        const result = createQuestionSchema.safeParse({
            question: "What is 2+2?",
            type: "Essay",
        });
        expect(result.success).toBe(false);
    });

    test("accepts a Multiple Choice question with choices", () => {
        const result = createQuestionSchema.safeParse({
            question: "What is the capital of France?",
            type: "Multiple Choice",
            points: 5,
            choices: [
                { text: "Paris", isCorrect: true },
                { text: "London", isCorrect: false },
            ],
        });
        expect(result.success).toBe(true);
    });
});
