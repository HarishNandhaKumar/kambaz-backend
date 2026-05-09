import model from "./model.js";

export default function QuizAttemptsDao() {

    async function findAttemptsForQuiz(quizId, studentId) {
        console.log('DAO: Finding attempts for quiz:', quizId, 'student:', studentId);
        const attempts = await model.find({ quiz: quizId, student: studentId })
            .sort({ submittedAt: -1 });
        console.log('DAO: Found', attempts.length, 'attempts');
        return attempts;
    }

    async function getAttemptCount(quizId, studentId) {
        console.log('DAO: Counting attempts for quiz:', quizId, 'student:', studentId);
        const count = await model.countDocuments({ quiz: quizId, student: studentId });
        console.log('DAO: Attempt count:', count);
        return count;
    }

    async function getLastAttempt(quizId, studentId) {
        console.log('DAO: Getting last attempt for quiz:', quizId, 'student:', studentId);
        const attempt = await model.findOne({ quiz: quizId, student: studentId })
            .sort({ submittedAt: -1 });
        console.log('DAO: Last attempt found:', !!attempt);
        return attempt;
    }

    async function createAttempt(attemptData) {
        console.log('DAO: Creating quiz attempt');
        
        // Get current attempt count
        const attemptCount = await getAttemptCount(attemptData.quiz, attemptData.student);
        
        const newAttempt = await model.create({
            ...attemptData,
            attemptNumber: attemptCount + 1
        });
        
        console.log('DAO: Attempt created, attempt #', newAttempt.attemptNumber);
        return newAttempt;
    }

    async function findAttemptById(attemptId) {
        console.log('DAO: Finding attempt by ID:', attemptId);
        const attempt = await model.findById(attemptId);
        if (!attempt) {
            throw new Error("Attempt not found");
        }
        return attempt;
    }

    return {
        findAttemptsForQuiz,
        getAttemptCount,
        getLastAttempt,
        createAttempt,
        findAttemptById
    };
}