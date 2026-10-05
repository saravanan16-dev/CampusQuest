const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const gamificationModel = require("../models/gamificationModel");
const gamificationService = require("./gamificationService");
require("dotenv").config({ path: __dirname + "/../.env" });

const generateToken = (user) => {
    const secret = process.env.JWT_SECRET || "campusquest_super_secret_jwt_key_2026_dev_prod";
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role
        },
        secret,
        { expiresIn }
    );
};

const register = async ({ username, name, email, password, role = "STUDENT" }) => {
    // 1. Check existing email
    const existingEmail = await userModel.findByEmail(email);
    if (existingEmail) {
        const error = new Error("Email is already registered");
        error.statusCode = 409;
        throw error;
    }

    // 2. Check existing username
    const existingUsername = await userModel.findByUsername(username);
    if (existingUsername) {
        const error = new Error("Username is already taken");
        error.statusCode = 409;
        throw error;
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Save in DB
    const userId = await userModel.createUser({
        username,
        name,
        email,
        password: hashedPassword,
        role: role.toUpperCase() === "ADMIN" ? "ADMIN" : "STUDENT"
    });

    // 5. Initialize streak & welcome bonus XP
    await gamificationModel.getUserStreak(userId);
    await gamificationModel.addXPTransaction(userId, 50, "Welcome to CampusQuest bonus!");

    const newUser = await userModel.findById(userId);
    const token = generateToken(newUser);

    return {
        user: {
            id: newUser.id,
            username: newUser.username,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role
        },
        token
    };
};

const login = async ({ emailOrUsername, password }) => {
    let user = await userModel.findByEmail(emailOrUsername);
    if (!user) {
        user = await userModel.findByUsername(emailOrUsername);
    }

    if (!user) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    // Update streak for student
    if (user.role === "STUDENT") {
        await gamificationService.updateStreak(user.id);
    }

    const token = generateToken(user);

    return {
        user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role
        },
        token
    };
};

const getProfile = async (userId) => {
    const user = await userModel.findById(userId);
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    const gamification = await gamificationService.getUserGamificationSummary(userId);

    return {
        user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            created_at: user.created_at
        },
        gamification
    };
};

const updateProfile = async (userId, { name, email }) => {
    if (email) {
        const existing = await userModel.findByEmail(email);
        if (existing && existing.id !== userId) {
            const error = new Error("Email already in use by another account");
            error.statusCode = 409;
            throw error;
        }
    }

    await userModel.updateUser(userId, { name, email });
    const updated = await userModel.findById(userId);
    return updated;
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile
};
