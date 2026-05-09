import QuizAttemptsDao from "../QuizAttempts/dao.js";
import QuestionsDao from "../Questions/dao.js";
import QuizzesDao from "../Quizzes/dao.js";
import { validateBody } from "../Middleware/validate.js";
import { requireUser } from "../Middleware/auth.js";
import { submitAttemptSchema } from "./validators.js";
import { gradeAttempt } from "./grader.js";

export default function QuizAttemptRoutes(app) {
    const dao = QuizAttemptsDao();
    const questionsDao = QuestionsDao();
    const quizzesDao = QuizzesDao();

    // Get all attempts for a quiz by a student
    const findAttemptsForQuiz = async (req, res) => {
        try {
            const { quizId } = req.params;
            const attempts = await dao.findAttemptsForQuiz(quizId, req.user._id);
            res.json(attempts);
        } catch (error) {
            console.error('Error:', error.message);
            res.status(500).json({ message: error.message });
        }
    };

    // Get attempt count for a quiz
    const getAttemptCount = async (req, res) => {
        try {
            const { quizId } = req.params;
            const count = await dao.getAttemptCount(quizId, req.user._id);
            res.json({ count });
        } catch (error) {
            console.error('Error:', error.message);
            res.status(500).json({ message: error.message });
        }
    };

    // Get last attempt for a quiz
    const getLastAttempt = async (req, res) => {
        try {
            const { quizId } = req.params;
            const attempt = await dao.getLastAttempt(quizId, req.user._id);
            res.json(attempt);
        } catch (error) {
            console.error('Error:', error.message);
            res.status(500).json({ message: error.message });
        }
    };

    // Submit a quiz attempt — grading is performed server-side.
    // The client's answers are accepted; any client-supplied score/maxScore is ignored.
    // Attempt-limit is enforced server-side for non-faculty users.
    const submitAttempt = async (req, res) => {
        try {
            const { quizId } = req.params;

            const quiz = await quizzesDao.findQuizById(quizId);
            if (!quiz) {
                return res.status(404).json({ message: "Quiz not found" });
            }

            const isFaculty = ["FACULTY", "ADMIN"].includes(req.user.role);
            if (!isFaculty) {
                const maxAllowed = quiz.multipleAttempts ? (quiz.howManyAttempts || 1) : 1;
                const currentCount = await dao.getAttemptCount(quizId, req.user._id);
                if (currentCount >= maxAllowed) {
                    return res.status(403).json({
                        message: `No more attempts allowed (limit: ${maxAllowed})`,
                    });
                }
            }

            const questions = await questionsDao.findQuestionsForQuiz(quizId);
            const { score, maxScore } = gradeAttempt(req.body.answers, questions);

            const attempt = await dao.createAttempt({
                quiz: quizId,
                student: req.user._id,
                answers: req.body.answers,
                score,
                maxScore,
            });
            res.status(201).json(attempt);
        } catch (error) {
            console.error('Error:', error.message);
            res.status(500).json({ message: error.message });
        }
    };

    // Register routes
    app.get("/api/quizzes/:quizId/attempts", requireUser, findAttemptsForQuiz);
    app.get("/api/quizzes/:quizId/attempt-count", requireUser, getAttemptCount);
    app.get("/api/quizzes/:quizId/last-attempt", requireUser, getLastAttempt);
    app.post("/api/quizzes/:quizId/attempts", requireUser, validateBody(submitAttemptSchema), submitAttempt);
}
