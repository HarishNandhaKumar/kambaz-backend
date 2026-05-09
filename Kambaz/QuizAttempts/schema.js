import mongoose from "mongoose";

const quizAttemptSchema = new mongoose.Schema({
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "QuizModel",
        required: true
    },
    student: {
        type: String,
        required: true
    },
    attemptNumber: {
        type: Number,
        required: true
    },
    answers: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "QuestionModel"
        },
        answer: mongoose.Schema.Types.Mixed
    }],
    score: {
        type: Number,
        default: 0
    },
    maxScore: {
        type: Number,
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
}, {
    collection: "quizattempts",
    timestamps: true,
    versionKey: false,
});

// Indexes for faster queries
quizAttemptSchema.index({ quiz: 1, student: 1 });
quizAttemptSchema.index({ student: 1, submittedAt: -1 });

export default quizAttemptSchema;