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

const login = async ({ username, email, password }) => {
    const identifier = username || email;
    if (!identifier) {
        const error = new Error("Username or email is required");
        error.statusCode = 400;
        throw error;
    }

    let user = await userModel.findByUsername(identifier);
    if (!user) {
        user = await userModel.findByEmail(identifier);
    }

    if (!user) {
        const error = new Error("Invalid username or password");
        error.statusCode = 401;
        throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        const error = new Error("Invalid username or password");
        error.statusCode = 401;
        throw error;
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

// Section 10: Student Dashboard API
// Returns user's name, number of subjects, and number of notes
const getDashboardData = async (userId) => {
    const user = await userModel.findById(userId);
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    const subjects = await subjectModel.getAllSubjects();
    const notes = await noteModel.getAllNotes();

    return {
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        subjects_count: subjects.length,
        notes_count: notes.length,
        subjects: subjects
    };
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    getDashboardData
};
