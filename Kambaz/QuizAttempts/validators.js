import { z } from "zod";

const answerEntrySchema = z.object({
    questionId: z.string().min(1),
    answer: z.union([z.string(), z.boolean(), z.array(z.string())]),
}).strict();

export const submitAttemptSchema = z.object({
    answers: z.array(answerEntrySchema),
}).strict();
