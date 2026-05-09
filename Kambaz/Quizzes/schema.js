import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        default: "Unnamed Quiz"
    },
    description: {
        type: String,
        default: ""
    },
    course: {
        type: String, 
        required: true
    },
    quizType: {
        type: String,
        enum: ["Graded Quiz", "Practice Quiz", "Graded Survey", "Ungraded Survey"],
        default: "Graded Quiz"
    },
    points: {
        type: Number,
        default: 0,
        min: 0
    },
    assignmentGroup: {
        type: String,
        enum: ["Quizzes", "Exams", "Assignments", "Project"],
        default: "Quizzes"
    },
    shuffleAnswers: {
        type: Boolean,
        default: true
    },
    timeLimit: {
        type: Number,
        default: 20,
        min: 0
    },
    multipleAttempts: {
        type: Boolean,
        default: false
    },
    howManyAttempts: {
        type: Number,
        default: 1,
        min: 1
    },
    showCorrectAnswers: {
        type: String,
        enum: ["Immediately", "After Due Date", "Never", "Always"],
        default: "Immediately"
    },
    accessCode: {
        type: String,
        default: ""
    },
    oneQuestionAtATime: {
        type: Boolean,
        default: true
    },
    webcamRequired: {
        type: Boolean,
        default: false
    },
    lockQuestionsAfterAnswering: {
        type: Boolean,
        default: false
    },
    dueDate: {
        type: Date,
        required: false
    },
    availableDate: {
        type: Date,
        required: false
    },
    untilDate: {
        type: Date,
        required: false
    },
    published: {
        type: Boolean,
        default: false
    },
    questions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "QuestionModel"
    }],
    createdBy: {
        type: String,
        default: "faculty123" 
    }
}, {
    collection: "quizzes",
    timestamps: true,
    versionKey: false,
});

export default quizSchema;