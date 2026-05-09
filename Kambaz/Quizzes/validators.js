import { z } from "zod";

const quizTypeEnum = z.enum(["Graded Quiz", "Practice Quiz", "Graded Survey", "Ungraded Survey"]);
const assignmentGroupEnum = z.enum(["Quizzes", "Exams", "Assignments", "Project"]);
const showCorrectAnswersEnum = z.enum(["Immediately", "After Due Date", "Never", "Always"]);

const quizFields = {
    title: z.string().trim().min(1, "title required").max(200),
    description: z.string().max(2000).optional(),
    quizType: quizTypeEnum.optional(),
    points: z.number().min(0).optional(),
    assignmentGroup: assignmentGroupEnum.optional(),
    shuffleAnswers: z.boolean().optional(),
    timeLimit: z.number().min(0).optional(),
    multipleAttempts: z.boolean().optional(),
    howManyAttempts: z.number().int().min(1).optional(),
    showCorrectAnswers: showCorrectAnswersEnum.optional(),
    accessCode: z.string().optional(),
    oneQuestionAtATime: z.boolean().optional(),
    webcamRequired: z.boolean().optional(),
    lockQuestionsAfterAnswering: z.boolean().optional(),
    dueDate: z.coerce.date().optional(),
    availableDate: z.coerce.date().optional(),
    untilDate: z.coerce.date().optional(),
    published: z.boolean().optional(),
};

export const createQuizSchema = z.object(quizFields).strict();
export const updateQuizSchema = z.object(quizFields).partial().strict();
