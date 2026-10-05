const jwt = require("jsonwebtoken");
require("dotenv").config({ path: __dirname + "/../.env" });

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Access token missing or invalid"
            });
        }

        const token = authHeader.split(" ")[1];
        const secret = process.env.JWT_SECRET || "campusquest_super_secret_jwt_key_2026_dev_prod";

        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: Invalid or expired token"
        });
    }
};

module.exports = authMiddleware;
