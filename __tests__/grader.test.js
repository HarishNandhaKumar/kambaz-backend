import { gradeAttempt } from "../Kambaz/QuizAttempts/grader.js";

const questions = [
    {
        _id: "q1",
        type: "Multiple Choice",
        points: 5,
        choices: [
            { text: "Paris", isCorrect: true },
            { text: "London", isCorrect: false },
            { text: "Berlin", isCorrect: false },
        ],
    },
    {
        _id: "q2",
        type: "True/False",
        points: 3,
        correctAnswer: true,
    },
    {
        _id: "q3",
        type: "Fill in the Blank",
        points: 2,
        possibleAnswers: ["javascript", ["python", "Python"]],
    },
];

describe("gradeAttempt", () => {
    test("all-correct answers earn full credit", () => {
        const answers = [
            { questionId: "q1", answer: "Paris" },
            { questionId: "q2", answer: true },
            { questionId: "q3", answer: ["JavaScript", "python"] },
        ];
        expect(gradeAttempt(answers, questions)).toEqual({ score: 10, maxScore: 10 });
    });

    test("all-wrong answers earn zero", () => {
        const answers = [
            { questionId: "q1", answer: "London" },
            { questionId: "q2", answer: false },
            { questionId: "q3", answer: ["wrong", "wrong"] },
        ];
        expect(gradeAttempt(answers, questions)).toEqual({ score: 0, maxScore: 10 });
    });

    test("partial credit when only some answers are correct", () => {
        const answers = [
            { questionId: "q1", answer: "Paris" },
            { questionId: "q2", answer: false },
        ];
        expect(gradeAttempt(answers, questions)).toEqual({ score: 5, maxScore: 10 });
    });

    test("fill-in-the-blank is case-insensitive and accepts variants", () => {
        const answers = [{ questionId: "q3", answer: ["JAVASCRIPT", "PYTHON"] }];
        expect(gradeAttempt(answers, questions)).toEqual({ score: 2, maxScore: 10 });
    });

    test("fill-in-the-blank rejects wrong number of blanks", () => {
        const answers = [{ questionId: "q3", answer: ["javascript"] }];
        expect(gradeAttempt(answers, questions).score).toBe(0);
    });

    test("empty answers array still computes correct maxScore", () => {
        expect(gradeAttempt([], questions)).toEqual({ score: 0, maxScore: 10 });
    });

    test("answers with unknown questionIds are ignored, not crashing", () => {
        const answers = [{ questionId: "ghost", answer: "anything" }];
        expect(gradeAttempt(answers, questions)).toEqual({ score: 0, maxScore: 10 });
    });

    test("undefined / missing answer for a question scores 0 for it", () => {
        // Only answers q1 (5pts), leaves q2 and q3 unanswered
        const answers = [{ questionId: "q1", answer: "Paris" }];
        expect(gradeAttempt(answers, questions).score).toBe(5);
    });

    test("question with points: 0 doesn't break anything", () => {
        const zeroPointQuestions = [
            { _id: "q1", type: "True/False", points: 0, correctAnswer: true },
        ];
        expect(gradeAttempt([{ questionId: "q1", answer: true }], zeroPointQuestions))
            .toEqual({ score: 0, maxScore: 0 });
    });
});
