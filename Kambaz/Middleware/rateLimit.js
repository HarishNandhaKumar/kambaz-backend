import rateLimit from "express-rate-limit";

// Throttles signin to 5 attempts per IP per 15 minutes.
// Limits brute-force password guessing without locking out legitimate users
// who mistype their password a couple of times.
export const signinLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: "Too many login attempts. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});
