const aiService = require("../services/aiService");

const getPersonalizedRecommendations = async (req, res) => {
    try {
        const data = await aiService.getPersonalizedRecommendations(req.user.id);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("AI recommendations error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to generate personalized recommendations"
        });
    }
};

const explainConcept = async (req, res) => {
    try {
        const { concept, subject_name } = req.body;
        if (!concept) {
            return res.status(400).json({
                success: false,
                message: "Concept is required for explanation"
            });
        }

        const data = await aiService.explainConcept(concept, subject_name);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Explain concept error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to explain concept"
        });
    }
};

const explainWrongAnswer = async (req, res) => {
    try {
        const { question_text, selected_answer, correct_answer, explanation } = req.body;
        if (!question_text || !selected_answer || !correct_answer) {
            return res.status(400).json({
                success: false,
                message: "question_text, selected_answer, and correct_answer are required"
            });
        }

        const data = await aiService.explainWrongAnswer({
            questionText: question_text,
            selectedAnswer: selected_answer,
            correctAnswer: correct_answer,
            explanation
        });

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Explain wrong answer error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to explain answer"
        });
    }
};

const getExamIntelligence = async (req, res) => {
    try {
        const data = await aiService.getExamIntelligence(req.params.subjectId);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Exam intelligence error:", error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to generate exam intelligence"
        });
    }
};

const askAIAssistant = async (req, res) => {
    try {
        const { question, subject_name, context } = req.body;
        if (!question || !question.trim()) {
            return res.status(400).json({
                success: false,
                message: "Question is required for AI generation"
            });
        }

        const data = await aiService.askAIAssistant({
            question,
            subjectName: subject_name,
            context
        });

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Ask AI Assistant error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to generate AI answer"
        });
    }
};

const fs = require("fs");
const path = require("path");
const freeAiProvider = require("../services/freeAiProvider");

const getAiStatus = async (req, res) => {
    try {
        const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
        const hasGroq = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());
        
        let activeProvider = "CampusQuest Engineering Knowledge Engine";
        if (hasGemini) activeProvider = "Google Gemini 1.5 Flash (Free Tier: 1500 req/day)";
        else if (hasGroq) activeProvider = "Groq LLaMA 3.3 70B (Free Tier: Ultra-Fast)";
        
        res.json({
            success: true,
            data: {
                has_gemini: hasGemini,
                has_groq: hasGroq,
                active_provider: activeProvider,
                available_providers: freeAiProvider.getAvailableProviders()
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const configureAiKey = async (req, res) => {
    try {
        const { provider, api_key } = req.body;
        if (!provider || !api_key || !api_key.trim()) {
            return res.status(400).json({
                success: false,
                message: "provider ('gemini' or 'groq') and api_key are required"
            });
        }

        const cleanKey = api_key.trim();
        const prov = provider.toLowerCase();

        // 1. Verify key by testing with a quick query
        if (prov === "gemini") {
            try {
                await freeAiProvider.callGemini(cleanKey, "", "Say OK");
            } catch (testErr) {
                return res.status(400).json({
                    success: false,
                    message: `Gemini API key verification failed: ${testErr.message}. Make sure your key is valid at https://aistudio.google.com/app/apikey`
                });
            }
            process.env.GEMINI_API_KEY = cleanKey;
        } else if (prov === "groq") {
            try {
                await freeAiProvider.callGroq(cleanKey, "", "Say OK");
            } catch (testErr) {
                return res.status(400).json({
                    success: false,
                    message: `Groq API key verification failed: ${testErr.message}. Make sure your key is valid at https://console.groq.com`
                });
            }
            process.env.GROQ_API_KEY = cleanKey;
        } else {
            return res.status(400).json({
                success: false,
                message: "Supported providers are 'gemini' and 'groq'"
            });
        }

        // 2. Persist key to backend/.env
        const envPath = path.join(__dirname, "../.env");
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, "utf-8");
            const keyVar = prov === "gemini" ? "GEMINI_API_KEY" : "GROQ_API_KEY";
            const regex = new RegExp(`^${keyVar}=.*$`, "m");
            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${keyVar}=${cleanKey}`);
            } else {
                envContent += `\n${keyVar}=${cleanKey}`;
            }
            fs.writeFileSync(envPath, envContent, "utf-8");
        }

        res.json({
            success: true,
            message: `Successfully connected and verified ${prov === 'gemini' ? 'Google Gemini 1.5 Flash' : 'Groq LLaMA 3.3 70B'}!`,
            provider: prov === 'gemini' ? 'Google Gemini 1.5 Flash' : 'Groq LLaMA 3.3 70B'
        });
    } catch (error) {
        console.error("Configure AI key error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getPersonalizedRecommendations,
    explainConcept,
    explainWrongAnswer,
    getExamIntelligence,
    askAIAssistant,
    getAiStatus,
    configureAiKey
};

