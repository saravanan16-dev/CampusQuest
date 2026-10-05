const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            message: "Forbidden: Admin privileges required"
        });
    }
    next();
};

module.exports = adminMiddleware;
