import model from "./model.js";

export default function QuizzesDao() {

    async function findQuizzesForCourse(courseId) {
        console.log('DAO: Finding quizzes for course:', courseId);
        const quizzes = await model.find({ course: courseId })
            .populate('questions')
            .sort({ availableDate: 1 });
        console.log('DAO: Found', quizzes.length, 'quizzes');
        return quizzes;
    }

    async function findQuizById(quizId) {
        console.log('DAO: Finding quiz by ID:', quizId);
        const quiz = await model.findById(quizId).populate('questions');
        if (!quiz) {
            console.log('DAO: Quiz not found');
            throw new Error("Quiz not found");
        }
        console.log('DAO: Quiz found:', quiz.title);
        return quiz;
    }

    async function createQuiz(quizData) {
        console.log('DAO: Creating new quiz');
        const newQuiz = await model.create(quizData);
        console.log('DAO: Quiz created:', newQuiz._id);
        return newQuiz;
    }

    async function updateQuiz(quizId, updates) {
        console.log('DAO: Updating quiz:', quizId);
        const updatedQuiz = await model.findByIdAndUpdate(
            quizId,
            { $set: updates },
            { new: true, runValidators: true }
        ).populate('questions');
        
        if (!updatedQuiz) {
            throw new Error("Quiz not found");
        }
        console.log('DAO: Quiz updated:', updatedQuiz.title);
        return updatedQuiz;
    }

    async function deleteQuiz(quizId) {
        console.log('DAO: Deleting quiz:', quizId);
        const deletedQuiz = await model.findByIdAndDelete(quizId);
        if (!deletedQuiz) {
            throw new Error("Quiz not found");
        }
        console.log('DAO: Quiz deleted');
        return { message: "Quiz deleted successfully" };
    }

    async function addQuestionToQuiz(quizId, questionId) {
        console.log('DAO: Adding question to quiz');
        const quiz = await model.findByIdAndUpdate(
            quizId,
            { $push: { questions: questionId } },
            { new: true }
        );
        return quiz;
    }

    async function removeQuestionFromQuiz(quizId, questionId) {
        console.log('DAO: Removing question from quiz');
        const quiz = await model.findByIdAndUpdate(
            quizId,
            { $pull: { questions: questionId } },
            { new: true }
        );
        return quiz;
    }

    return { 
        findQuizzesForCourse,
        findQuizById,
        createQuiz,
        updateQuiz,
        deleteQuiz,
        addQuestionToQuiz,
        removeQuestionFromQuiz
    };
}