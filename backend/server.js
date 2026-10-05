const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: __dirname + "/.env" });

const db = require("./config/db");
const initDatabase = require("./config/initDb");

// Import Routes
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const unitRoutes = require("./routes/unitRoutes");
const noteRoutes = require("./routes/noteRoutes");
const questionRoutes = require("./routes/questionRoutes");
const practiceRoutes = require("./routes/practiceRoutes");
const pyqRoutes = require("./routes/pyqRoutes");
const mockTestRoutes = require("./routes/mockTestRoutes");
const progressRoutes = require("./routes/progressRoutes");
const gamificationRoutes = require("./routes/gamificationRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const adminRoutes = require("./routes/adminRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

// API health endpoint
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "CampusQuest API is running smoothly",
        version: "2.0.0",
        timestamp: new Date().toISOString()
    });
});

// Mount Routes
app.use("/", userRoutes);
app.use("/", authRoutes);
app.use("/", subjectRoutes);
app.use("/", unitRoutes);
app.use("/", noteRoutes);
app.use("/", questionRoutes);
app.use("/", practiceRoutes);
app.use("/", pyqRoutes);
app.use("/", mockTestRoutes);
app.use("/", progressRoutes);
app.use("/", gamificationRoutes);
app.use("/", leaderboardRoutes);
app.use("/", adminRoutes);
app.use("/", aiRoutes);

// Global Error Handler conforming to API standard
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal server error"
    });
});

// Fallback for SPA/Frontend navigation
app.use((req, res) => {
    if (req.path.startsWith("/api") || req.path.includes(".")) {
        return res.status(404).json({ success: false, message: "Endpoint not found" });
    }
    res.sendFile(path.join(frontendPath, "index.html"));
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        const connection = await db.getConnection();
        console.log("Database connected successfully to MySQL");
        connection.release();

        // Run schema migration and seed check
        await initDatabase();

        app.listen(PORT, () => {
            console.log(`CampusQuest Server running at http://localhost:${PORT}`);
            console.log(`Frontend accessible at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Database connection failed or Server startup error:", error);
    }
};

startServer();