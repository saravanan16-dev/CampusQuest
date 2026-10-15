const db = require("../config/db");
const progressModel = require("../models/progressModel");
const freeAiProvider = require("./freeAiProvider");
const knowledgeBase = require("./knowledgeBase");

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

/**
 * Real-time AI Concept Explainer powered by Free AI Provider
 */
const explainConcept = async (concept, subjectName = "") => {
    // Attempt free AI generation first
    try {
        const prompt = `You are a computer science & engineering professor. Explain the engineering concept "${concept}" in the context of "${subjectName || 'Computer Science Engineering'}".
Return strictly a valid JSON object without any markdown code fence or extra text:
{
  "concept": "${concept}",
  "definition": "Precise, formal technical definition (2-3 sentences)",
  "key_points": [
    "Core theoretical or algorithmic principle 1",
    "Core theoretical or algorithmic principle 2",
    "Core theoretical or algorithmic principle 3",
    "Core theoretical or algorithmic principle 4"
  ],
  "example": "A concrete technical example, algorithm trace, or real-world systems architecture example",
  "exam_tip": "High-yield university exam tip: how questions on this are formatted and what examiners look for to award full marks"
}`;

        const aiRes = await freeAiProvider.generateAnswer(prompt, { jsonMode: true });
        const rawJson = typeof aiRes === "object" && aiRes.text ? aiRes.text : String(aiRes);
        const providerName = typeof aiRes === "object" && aiRes.provider ? aiRes.provider : "Free AI Engine";
        const cleaned = rawJson.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.concept && parsed.definition && Array.isArray(parsed.key_points)) {
            return {
                ...parsed,
                ai_generated: true,
                provider: providerName
            };
        }
    } catch (err) {
        console.warn("AI explainConcept error, falling back to knowledge base:", err.message);
    }

    // Curated fallback knowledge base for core topics
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
        "machine learning": {
            concept: "Machine Learning (ML)",
            definition: "A subfield of Artificial Intelligence where statistical algorithms learn predictive patterns from empirical data rather than relying on explicit rule-based programming.",
            key_points: [
                "Supervised Learning: Mapping labeled inputs to target outputs (Classification & Regression).",
                "Unsupervised Learning: Discovering inherent cluster structures and latent representations without labels (K-Means, PCA).",
                "Reinforcement Learning: Learning optimal policies through environmental reward feedback (Q-Learning, Policy Gradients).",
                "Bias-Variance Tradeoff: Managing the equilibrium between model underfitting and overfitting."
            ],
            example: "Spam classification using Logistic Regression / Naive Bayes, or autonomous driving decision trees trained on sensor telemetry.",
            exam_tip: "Questions on Supervised vs Unsupervised taxonomy and Bias-Variance curves are high-frequency 8-16 mark questions."
        },
        "quicksort": {
            concept: "QuickSort Algorithm",
            definition: "An efficient in-place divide-and-conquer sorting algorithm that partitions elements around a pivot value.",
            key_points: [
                "Divide: Rearrange array so elements <= pivot precede it and elements > pivot follow it.",
                "Conquer: Recursively sort left and right partitions.",
                "Time Complexity: O(n log n) best and average case; O(n^2) worst case.",
                "Space Complexity: O(log n) auxiliary stack space."
            ],
            example: "Sorting [24, 9, 29, 14, 19, 27] by selecting 19 as pivot and running Lomuto partition.",
            exam_tip: "Always state the worst-case recurrence relation T(n) = T(n-1) + O(n) and how randomized pivot selection avoids it."
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
        return { ...explanations[key], ai_generated: false };
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
        exam_tip: `Draw neat architectural / block diagrams in exam answers for ${concept} to secure high marks.`,
        ai_generated: false
    };
};

/**
 * Real-time AI Wrong Answer Pedagogical Breakdown
 */
