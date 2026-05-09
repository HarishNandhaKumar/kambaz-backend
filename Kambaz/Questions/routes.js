import QuestionsDao from "../Questions/dao.js";
import { validateBody } from "../Middleware/validate.js";
import { requireUser, requireRole } from "../Middleware/auth.js";
import { createQuestionSchema, updateQuestionSchema } from "./validators.js";

export default function QuestionRoutes(app) {
    const dao = QuestionsDao();

    // Get all questions for a quiz
    const findQuestionsForQuiz = async (req, res) => {
        try {
            const { quizId } = req.params;
            console.log('GET /api/quizzes/:quizId/questions');
            const questions = await dao.findQuestionsForQuiz(quizId);
            res.json(questions);
        } catch (error) {
            console.error('Error:', error.message);
            res.status(500).json({ message: error.message });
        }
    };

    // Get a single question
    const findQuestionById = async (req, res) => {
        try {
            const { questionId } = req.params;
            console.log('GET /api/questions/:questionId');
            const question = await dao.findQuestionById(questionId);
            res.json(question);
        } catch (error) {
            console.error('Error:', error.message);
            res.status(404).json({ message: error.message });
        }
    };

    // Create a new question
    const createQuestion = async (req, res) => {
        try {
            const { quizId } = req.params;
            console.log('POST /api/quizzes/:quizId/questions');
            const questionData = {
                ...req.body,
                quiz: quizId
            };
            const newQuestion = await dao.createQuestion(questionData);
            res.status(201).json(newQuestion);
        } catch (error) {
            console.error('Error:', error.message);
            res.status(500).json({ message: error.message });
        }
    };

    // Update a question
    const updateQuestion = async (req, res) => {
        try {
            const { questionId } = req.params;
            console.log('PUT /api/questions/:questionId');
            const updatedQuestion = await dao.updateQuestion(questionId, req.body);
            res.json(updatedQuestion);
        } catch (error) {
            console.error('Error:', error.message);
            res.status(500).json({ message: error.message });
        }
    };

    // Delete a question
    const deleteQuestion = async (req, res) => {
        try {
            const { questionId } = req.params;
            console.log('DELETE /api/questions/:questionId');
            const result = await dao.deleteQuestion(questionId);
            res.json(result);
        } catch (error) {
            console.error('Error:', error.message);
            res.status(500).json({ message: error.message });
        }
    };

    // Register routes
    app.get("/api/quizzes/:quizId/questions", requireUser, findQuestionsForQuiz);
    app.get("/api/questions/:questionId", requireUser, findQuestionById);
    app.post("/api/quizzes/:quizId/questions", requireUser, requireRole("FACULTY", "ADMIN"), validateBody(createQuestionSchema), createQuestion);
    app.put("/api/questions/:questionId", requireUser, requireRole("FACULTY", "ADMIN"), validateBody(updateQuestionSchema), updateQuestion);
    app.delete("/api/questions/:questionId", requireUser, requireRole("FACULTY", "ADMIN"), deleteQuestion);
}