import request from "supertest";
import app from "../app.js";

// These tests exercise the HTTP layer (middleware ordering, status codes, response shapes)
// without depending on a live MongoDB. Validation and auth middlewares short-circuit
// requests before any DAO call, so the schema-rejection paths are fully testable in isolation.

describe("POST /api/users/signup — validation layer", () => {
    test("rejects role:ADMIN escalation attempt with 400", async () => {
        const res = await request(app)
            .post("/api/users/signup")
            .send({ username: "evilguy", password: "secret123", role: "ADMIN" });
        expect(res.status).toBe(400);
    });

    test("rejects short password with 400", async () => {
        const res = await request(app)
            .post("/api/users/signup")
            .send({ username: "okuser", password: "x" });
        expect(res.status).toBe(400);
    });

    test("rejects unknown extra field with 400", async () => {
        const res = await request(app)
            .post("/api/users/signup")
            .send({ username: "okuser", password: "secret123", isAdmin: true });
        expect(res.status).toBe(400);
    });
});

describe("POST /api/users/signin — validation layer", () => {
    test("rejects NoSQL injection via password type with 400", async () => {
        const res = await request(app)
            .post("/api/users/signin")
            .send({ username: "iron_man", password: { $ne: null } });
        expect(res.status).toBe(400);
    });

    test("rejects missing username with 400", async () => {
        const res = await request(app)
            .post("/api/users/signin")
            .send({ password: "anything" });
        expect(res.status).toBe(400);
    });
});

describe("Protected endpoints — auth layer", () => {
    test("anonymous GET /api/courses returns 401 (requireUser blocks)", async () => {
        const res = await request(app).get("/api/courses");
        expect(res.status).toBe(401);
    });

    test("anonymous POST /api/quizzes/x/attempts returns 401 (requireUser before validation)", async () => {
        const res = await request(app)
            .post("/api/quizzes/anything/attempts")
            .send({ answers: [], score: 9999 });
        expect(res.status).toBe(401);
    });

    test("anonymous DELETE /api/courses/x returns 401", async () => {
        const res = await request(app).delete("/api/courses/anything");
        expect(res.status).toBe(401);
    });
});

describe("Helmet headers", () => {
    test("sets security headers on every response", async () => {
        const res = await request(app).post("/api/users/signin").send({});
        expect(res.headers["x-content-type-options"]).toBe("nosniff");
        expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
        expect(res.headers["strict-transport-security"]).toBeDefined();
    });
});
