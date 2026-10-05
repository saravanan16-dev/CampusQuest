const db = require("../config/db");
const progressModel = require("../models/progressModel");

const getPersonalizedRecommendations = async (userId) => {
    // 1. Get user topic performance
    const topicPerf = await progressModel.getUserTopicPerformance(userId);
    const weakTopics = topicPerf.weakTopics;

    // 2. Fetch subject progress
    const subjectProgress = await progressModel.getUserSubjectProgress(userId);

    // 3. Recommended Notes: Find notes related to weak topics or lowest-scoring subject
    let recommendedNotes = [];
    if (weakTopics.length > 0) {
        for (const wt of weakTopics.slice(0, 3)) {
            const [notes] = await db.query(
                "SELECT n.id, n.title, n.unit, s.name as subject_name FROM notes n JOIN subjects s ON n.subject_id = s.id WHERE n.subject_id = ? AND (n.unit = ? OR n.title LIKE ?) LIMIT 1",
                [wt.subject_id, wt.unit, `%${wt.topic}%`]
            );
            if (notes.length > 0) recommendedNotes.push(notes[0]);
        }
    }

    if (recommendedNotes.length === 0) {
        // Fallback to top introductory notes
        const [defaultNotes] = await db.query(
            "SELECT n.id, n.title, n.unit, s.name as subject_name FROM notes n JOIN subjects s ON n.subject_id = s.id ORDER BY n.id ASC LIMIT 3"
        );
        recommendedNotes = defaultNotes;
    }

    // 4. Recommended Questions to practice: targeted at weak topics or medium difficulty
    let recommendedQuestions = [];
    if (weakTopics.length > 0) {
        const topWeakTopic = weakTopics[0];
        const [questions] = await db.query(
            "SELECT q.id, q.topic, q.question_text, q.difficulty, s.name as subject_name FROM questions q JOIN subjects s ON q.subject_id = s.id WHERE q.subject_id = ? AND q.topic = ? LIMIT 3",
            [topWeakTopic.subject_id, topWeakTopic.topic]
        );
        recommendedQuestions = questions;
    }

    if (recommendedQuestions.length === 0) {
        const [fallbackQ] = await db.query(
            "SELECT q.id, q.topic, q.question_text, q.difficulty, s.name as subject_name FROM questions q JOIN subjects s ON q.subject_id = s.id ORDER BY RAND() LIMIT 3"
        );
        recommendedQuestions = fallbackQ;
    }

    // 5. Recommended Mock Tests
    const [mockTests] = await db.query(
        "SELECT m.id, m.title, m.duration_minutes, s.name as subject_name FROM mock_tests m JOIN subjects s ON m.subject_id = s.id ORDER BY m.id DESC LIMIT 2"
    );

    return {
        focus_areas: weakTopics.map(w => ({
            subject: w.subject_name,
            unit: w.unit,
            topic: w.topic,
            current_accuracy: `${w.accuracy}%`
        })),
        recommended_notes: recommendedNotes,
        recommended_questions: recommendedQuestions,
        recommended_tests: mockTests,
        advice: weakTopics.length > 0 
            ? `We identified ${weakTopics.length} topic(s) where your accuracy is below 60%. Prioritize reviewing notes for "${weakTopics[0].topic}" before retrying practice!`
            : "Great job! Your performance is steady. Continue exploring new subjects and challenge yourself with Mock Tests."
    };
};

