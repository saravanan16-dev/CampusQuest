const jwt = require("jsonwebtoken");
require("dotenv").config({ path: __dirname + "/../.env" });

const JWT_SECRET = process.env.JWT_SECRET || "campusquest_super_secret_jwt_key_2026_dev_prod";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role || "STUDENT"
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

module.exports = {
    generateToken,
    verifyToken
};
