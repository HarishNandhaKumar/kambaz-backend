import express from 'express';
import Hello from "./Hello.js";
import Lab5 from "./Lab5/index.js";
import cors from "cors";
import helmet from "helmet";
import db from "./Kambaz/Database/index.js";
import UserRoutes from "./Kambaz/Users/routes.js";
import "dotenv/config";
import session from "express-session";
import CourseRoutes from "./Kambaz/Courses/routes.js";
import EnrollmentRoutes from "./Kambaz/Enrollments/routes.js";
import ModulesRoutes from './Kambaz/Modules/routes.js';
import AssignmentRoutes from './Kambaz/Assignments/routes.js';
import QuizRoutes from "./Kambaz/Quizzes/routes.js";
import QuestionRoutes from './Kambaz/Questions/routes.js';
import QuizAttemptRoutes from './Kambaz/QuizAttempts/routes.js';

const app = express();
app.use(helmet());
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL || "http://localhost:3000",
}));

const sessionOptions = {
    secret: process.env.SESSION_SECRET || "kambaz",
    resave: false,
    saveUninitialized: false,
};

if (process.env.SERVER_ENV !== "development") {
    sessionOptions.proxy = true;
    sessionOptions.cookie = {
        sameSite: "none",
        secure: true,
    };
}

app.use(session(sessionOptions));
app.use(express.json());

UserRoutes(app, db);
CourseRoutes(app, db);
EnrollmentRoutes(app, db);
ModulesRoutes(app, db);
AssignmentRoutes(app, db);
QuizRoutes(app, db);
QuestionRoutes(app);
QuizAttemptRoutes(app);
Hello(app);
Lab5(app);

export default app;
