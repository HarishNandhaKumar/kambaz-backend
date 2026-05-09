import { z } from "zod";

export const signupSchema = z.object({
    username: z.string().trim().min(3, "username must be at least 3 characters").max(30),
    password: z.string().min(6, "password must be at least 6 characters").max(100),
    firstName: z.string().trim().max(50).optional(),
    lastName: z.string().trim().max(50).optional(),
    email: z.string().trim().email("invalid email").optional(),
    dob: z.coerce.date().optional(),
}).strict();

export const signinSchema = z.object({
    username: z.string().trim().min(1, "username required"),
    password: z.string().min(1, "password required"),
}).strict();
