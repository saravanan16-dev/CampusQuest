/**
 * CampusQuest Centralized API Client
 * Automatically handles JWT Bearer tokens, unified response extraction,
 * and global error toast alerts.
 */

const API_BASE_URL = window.location.origin;

const API = {
    getToken() {
        return localStorage.getItem("cq_token");
    },

    setToken(token) {
        localStorage.setItem("cq_token", token);
    },

    getUser() {
        try {
            const userStr = localStorage.getItem("cq_user");
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
        }
    },

    setUser(user) {
        localStorage.setItem("cq_user", JSON.stringify(user));
    },

    clearAuth() {
        localStorage.removeItem("cq_token");
        localStorage.removeItem("cq_user");
    },

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            "Content-Type": "application/json",
            ...(options.headers || {})
        };

        const token = this.getToken();
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    this.clearAuth();
                    const currentPath = window.location.pathname;
                    if (!currentPath.includes("login.html") && !currentPath.includes("register.html") && currentPath !== "/" && !currentPath.includes("index.html")) {
                        window.location.href = "login.html";
                    }
                }
                throw new Error(data.message || "An unexpected error occurred");
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },

    // Auth endpoints
    login(credentials) {
        return this.request("/login", {
            method: "POST",
            body: JSON.stringify(credentials)
        });
    },

    register(userData) {
        return this.request("/register", {
            method: "POST",
            body: JSON.stringify(userData)
        });
    },

    getProfile() {
        return this.request("/profile");
    },

    updateProfile(userData) {
        return this.request("/profile", {
            method: "PUT",
            body: JSON.stringify(userData)
        });
    },

    // Student Dashboard (Phase 2 Section 10)
    getDashboard() {
        return this.request("/dashboard");
    },

    // Subjects
    getSubjects(semester = "") {
        const query = semester ? `?semester=${semester}` : "";
        return this.request(`/subjects${query}`);
    },

    getSubject(id) {
        return this.request(`/subjects/${id}`);
    },

    createSubject(subjectData) {
        return this.request("/subjects", {
            method: "POST",
            body: JSON.stringify(subjectData)
        });
    },

    updateSubject(id, subjectData) {
        return this.request(`/subjects/${id}`, {
            method: "PUT",
            body: JSON.stringify(subjectData)
        });
    },

    deleteSubject(id) {
        return this.request(`/subjects/${id}`, {
            method: "DELETE"
        });
    },

    // Units (Phase 2 Section 7: Subject -> Units)
    getUnits(subjectId = "") {
        const query = subjectId ? `?subject_id=${subjectId}` : "";
        return this.request(`/units${query}`);
    },

    getUnit(id) {
        return this.request(`/units/${id}`);
    },

    getUnitsBySubject(subjectId) {
        return this.request(`/subjects/${subjectId}/units`);
    },

    createUnit(unitData) {
        return this.request("/units", {
            method: "POST",
            body: JSON.stringify(unitData)
        });
    },

    updateUnit(id, unitData) {
        return this.request(`/units/${id}`, {
            method: "PUT",
            body: JSON.stringify(unitData)
        });
    },

    deleteUnit(id) {
        return this.request(`/units/${id}`, {
            method: "DELETE"
        });
    },

    // Notes (Phase 2 Section 8 & 9: Subject -> Unit -> Notes)
    getNotes(subjectId, unit = "") {
        const query = unit ? `?unit=${unit}` : "";
        return this.request(`/subjects/${subjectId}/notes${query}`);
    },

    getAllNotes(filters = {}) {
        const params = new URLSearchParams();
        if (filters.subject_id || filters.subjectId) params.append("subject_id", filters.subject_id || filters.subjectId);
        if (filters.unit_id || filters.unitId) params.append("unit_id", filters.unit_id || filters.unitId);
        if (filters.unit) params.append("unit", filters.unit);
        const query = params.toString() ? `?${params.toString()}` : "";
        return this.request(`/notes${query}`);
    },

    getNote(id) {
        return this.request(`/notes/${id}`);
    },

    createNote(noteData) {
        return this.request("/notes", {
            method: "POST",
            body: JSON.stringify(noteData)
        });
    },

    deleteNote(id) {
        return this.request(`/notes/${id}`, {
            method: "DELETE"
        });
    },

    // Questions
    getQuestions(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/questions?${query}`);
    },

    getQuestion(id) {
        return this.request(`/questions/${id}`);
    },

    createQuestion(questionData) {
        return this.request("/questions", {
            method: "POST",
            body: JSON.stringify(questionData)
        });
    },

    deleteQuestion(id) {
        return this.request(`/questions/${id}`, {
            method: "DELETE"
        });
    },

    // Practice Arena
    startPractice(params) {
        return this.request("/practice/start", {
            method: "POST",
            body: JSON.stringify(params)
        });
    },

    submitPractice(attemptId, payload) {
        return this.request(`/practice/${attemptId}/submit`, {
            method: "POST",
            body: JSON.stringify(payload)
        });
    },

    getPracticeResult(attemptId) {
        return this.request(`/practice/${attemptId}/result`);
    },

    getPracticeHistory() {
        return this.request("/practice/history");
    },

    // Mock Tests
    getMockTests(subjectId = "") {
        const query = subjectId ? `?subjectId=${subjectId}` : "";
        return this.request(`/mock-tests${query}`);
    },

    getMockTest(id) {
        return this.request(`/mock-tests/${id}`);
    },

    startMockTest(id) {
        return this.request(`/mock-tests/${id}/start`, {
            method: "POST"
        });
    },

    submitMockTest(attemptId, payload) {
        return this.request(`/mock-tests/${attemptId}/submit`, {
            method: "POST",
            body: JSON.stringify(payload)
        });
    },

    getMockTestResult(attemptId) {
        return this.request(`/mock-tests/${attemptId}/result`);
    },

    createMockTest(data) {
        return this.request("/mock-tests", {
            method: "POST",
            body: JSON.stringify(data)
        });
    },

    deleteMockTest(id) {
        return this.request(`/mock-tests/${id}`, {
            method: "DELETE"
        });
    },

    // PYQs
    getPYQs(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/pyqs?${query}`);
    },

    createPYQ(data) {
        return this.request("/pyqs", {
            method: "POST",
            body: JSON.stringify(data)
        });
    },

    deletePYQ(id) {
        return this.request(`/pyqs/${id}`, {
            method: "DELETE"
        });
    },

    // Progress
    getProgress() {
        return this.request("/progress");
    },

    getSubjectProgress() {
        return this.request("/progress/subjects");
    },

    getWeakAreas() {
        return this.request("/progress/weak-areas");
    },

    // Gamification
    getGamification() {
        return this.request("/xp");
    },

    getStreak() {
        return this.request("/streak");
    },

    getAchievements() {
        return this.request("/achievements");
    },

    // Leaderboard
    getLeaderboard(type = "overall") {
        let endpoint = "/leaderboard";
        if (type === "weekly") endpoint = "/leaderboard/weekly";
        if (type === "monthly") endpoint = "/leaderboard/monthly";
        if (type === "accuracy") endpoint = "/leaderboard/accuracy";
        return this.request(endpoint);
    },

    // Admin
    getAdminAnalytics() {
        return this.request("/admin/analytics");
    },

    getAdminUsers() {
        return this.request("/admin/users");
    },

    updateUserRole(userId, role) {
        return this.request(`/admin/users/${userId}/role`, {
            method: "PUT",
            body: JSON.stringify({ role })
        });
    },

    // AI
    getAIRecommendations() {
        return this.request("/ai/recommendations");
    },

    explainConcept(concept, subjectName = "") {
        return this.request("/ai/explain-concept", {
            method: "POST",
            body: JSON.stringify({ concept, subject_name: subjectName })
        });
    },

    explainWrongAnswer(payload) {
        return this.request("/ai/explain-wrong-answer", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    },

    getExamIntelligence(subjectId) {
        return this.request(`/ai/exam-intelligence/${subjectId}`);
    }
};

window.API = API;
