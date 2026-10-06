const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const subjectModel = require("../models/subjectModel");
const noteModel = require("../models/noteModel");
const { generateToken } = require("../utils/jwt");

const register = async ({ username, name, email, password, role = "STUDENT", college, department, year, semester }) => {
    // Check if email already registered
    const existingEmail = await userModel.findByEmail(email);
    if (existingEmail) {
        const error = new Error("Email is already registered");
        error.statusCode = 409;
        throw error;
    }

    // Check if username already taken
    const existingUsername = await userModel.findByUsername(username);
    if (existingUsername) {
        const error = new Error("Username is already taken");
        error.statusCode = 409;
        throw error;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = await userModel.createUser({
        username,
        name,
        email,
        password: hashedPassword,
        role: role.toUpperCase() === "ADMIN" ? "ADMIN" : "STUDENT",
        college,
        department,
        year,
        semester
    });

    const user = await userModel.findById(userId);
    const token = generateToken(user);

    return {
        message: "User registered successfully",
        token,
        user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            college: user.college,
            department: user.department,
            year: user.year,
            semester: user.semester
        }
    };
};

const login = async ({ username, email, identifier: idParam, password }) => {
    const rawIdentifier = idParam || username || email || "";
    const identifier = rawIdentifier.trim();
    if (!identifier || !password) {
        const error = new Error("Username or email and password are required");
        error.statusCode = 400;
        throw error;
    }

    const user = await userModel.findByEmailOrUsername(identifier);

    if (!user) {
        const error = new Error("Invalid username/email or password");
        error.statusCode = 401;
        throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        const error = new Error("Invalid username/email or password");
        error.statusCode = 401;
        throw error;
    }

    // Update daily streak for student if applicable
    if (user.role === "STUDENT") {
        try {
            await gamificationService.updateStreak(user.id);
        } catch (e) {
            // Non-blocking streak update
        }
    }

    const token = generateToken(user);

    return {
        message: "Login successful",
        token,
        user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            college: user.college,
            department: user.department,
            year: user.year,
            semester: user.semester
        }
    };
};

const gamificationService = require("./gamificationService");

const getProfile = async (userId) => {
    const user = await userModel.findById(userId);
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    let gamification = null;
    try {
        gamification = await gamificationService.getGamificationSummary(userId);
    } catch (e) {
        gamification = { total_xp: 0, level: 1, current_streak: 0 };
    }

    return {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        college: user.college,
        department: user.department,
        year: user.year,
        semester: user.semester,
        created_at: user.created_at,
        gamification
    };
};

const updateProfile = async (userId, data) => {
    if (data.email) {
        const existing = await userModel.findByEmail(data.email);
        if (existing && existing.id !== userId) {
            const error = new Error("Email is already in use");
            error.statusCode = 409;
            throw error;
        }
    }

    await userModel.updateUser(userId, data);
    return await getProfile(userId);
};

const progressModel = require("../models/progressModel");
const pyqModel = require("../models/pyqModel");
const mockTestModel = require("../models/mockTestModel");

// Section 10 & Phase 4 Section 11: Exam Preparation Dashboard API
// Returns user's name, subjects, notes, continue learning, PYQs, and Mock Tests
const getDashboardData = async (userId) => {
    const user = await userModel.findById(userId);
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    const subjects = await subjectModel.getAllSubjects();
    const notes = await noteModel.getAllNotes();

    // Phase 4: Continue Learning with subject progress accuracy
    let userSubjectProgress = [];
    try {
        userSubjectProgress = await progressModel.getSubjectProgressByUserId(userId);
    } catch (e) {}

    const progressMap = new Map();
    userSubjectProgress.forEach(p => progressMap.set(p.subject_id, p));

    const continueLearning = subjects.map(s => {
        const prog = progressMap.get(s.id);
        const accuracy = prog ? Math.round(Number(prog.accuracy) || 0) : 0;
        return {
            id: s.id,
            name: s.name,
            code: s.code || "",
            semester: s.semester,
            progress_percent: accuracy > 0 ? accuracy : 65
        };
    });

    // Phase 4: PYQs summary
    let pyqYears = [2025, 2024, 2023, 2022];
    let pyqCount = 0;
    try {
        const pyqs = await pyqModel.getPYQs();
        pyqCount = pyqs.length;
        const yearsSet = new Set(pyqs.map(p => p.year).filter(Boolean));
        if (yearsSet.size > 0) pyqYears = Array.from(yearsSet).sort((a, b) => b - a);
    } catch (e) {}

    // Phase 4: Mock Tests quick list
    let mockTestsList = [];
    try {
        mockTestsList = await mockTestModel.getAllMockTests();
    } catch (e) {}

    return {
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        subjects_count: subjects.length,
        notes_count: notes.length,
        subjects: subjects,
        continue_learning: continueLearning,
        pyqs_years: pyqYears,
        pyqs_count: pyqCount,
        mock_tests: mockTestsList
    };
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    getDashboardData
};
