const progressModel = require("../models/progressModel");
const gamificationModel = require("../models/gamificationModel");
const db = require("../config/db");

const getOverallProgress = async (userId) => {
    const overall = await progressModel.getUserOverallStats(userId);
    const streak = await gamificationModel.getUserStreak(userId);
    const subjectProgress = await progressModel.getUserSubjectProgress(userId);
    const topicPerformance = await progressModel.getUserTopicPerformance(userId);

    return {
        stats: {
            ...overall,
            current_streak: streak.current_streak,
            max_streak: streak.max_streak
        },
        subjects: subjectProgress,
        weak_topics: topicPerformance.weakTopics,
        strong_topics: topicPerformance.strongTopics
    };
};

const getSubjectProgress = async (userId) => {
    return await progressModel.getUserSubjectProgress(userId);
};

const getWeakAreas = async (userId) => {
    const topicPerformance = await progressModel.getUserTopicPerformance(userId);

    // Also enrich weak topics with recommended notes or practice suggestions
    const enrichedWeakAreas = [];
    for (const item of topicPerformance.weakTopics) {
        const [relatedNotes] = await db.query(
            "SELECT id, title, unit FROM notes WHERE subject_id = ? AND (unit = ? OR title LIKE ?) LIMIT 2",
            [item.subject_id, item.unit, `%${item.topic}%`]
        );
        enrichedWeakAreas.push({
            ...item,
            recommended_notes: relatedNotes,
            recommendation_text: `Review Unit ${item.unit} concepts on ${item.topic} and practice 5 medium difficulty questions.`
        });
    }

    return {
        weak_areas: enrichedWeakAreas,
        count: enrichedWeakAreas.length
    };
};

module.exports = {
    getOverallProgress,
    getSubjectProgress,
    getWeakAreas
};