const explainWrongAnswer = async ({ questionText, selectedAnswer, correctAnswer, explanation }) => {
    try {
        const prompt = `A student answered a multiple choice engineering question incorrectly.
Question: "${questionText}"
Student selected: "${selectedAnswer}"
Correct answer: "${correctAnswer}"
${explanation ? `Reference Explanation: "${explanation}"` : ""}

Provide a pedagogical breakdown in valid JSON format:
{
  "why_incorrect": "Clear explanation of why option ${selectedAnswer} is incorrect and the misconception behind choosing it (1-2 sentences)",
  "concept_breakdown": "Explanation of why option ${correctAnswer} is correct and the fundamental rule (2-3 sentences)",
  "recommended_action": "Specific practice or study recommendation"
}
Return strictly valid JSON only.`;

        const aiRes = await freeAiProvider.generateAnswer(prompt, { jsonMode: true });
        const rawJson = typeof aiRes === "object" && aiRes.text ? aiRes.text : String(aiRes);
        const cleaned = rawJson.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        return {
            question: questionText,
            your_answer: selectedAnswer,
            correct_answer: correctAnswer,
            why_incorrect: parsed.why_incorrect,
            concept_breakdown: parsed.concept_breakdown,
            recommended_action: parsed.recommended_action,
            ai_generated: true
        };
    } catch (err) {
        console.warn("AI explainWrongAnswer error, using fallback:", err.message);
        return {
            question: questionText,
            your_answer: selectedAnswer,
            correct_answer: correctAnswer,
            why_incorrect: `Option ${selectedAnswer} is incorrect because it does not satisfy the required system constraint or definition.`,
            concept_breakdown: explanation || `The correct answer is Option ${correctAnswer}. Review the core rule governing this behavior to avoid this common misconception.`,
            recommended_action: "Practice 3 related questions on this specific topic to solidify your intuition.",
            ai_generated: false
        };
    }
};

/**
 * Interactive AI Doubt Solver / Chat Q&A
 */
const askAIAssistant = async ({ question, subjectName = "", context = "" }) => {
    const systemPrompt = `You are CampusQuest AI — an expert engineering professor and study mentor for computer science and engineering students (Anna University, VTU, JNTU curriculum).

Your role:
- Provide clear, accurate, well-structured answers to engineering doubts
- Use bullet points, numbered lists, code blocks, and formulas where appropriate
- Include time/space complexity for algorithm questions
- Mention exam tips and how university examiners award marks
- Keep explanations pedagogical, engaging, and easy to follow

Always structure your answer with:
1. Direct Answer / Definition
2. Detailed Explanation (with examples, diagrams in text, pseudocode if relevant)
3. Key Points to Remember
4. Exam Tip (if applicable)`;

    const userPrompt = `Subject: ${subjectName || "Computer Science & Engineering"}
${context ? `Context: ${context}\n` : ""}
Student Question:
${question}

Please provide a detailed, well-structured answer:`;

    try {
        const aiRes = await freeAiProvider.generateAnswer(userPrompt, { systemPrompt });
        const answerText = typeof aiRes === "object" && aiRes.text ? aiRes.text : String(aiRes);
        const providerName = typeof aiRes === "object" && aiRes.provider ? aiRes.provider : "Free AI Engine";
        return {
            question,
            subject: subjectName || "Engineering",
            answer: answerText.trim(),
            provider: providerName,
            timestamp: new Date().toISOString()
        };
    } catch (err) {
        console.warn("AI askAIAssistant all providers failed, querying Engineering Knowledge Base:", err.message);

        // 1. Try local Engineering Curriculum Knowledge Engine
        const localAnswer = knowledgeBase.findKnowledge(question, subjectName);
        if (localAnswer) {
            return {
                question,
                subject: localAnswer.subject || subjectName || "Computer Science & Engineering",
                answer: localAnswer.content,
                provider: "CampusQuest Engineering Knowledge Engine (Curriculum Standard)",
                timestamp: new Date().toISOString()
            };
        }

        // 2. Structured fallback if not in local curriculum index
        return {
            question,
            subject: subjectName || "Engineering",
            answer: `### Foundational Analysis: "${question}"\n\n1. **Core Technical Definition**: In ${subjectName || "Computer Science & Engineering"}, this concept forms part of core system design, algorithmic modeling, or database architecture.\n2. **Academic Principles**: Review the formal definitions, state diagrams, and mathematical formulations in standard university curricula (e.g. Silberschatz, Tanenbaum, Cormen).\n3. **Exam Action Items**:\n   - Review the corresponding unit notes in the **CampusQuest Notes** section.\n   - Check the **PYQ** section for previous 8-16 mark questions on this topic.\n   - Post in the **CampusQuest Forum** to discuss with faculty and peer mentors.\n\n*(Tip: You can also connect a free Google Gemini or Groq API key in AI Settings for real-time live answers to any custom topic).*`,
            provider: "CampusQuest Offline Knowledge Engine",
            timestamp: new Date().toISOString()
        };
    }
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
    askAIAssistant,
    getExamIntelligence
};