const explainConcept = async (concept, subjectName = "") => {
    // Knowledge base for common core engineering concepts
    const explanations = {
        "normalization": {
            concept: "Database Normalization",
            definition: "The systematic approach of decomposing tables to eliminate data redundancy and undesirable insertion, update, and deletion anomalies.",
            key_points: [
                "1NF: Atomic attributes, no repeating groups.",
                "2NF: In 1NF and no partial functional dependencies (all non-prime attributes fully dependent on candidate key).",
                "3NF: In 2NF and no transitive dependencies (for X -> A, X is superkey or A is prime attribute).",
                "BCNF: Strict 3NF where every determinant X must be a candidate/super key."
            ],
            example: "Consider a table StudentCourse(StudentID, CourseID, InstructorName). InstructorName depends only on CourseID, causing redundancy. Decomposing into StudentCourse(StudentID, CourseID) and Course(CourseID, InstructorName) achieves 2NF/3NF.",
            exam_tip: "University exams frequently ask for 3NF vs BCNF comparison and decomposition with dependency preservation."
        },
        "deadlock": {
            concept: "Operating System Deadlock",
            definition: "A situation where a set of processes are permanently blocked because each process is holding a resource and waiting for another resource acquired by some other process.",
            key_points: [
                "Coffman's 4 Conditions: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.",
                "Deadlock Prevention: Invalidate at least one of the 4 conditions.",
                "Deadlock Avoidance: Banker's Algorithm (maintains safe state using Resource Allocation Graph).",
                "Deadlock Detection & Recovery: Terminating processes or preempting resources."
            ],
            example: "Process P1 holds Resource R1 and requests R2; Process P2 holds Resource R2 and requests R1. Neither can proceed.",
            exam_tip: "Banker's Algorithm numericals (Safe Sequence calculation) carry 10-16 marks in end-semester exams."
        },
        "routing": {
            concept: "Network Layer IP Routing",
            definition: "The process of selecting paths across a network to deliver packets from source to destination.",
            key_points: [
                "Link-State Routing: Routers broadcast link status to all nodes; uses Dijkstra's algorithm (e.g. OSPF).",
                "Distance-Vector Routing: Routers share routing tables with immediate neighbors only; uses Bellman-Ford (e.g. RIP).",
                "Count-to-Infinity Problem: Solved using Split Horizon and Poison Reverse."
            ],
            example: "OSPF calculates shortest cost paths based on bandwidth across an Autonomous System.",
            exam_tip: "Expect questions comparing Distance Vector vs Link State with routing table convergence problems."
        }
    };

    const key = Object.keys(explanations).find(k => concept.toLowerCase().includes(k));
    if (key) {
        return explanations[key];
    }

    return {
        concept: concept,
        definition: `Comprehensive explanation for "${concept}" in ${subjectName || "Computer Science Engineering"}.`,
        key_points: [
            `Understand the foundational principles and mathematical/logical formulations of ${concept}.`,
            "Identify key trade-offs in time complexity, space complexity, and system resource utilization.",
            "Analyze standard university problem types and edge cases."
        ],
        example: `Practical implementation of ${concept} in modern software architecture.`,
        exam_tip: `Draw neat architectural / block diagrams in exam answers for ${concept} to secure high marks.`
    };
};

const explainWrongAnswer = async ({ questionText, selectedAnswer, correctAnswer, explanation }) => {
    return {
        question: questionText,
        your_answer: selectedAnswer,
        correct_answer: correctAnswer,
        why_incorrect: `Option ${selectedAnswer} is incorrect because it does not satisfy the required system constraint or definition.`,
        concept_breakdown: explanation || `The correct answer is Option ${correctAnswer}. Review the core rule governing this behavior to avoid this common misconception.`,
        recommended_action: "Practice 3 related questions on this specific topic to solidify your intuition."
    };
};

const getExamIntelligence = async (subjectId) => {
    // Analyze PYQs and question distribution for the subject
    const [subject] = await db.query("SELECT * FROM subjects WHERE id = ?", [subjectId]);
    if (subject.length === 0) {
        const error = new Error("Subject not found");
        error.statusCode = 404;
        throw error;
    }

    const [questions] = await db.query(
        "SELECT unit, topic, difficulty, COUNT(*) as count FROM questions WHERE subject_id = ? GROUP BY unit, topic, difficulty ORDER BY unit ASC, count DESC",
        [subjectId]
    );

    const [pyqs] = await db.query(
        "SELECT year, regulation, exam_type, title FROM pyqs WHERE subject_id = ? ORDER BY year DESC",
        [subjectId]
    );

    // Group topic frequencies
    const topicFrequency = {};
    for (const q of questions) {
        if (!topicFrequency[q.topic]) {
            topicFrequency[q.topic] = { topic: q.topic, unit: q.unit, frequency: 0, difficulties: [] };
        }
        topicFrequency[q.topic].frequency += q.count;
        topicFrequency[q.topic].difficulties.push(q.difficulty);
    }

    const frequencyList = Object.values(topicFrequency).sort((a, b) => b.frequency - a.frequency);

    const highPriorityUnits = [1, 2, 3];
    const revisionPriorities = frequencyList.slice(0, 4).map(item => ({
        topic: item.topic,
        unit: item.unit,
        priority: item.frequency >= 2 ? "High (Frequent in PYQs)" : "Medium",
        expected_marks_range: "8-16 Marks"
    }));

    return {
        subject: subject[0].name,
        total_pyqs_analyzed: pyqs.length,
        pyq_list: pyqs,
        frequently_appearing_topics: frequencyList,
        important_units: [
            { unit: 1, name: "Foundational Models & Architecture", weightage: "25%" },
            { unit: 2, name: "Core Operations & Algorithms", weightage: "25%" },
            { unit: 3, name: "Advanced Design & Optimization", weightage: "30%" },
            { unit: 4, name: "System Integration & Concurrency", weightage: "20%" }
        ],
        revision_priorities: revisionPriorities,
        practice_priorities: [
            "1. Solve high-yield numericals and algorithm traces first.",
            "2. Memorize standard definitions and 4-5 key differences tables.",
            "3. Take a timed Mock Test before the actual exam to test time management."
        ],
        disclaimer: "Exam Intelligence is an educational analysis tool based on past papers and syllabus distribution, not a guaranteed prediction."
    };
};

module.exports = {
    getPersonalizedRecommendations,
    explainConcept,
    explainWrongAnswer,
    getExamIntelligence
};
