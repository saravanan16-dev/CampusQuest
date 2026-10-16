require('dotenv').config();

const num = (v, d) => (v === undefined || v === '' ? d : Number(v));

module.exports = {
  port: num(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: num(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'campusquest',
  },
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxUploadMb: num(process.env.MAX_UPLOAD_MB, 15),
  rules: {
    weakThreshold: num(process.env.WEAK_THRESHOLD, 0.5),
    strongThreshold: num(process.env.STRONG_THRESHOLD, 0.75),
    minAttempts: num(process.env.MIN_ATTEMPTS, 5),
    classGapStudentShare: num(process.env.CLASS_GAP_STUDENT_SHARE, 0.4),
    // Before/after comparison needs this many attempts on each side.
    minImprovementAttempts: num(process.env.MIN_IMPROVEMENT_ATTEMPTS, 3),
  },
};
