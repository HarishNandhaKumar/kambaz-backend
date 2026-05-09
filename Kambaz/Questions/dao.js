import model from "./model.js";
import QuizzesDao from "../Quizzes/dao.js";

export default function QuestionsDao() {
    const quizzesDao = QuizzesDao();

    async function findQuestionsForQuiz(quizId) {
        console.log('DAO: Finding questions for quiz:', quizId);
        const questions = await model.find({ quiz: quizId }).sort({ createdAt: 1 });
        console.log('DAO: Found', questions.length, 'questions');
        return questions;
    }

    async function findQuestionById(questionId) {
        console.log('DAO: Finding question by ID:', questionId);
        const question = await model.findById(questionId);
        if (!question) {
            throw new Error("Question not found");
        }
        console.log('DAO: Question found');
        return question;
    }

    async function createQuestion(questionData) {
        console.log('DAO: Creating question');
        const newQuestion = await model.create(questionData);
        
        // Add question ID to quiz's questions array
        await quizzesDao.addQuestionToQuiz(questionData.quiz, newQuestion._id);
        
        console.log('DAO: Question created:', newQuestion._id);
        return newQuestion;
    }

    async function updateQuestion(questionId, updates) {
        console.log('DAO: Updating question:', questionId);
        const updatedQuestion = await model.findByIdAndUpdate(
            questionId,
            { $set: updates },
            { new: true, runValidators: true }
        );
        
        if (!updatedQuestion) {
            throw new Error("Question not found");
        }
        console.log('DAO: Question updated');
        return updatedQuestion;
    }

    async function deleteQuestion(questionId) {
        console.log('DAO: Deleting question:', questionId);
        const question = await model.findById(questionId);
        
        if (!question) {
            throw new Error("Question not found");
        }
        
        // Remove question from quiz's questions array
        await quizzesDao.removeQuestionFromQuiz(question.quiz, questionId);
        
        // Delete the question
        await model.findByIdAndDelete(questionId);
        
        console.log('DAO: Question deleted');
        return { message: "Question deleted successfully" };
    }

    return {
        findQuestionsForQuiz,
        findQuestionById,
        createQuestion,
        updateQuestion,
        deleteQuestion
    };
}