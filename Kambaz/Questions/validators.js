import { z } from "zod";

const questionTypeEnum = z.enum(["Multiple Choice", "True/False", "Fill in the Blank"]);

const choiceSchema = z.object({
    text: z.string(),
    isCorrect: z.boolean(),
}).strict();

const questionFields = {
    title: z.string().max(200).optional(),
    question: z.string().min(1, "question text required"),
    type: questionTypeEnum,
    points: z.number().min(0).optional(),
    choices: z.array(choiceSchema).optional(),
    correctAnswer: z.boolean().optional(),
    possibleAnswers: z.array(z.union([z.string(), z.array(z.string())])).optional(),
};

export const createQuestionSchema = z.object(questionFields).strict();
export const updateQuestionSchema = z.object(questionFields).partial().strict();
