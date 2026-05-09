const norm = (s) => String(s ?? "").toLowerCase().trim();

function isAnswerCorrect(question, userAnswer) {
    if (userAnswer === undefined || userAnswer === null) return false;

    if (question.type === "Multiple Choice") {
        const correct = (question.choices || []).find((c) => c.isCorrect);
        return correct ? userAnswer === correct.text : false;
    }

    if (question.type === "True/False") {
        return userAnswer === question.correctAnswer;
    }

    if (question.type === "Fill in the Blank") {
        const expected = question.possibleAnswers || [];
        if (!Array.isArray(userAnswer) || userAnswer.length !== expected.length) {
            return false;
        }
        return userAnswer.every((ans, i) => {
            const accept = expected[i];
            if (Array.isArray(accept)) {
                return accept.some((a) => norm(a) === norm(ans));
            }
            return norm(accept) === norm(ans);
        });
    }

    return false;
}

export function gradeAttempt(answers, questions) {
    const answerByQ = new Map(
        (answers || []).map((a) => [String(a.questionId), a.answer])
    );

    let score = 0;
    let maxScore = 0;

    for (const q of questions) {
        maxScore += q.points || 0;
        const userAnswer = answerByQ.get(String(q._id));
        if (isAnswerCorrect(q, userAnswer)) {
            score += q.points || 0;
        }
    }

    return { score, maxScore };
}
