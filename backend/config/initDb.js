const db = require("./db");
const bcrypt = require("bcryptjs");

const initDatabase = async () => {
    try {
        console.log("Starting database initialization and migration...");

        // 1. users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('STUDENT', 'ADMIN') DEFAULT 'STUDENT',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Check and expand users table if college, department, year, semester don't exist
        const [userCols] = await db.query("SHOW COLUMNS FROM users");
        const userColNames = userCols.map(c => c.Field);
        if (!userColNames.includes("college")) {
            await db.query("ALTER TABLE users ADD COLUMN college VARCHAR(150) NULL AFTER email");
        }
        if (!userColNames.includes("department")) {
            await db.query("ALTER TABLE users ADD COLUMN department VARCHAR(100) NULL AFTER college");
        }
        if (!userColNames.includes("year")) {
            await db.query("ALTER TABLE users ADD COLUMN year INT NULL AFTER department");
        }
        if (!userColNames.includes("semester")) {
            await db.query("ALTER TABLE users ADD COLUMN semester INT NULL AFTER year");
        }

        // 2. subjects table - check if description and semester columns exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS subjects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                semester INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Ensure columns description and semester exist in subjects
        const [subjectCols] = await db.query("SHOW COLUMNS FROM subjects");
        const subjectColNames = subjectCols.map(c => c.Field);
        if (!subjectColNames.includes("description")) {
            await db.query("ALTER TABLE subjects ADD COLUMN description TEXT AFTER name");
        }
        if (!subjectColNames.includes("semester")) {
            await db.query("ALTER TABLE subjects ADD COLUMN semester INT DEFAULT 1 AFTER description");
        }
        if (!subjectColNames.includes("created_at")) {
            await db.query("ALTER TABLE subjects ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        }

        // 3. units table (Phase 2: Subject -> Units)
        await db.query(`
            CREATE TABLE IF NOT EXISTS units (
                id INT AUTO_INCREMENT PRIMARY KEY,
                subject_id INT NOT NULL,
                unit_number INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                INDEX idx_subject_unit (subject_id, unit_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 4. notes table (Phase 2: Subject -> Unit -> Notes)
        await db.query(`
            CREATE TABLE IF NOT EXISTS notes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                subject_id INT NOT NULL,
                unit_id INT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                unit INT NOT NULL DEFAULT 1,
                file_url VARCHAR(500),
                content LONGTEXT,
                uploaded_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
                FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Check if unit_id exists in notes
        const [noteCols] = await db.query("SHOW COLUMNS FROM notes");
        const noteColNames = noteCols.map(c => c.Field);
        if (!noteColNames.includes("unit_id")) {
            await db.query("ALTER TABLE notes ADD COLUMN unit_id INT NULL AFTER subject_id");
            try {
                await db.query("ALTER TABLE notes ADD CONSTRAINT fk_notes_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL");
            } catch (e) {
                // Ignore if constraint exists
            }
        }

        // 4. questions table (Phase 3: Subject -> Unit -> Question)
        await db.query(`
            CREATE TABLE IF NOT EXISTS questions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                subject_id INT NOT NULL,
                unit_id INT NULL,
                unit INT NOT NULL DEFAULT 1,
                topic VARCHAR(150) NOT NULL DEFAULT 'General',
                question TEXT NULL,
                question_text TEXT NOT NULL,
                difficulty ENUM('EASY', 'MEDIUM', 'HARD') DEFAULT 'MEDIUM',
                question_type VARCHAR(50) DEFAULT 'MCQ',
                correct_answer VARCHAR(10) NOT NULL DEFAULT 'A',
                explanation TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Check if unit_id and question exist in questions
        const [qCols] = await db.query("SHOW COLUMNS FROM questions");
        const qColNames = qCols.map(c => c.Field);
        if (!qColNames.includes("unit_id")) {
            await db.query("ALTER TABLE questions ADD COLUMN unit_id INT NULL AFTER subject_id");
            try {
                await db.query("ALTER TABLE questions ADD CONSTRAINT fk_questions_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL");
            } catch (e) {}
        }
        if (!qColNames.includes("question")) {
            await db.query("ALTER TABLE questions ADD COLUMN question TEXT NULL AFTER topic");
            await db.query("UPDATE questions SET question = question_text WHERE question IS NULL");
        }

        // 5. question_options table (Phase 3: Question Options with is_correct)
        await db.query(`
            CREATE TABLE IF NOT EXISTS question_options (
                id INT AUTO_INCREMENT PRIMARY KEY,
                question_id INT NOT NULL,
                option_key VARCHAR(10) NOT NULL DEFAULT 'A',
                option_text TEXT NOT NULL,
                is_correct BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Check if is_correct exists in question_options
        const [qoCols] = await db.query("SHOW COLUMNS FROM question_options");
        const qoColNames = qoCols.map(c => c.Field);
        if (!qoColNames.includes("is_correct")) {
            await db.query("ALTER TABLE question_options ADD COLUMN is_correct BOOLEAN DEFAULT FALSE AFTER option_text");
            // Backfill is_correct from question.correct_answer
            await db.query(`
                UPDATE question_options qo
                JOIN questions q ON qo.question_id = q.id
                SET qo.is_correct = TRUE
                WHERE qo.option_key = q.correct_answer
            `);
        }

        // 6. pyqs table
        await db.query(`
            CREATE TABLE IF NOT EXISTS pyqs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                subject_id INT NOT NULL,
                regulation VARCHAR(20) NOT NULL,
                year INT NOT NULL,
                semester INT NOT NULL,
                exam_type VARCHAR(50) DEFAULT 'Regular',
                title VARCHAR(255) NOT NULL,
                file_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 7. mock_tests table
        await db.query(`
            CREATE TABLE IF NOT EXISTS mock_tests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                subject_id INT NOT NULL,
                duration_minutes INT DEFAULT 30,
                total_marks INT DEFAULT 50,
                passing_marks INT DEFAULT 25,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 8. mock_test_questions table
        await db.query(`
            CREATE TABLE IF NOT EXISTS mock_test_questions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                mock_test_id INT NOT NULL,
                question_id INT NOT NULL,
                marks INT DEFAULT 1,
                FOREIGN KEY (mock_test_id) REFERENCES mock_tests(id) ON DELETE CASCADE,
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 9. test_attempts table
        await db.query(`
            CREATE TABLE IF NOT EXISTS test_attempts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                mock_test_id INT NOT NULL,
                start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_time TIMESTAMP NULL,
                score INT DEFAULT 0,
                total_marks INT DEFAULT 0,
                percentage DECIMAL(5,2) DEFAULT 0.00,
                status ENUM('IN_PROGRESS', 'COMPLETED') DEFAULT 'IN_PROGRESS',
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (mock_test_id) REFERENCES mock_tests(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 10. test_answers table
        await db.query(`
            CREATE TABLE IF NOT EXISTS test_answers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                attempt_id INT NOT NULL,
                question_id INT NOT NULL,
                selected_option VARCHAR(10),
                is_correct BOOLEAN DEFAULT FALSE,
                marks_awarded INT DEFAULT 0,
                FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE,
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 11. practice_attempts table (Phase 3: Module 5 Practice Attempts)
        await db.query(`
            CREATE TABLE IF NOT EXISTS practice_attempts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                subject_id INT NOT NULL,
                unit_id INT NULL,
                unit INT NULL,
                score INT DEFAULT 0,
                difficulty VARCHAR(20) NULL,
                total_questions INT DEFAULT 0,
                correct_answers INT DEFAULT 0,
                incorrect_answers INT DEFAULT 0,
                accuracy DECIMAL(5,2) DEFAULT 0.00,
                time_taken_seconds INT DEFAULT 0,
                xp_earned INT DEFAULT 0,
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Check columns in practice_attempts
        const [paCols] = await db.query("SHOW COLUMNS FROM practice_attempts");
        const paColNames = paCols.map(c => c.Field);
        if (!paColNames.includes("unit_id")) {
            await db.query("ALTER TABLE practice_attempts ADD COLUMN unit_id INT NULL AFTER subject_id");
            try {
                await db.query("ALTER TABLE practice_attempts ADD CONSTRAINT fk_pa_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL");
            } catch (e) {}
        }
        if (!paColNames.includes("score")) {
            await db.query("ALTER TABLE practice_attempts ADD COLUMN score INT DEFAULT 0 AFTER unit_id");
            await db.query("UPDATE practice_attempts SET score = correct_answers WHERE score = 0");
        }
        if (!paColNames.includes("completed_at")) {
            await db.query("ALTER TABLE practice_attempts ADD COLUMN completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER xp_earned");
        }

        // 12. practice_answers table (Phase 3: Module 6 Practice Answers)
        await db.query(`
            CREATE TABLE IF NOT EXISTS practice_answers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                attempt_id INT NULL,
                practice_attempt_id INT NULL,
                question_id INT NOT NULL,
                selected_option_id INT NULL,
                selected_option VARCHAR(10),
                is_correct BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (practice_attempt_id) REFERENCES practice_attempts(id) ON DELETE CASCADE,
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Check columns in practice_answers
        const [panCols] = await db.query("SHOW COLUMNS FROM practice_answers");
        const panColNames = panCols.map(c => c.Field);
        if (!panColNames.includes("attempt_id")) {
            await db.query("ALTER TABLE practice_answers ADD COLUMN attempt_id INT NULL AFTER id");
            await db.query("UPDATE practice_answers SET attempt_id = practice_attempt_id WHERE attempt_id IS NULL");
        }
        if (!panColNames.includes("selected_option_id")) {
            await db.query("ALTER TABLE practice_answers ADD COLUMN selected_option_id INT NULL AFTER question_id");
        }

        // 13. user_progress table
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_progress (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                subject_id INT NOT NULL,
                questions_attempted INT DEFAULT 0,
                questions_correct INT DEFAULT 0,
                accuracy DECIMAL(5,2) DEFAULT 0.00,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_subject (user_id, subject_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 14. achievements table
        await db.query(`
            CREATE TABLE IF NOT EXISTS achievements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                title VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                badge_icon VARCHAR(50) DEFAULT 'award',
                xp_reward INT DEFAULT 50,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 15. user_achievements table
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_achievements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                achievement_id INT NOT NULL,
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_achievement (user_id, achievement_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 16. xp_transactions table
        await db.query(`
            CREATE TABLE IF NOT EXISTS xp_transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                amount INT NOT NULL,
                reason VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 17. streaks table
        await db.query(`
            CREATE TABLE IF NOT EXISTS streaks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNIQUE NOT NULL,
                current_streak INT DEFAULT 0,
                max_streak INT DEFAULT 0,
                last_active_date DATE NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Run Phase 4 DB schema migrations
        const migratePhase4 = require("./migratePhase4");
        await migratePhase4();

        console.log("All tables checked/created successfully.");

        // SEED ACHIEVEMENTS
        const achievementsList = [
            { code: "FIRST_PRACTICE", title: "Practice Pioneer", description: "Completed your first practice session.", badge_icon: "compass", xp_reward: 20 },
            { code: "FIRST_MOCK_TEST", title: "Test Taker", description: "Completed your first full mock test examination.", badge_icon: "award", xp_reward: 50 },
            { code: "QUESTIONS_100", title: "Century Club", description: "Solved over 100 questions across all engineering subjects.", badge_icon: "zap", xp_reward: 100 },
            { code: "QUESTIONS_500", title: "Knowledge Titan", description: "Mastered 500 questions in total.", badge_icon: "shield", xp_reward: 250 },
            { code: "STREAK_7", title: "Consistency King", description: "Maintained a 7-day continuous study streak.", badge_icon: "flame", xp_reward: 150 },
            { code: "PERFECT_SCORE", title: "Flawless Victory", description: "Achieved a 100% score on a practice test.", badge_icon: "star", xp_reward: 75 },
            { code: "DBMS_MASTER", title: "DBMS Master", description: "Achieved over 85% accuracy in Database Management Systems.", badge_icon: "database", xp_reward: 100 },
            { code: "JAVA_MASTER", title: "Java Champion", description: "Achieved over 85% accuracy in Java Programming.", badge_icon: "code", xp_reward: 100 }
        ];

        for (const ach of achievementsList) {
            await db.query(`
                INSERT INTO achievements (code, title, description, badge_icon, xp_reward)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), xp_reward = VALUES(xp_reward)
            `, [ach.code, ach.title, ach.description, ach.badge_icon, ach.xp_reward]);
        }

        // SEED USERS (Admin & Student)
        const [adminExists] = await db.query("SELECT id FROM users WHERE email = 'admin@campusquest.com'");
        let adminId;
        if (adminExists.length === 0) {
            const adminPassHash = await bcrypt.hash("Admin@123", 10);
            const [adminRes] = await db.query(`
                INSERT INTO users (username, name, email, password, role)
                VALUES ('admin', 'CampusQuest Admin', 'admin@campusquest.com', ?, 'ADMIN')
            `, [adminPassHash]);
            adminId = adminRes.insertId;
            console.log("Created admin user: admin@campusquest.com / Admin@123");
        } else {
            adminId = adminExists[0].id;
        }

        const [studentExists] = await db.query("SELECT id FROM users WHERE email = 'student@campusquest.com'");
        let studentId;
        if (studentExists.length === 0) {
            const studentPassHash = await bcrypt.hash("Student@123", 10);
            const [studentRes] = await db.query(`
                INSERT INTO users (username, name, email, password, role)
                VALUES ('student', 'Alex Johnson', 'student@campusquest.com', ?, 'STUDENT')
            `, [studentPassHash]);
            studentId = studentRes.insertId;

            // Seed initial streak & XP for sample student
            await db.query(`INSERT INTO streaks (user_id, current_streak, max_streak, last_active_date) VALUES (?, 3, 5, CURDATE())`, [studentId]);
            await db.query(`INSERT INTO xp_transactions (user_id, amount, reason) VALUES (?, 120, 'Welcome bonus & initial streak')`, [studentId]);
            console.log("Created student user: student@campusquest.com / Student@123");
        } else {
            studentId = studentExists[0].id;
        }

        // SEED STANDARD SUBJECTS
        const initialSubjects = [
            { name: "Database Management Systems", description: "Relational models, SQL, Normalization, Transactions, Concurrency, and Indexing.", semester: 5 },
            { name: "Operating Systems", description: "Processes, Threads, CPU Scheduling, Deadlocks, Memory Management, and File Systems.", semester: 5 },
            { name: "Computer Networks", description: "OSI & TCP/IP stack, Data Link Layer, IP Routing, Congestion Control, and Transport protocols.", semester: 5 },
            { name: "Java Programming", description: "OOP concepts, Collections Framework, Multithreading, Exception Handling, and Streams.", semester: 5 },
            { name: "Data Structures & Algorithms", description: "Arrays, Linked Lists, Stacks, Queues, Trees, Graphs, Sorting, and Dynamic Programming.", semester: 3 },
            { name: "Artificial Intelligence", description: "Search algorithms, Knowledge representation, Machine Learning basics, and Heuristics.", semester: 6 }
        ];

        for (const sub of initialSubjects) {
            const [exists] = await db.query("SELECT id FROM subjects WHERE name = ?", [sub.name]);
            if (exists.length === 0) {
                await db.query("INSERT INTO subjects (name, description, semester) VALUES (?, ?, ?)", [sub.name, sub.description, sub.semester]);
            } else {
                await db.query("UPDATE subjects SET description = ?, semester = ? WHERE id = ?", [sub.description, sub.semester, exists[0].id]);
            }
        }

        // Fetch subjects mapping
        const [allSubs] = await db.query("SELECT id, name FROM subjects");
        const subMap = {};
        allSubs.forEach(s => { subMap[s.name] = s.id; });

        // SEED UNITS FOR SUBJECTS (Phase 2: Subject -> Units)
        const sampleUnitsBySubject = {
            "Database Management Systems": [
                { unit_number: 1, name: "Introduction to DBMS & Relational Model" },
                { unit_number: 2, name: "SQL & Relational Algebra" },
                { unit_number: 3, name: "Normalization & Functional Dependencies" },
                { unit_number: 4, name: "Transactions & Concurrency Control" },
                { unit_number: 5, name: "Storage, Indexing & Query Processing" }
            ],
            "Operating Systems": [
                { unit_number: 1, name: "OS Principles & Process Management" },
                { unit_number: 2, name: "CPU Scheduling & Synchronization" },
                { unit_number: 3, name: "Deadlocks & Memory Management" },
                { unit_number: 4, name: "Virtual Memory & Paging" },
                { unit_number: 5, name: "File Systems & Mass Storage" }
            ],
            "Computer Networks": [
                { unit_number: 1, name: "Physical Layer & Media" },
                { unit_number: 2, name: "Data Link Layer & MAC" },
                { unit_number: 3, name: "Network Layer & IP Routing" },
                { unit_number: 4, name: "Transport Layer Protocols" },
                { unit_number: 5, name: "Application Layer & Security" }
            ],
            "Java Programming": [
                { unit_number: 1, name: "OOP Concepts & Core Java" },
                { unit_number: 2, name: "Java Collections & Generics" },
                { unit_number: 3, name: "Multithreading & Concurrency" },
                { unit_number: 4, name: "Exception Handling & I/O Streams" },
                { unit_number: 5, name: "Lambda Expressions & Modern Java" }
            ],
            "Data Structures & Algorithms": [
                { unit_number: 1, name: "Linear Structures: Arrays & Linked Lists" },
                { unit_number: 2, name: "Stacks, Queues & Recursion" },
                { unit_number: 3, name: "Trees & Binary Search Trees" },
                { unit_number: 4, name: "Graphs & Traversal Algorithms" },
                { unit_number: 5, name: "Sorting, Searching & Hashing" }
            ],
            "Artificial Intelligence": [
                { unit_number: 1, name: "Introduction & Intelligent Agents" },
                { unit_number: 2, name: "Search Algorithms & Heuristics" },
                { unit_number: 3, name: "Knowledge Representation & Logic" },
                { unit_number: 4, name: "Machine Learning Fundamentals" },
                { unit_number: 5, name: "Expert Systems & Future of AI" }
            ]
        };

        for (const [subName, units] of Object.entries(sampleUnitsBySubject)) {
            const subId = subMap[subName];
            if (subId) {
                for (const u of units) {
                    const [exists] = await db.query(
                        "SELECT id FROM units WHERE subject_id = ? AND unit_number = ?",
                        [subId, u.unit_number]
                    );
                    if (exists.length === 0) {
                        await db.query(
                            "INSERT INTO units (subject_id, unit_number, name) VALUES (?, ?, ?)",
                            [subId, u.unit_number, u.name]
                        );
                    } else {
                        await db.query(
                            "UPDATE units SET name = ? WHERE id = ?",
                            [u.name, exists[0].id]
                        );
                    }
                }
            }
        }
        console.log("Units seeded for subjects.");

        // SEED SAMPLE NOTES
        const [notesCount] = await db.query("SELECT COUNT(*) AS cnt FROM notes");
        if (notesCount[0].cnt === 0 && subMap["Database Management Systems"]) {
            const dbmsId = subMap["Database Management Systems"];
            const osId = subMap["Operating Systems"];
            const cnId = subMap["Computer Networks"];
            const javaId = subMap["Java Programming"];

            const sampleNotes = [
                {
                    subject_id: dbmsId,
                    unit: 1,
                    title: "Unit 1: Relational Data Model & ER Diagrams",
                    description: "Comprehensive notes covering Entity-Relationship modelling, primary keys, foreign keys, and relational algebra.",
                    content: "### Unit 1: Introduction to DBMS & Relational Model\n\n- **DBMS Architecture**: 3-tier ANSI-SPARC schema (External, Conceptual, Internal).\n- **ER Diagram**: Entities, attributes, entity sets, relationships, cardinalities (1:1, 1:N, M:N).\n- **Relational Algebra**: Selection (σ), Projection (π), Cartesian Product (×), Join (⨝), Union (∪), Set Difference (-).\n- **Keys**: Super Key, Candidate Key, Primary Key, Foreign Key (Referential Integrity Constraint).",
                    file_url: "/uploads/notes/dbms_unit1.pdf",
                    uploaded_by: adminId
                },
                {
                    subject_id: dbmsId,
                    unit: 2,
                    title: "Unit 2: SQL & Relational Algebra Deep Dive",
                    description: "DDL, DML, DCL, complex nested queries, aggregate functions, and GROUP BY / HAVING clauses.",
                    content: "### Unit 2: SQL & Queries\n\n- **DDL Commands**: CREATE, ALTER, DROP, TRUNCATE.\n- **DML Commands**: SELECT, INSERT, UPDATE, DELETE.\n- **Subqueries**: Correlated vs non-correlated subqueries.\n- **Joins**: INNER JOIN, LEFT OUTER JOIN, RIGHT OUTER JOIN, FULL JOIN.",
                    file_url: "/uploads/notes/dbms_unit2.pdf",
                    uploaded_by: adminId
                },
                {
                    subject_id: dbmsId,
                    unit: 3,
                    title: "Unit 3: Normalization & Functional Dependencies",
                    description: "Functional dependencies, Closure of attributes, 1NF, 2NF, 3NF, and BCNF with decomposition algorithms.",
                    content: "### Unit 3: Normalization\n\n- **1NF**: Atomic values only.\n- **2NF**: In 1NF and no partial dependencies.\n- **3NF**: In 2NF and no transitive dependencies (X -> A implies X is superkey or A is prime attribute).\n- **BCNF**: For every X -> A, X must be a superkey.\n- **Lossless Join & Dependency Preservation**: Key decomposition criteria.",
                    file_url: "/uploads/notes/dbms_unit3.pdf",
                    uploaded_by: adminId
                },
                {
                    subject_id: osId,
                    unit: 1,
                    title: "Unit 1: OS Principles & Process Management",
                    description: "Kernel architecture, system calls, PCB, process states, and context switching.",
                    content: "### Unit 1: Process Management\n\n- **Process State Machine**: New, Ready, Running, Waiting, Terminated.\n- **PCB (Process Control Block)**: PID, state, PC, registers, memory limits.\n- **Context Switch**: Overhead of saving state of old process and loading new state.",
                    file_url: "/uploads/notes/os_unit1.pdf",
                    uploaded_by: adminId
                },
                {
                    subject_id: cnId,
                    unit: 3,
                    title: "Unit 3: Network Layer & IP Routing",
                    description: "IPv4/IPv6 addressing, subnetting, Dijkstra shortest path, Distance Vector Routing, and Congestion Control.",
                    content: "### Unit 3: Network Layer\n\n- **IP Addressing**: Classful vs CIDR (/24, /26). Subnet masks.\n- **Routing Algorithms**: Link State (Dijkstra) vs Distance Vector (Bellman-Ford).\n- **Congestion Control**: Leaky Bucket and Token Bucket traffic shapers.",
                    file_url: "/uploads/notes/cn_unit3.pdf",
                    uploaded_by: adminId
                },
                {
                    subject_id: javaId,
                    unit: 2,
                    title: "Unit 2: Java Collections & Generics",
                    description: "List, Set, Map interfaces, HashMap internals, ArrayList vs LinkedList, and Generics type safety.",
                    content: "### Unit 2: Java Collections Framework\n\n- **Hierarchy**: Iterable -> Collection -> List / Set / Queue. Map is standalone.\n- **HashMap**: Buckets, hashing, load factor (0.75), treeification when threshold exceeds 8.\n- **Thread-safe collections**: ConcurrentHashMap, Collections.synchronizedList.",
                    file_url: "/uploads/notes/java_unit2.pdf",
                    uploaded_by: adminId
                }
            ];

            for (const n of sampleNotes) {
                await db.query(`
                    INSERT INTO notes (subject_id, unit, title, description, content, file_url, uploaded_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [n.subject_id, n.unit, n.title, n.description, n.content, n.file_url, n.uploaded_by]);
            }
            console.log("Sample notes seeded.");
        }

        // Link notes to units (Phase 2)
        await db.query(`
            UPDATE notes n
            JOIN units u ON n.subject_id = u.subject_id AND n.unit = u.unit_number
            SET n.unit_id = u.id
            WHERE n.unit_id IS NULL
        `);

        // Link questions to units and backfill question column (Phase 3)
        await db.query(`
            UPDATE questions q
            JOIN units u ON q.subject_id = u.subject_id AND q.unit = u.unit_number
            SET q.unit_id = u.id
            WHERE q.unit_id IS NULL
        `);
        await db.query("UPDATE questions SET question = question_text WHERE question IS NULL");
        await db.query(`
            UPDATE question_options qo
            JOIN questions q ON qo.question_id = q.id
            SET qo.is_correct = TRUE
            WHERE qo.option_key = q.correct_answer AND qo.is_correct = FALSE
        `);
        const [qCount] = await db.query("SELECT COUNT(*) AS cnt FROM questions");
        if (qCount[0].cnt === 0 && subMap["Database Management Systems"]) {
            const dbmsId = subMap["Database Management Systems"];
            const osId = subMap["Operating Systems"];
            const cnId = subMap["Computer Networks"];
            const javaId = subMap["Java Programming"];

            const sampleQuestions = [
                {
                    subject_id: dbmsId,
                    unit: 3,
                    topic: "Normalization",
                    question_text: "A relation is in BCNF (Boyce-Codd Normal Form) if for every functional dependency X -> Y:",
                    difficulty: "MEDIUM",
                    correct_answer: "B",
                    explanation: "By definition, a relation is in BCNF if for every non-trivial functional dependency X -> Y, X is a superkey of the relation.",
                    options: [
                        { key: "A", text: "Y is a prime attribute" },
                        { key: "B", text: "X is a super key" },
                        { key: "C", text: "X is a candidate key and Y is prime" },
                        { key: "D", text: "There are no multi-valued dependencies" }
                    ]
                },
                {
                    subject_id: dbmsId,
                    unit: 1,
                    topic: "Relational Algebra",
                    question_text: "Which relational algebra operation is equivalent to a Cartesian product followed by a selection condition?",
                    difficulty: "EASY",
                    correct_answer: "C",
                    explanation: "A Theta Join (or Condition Join) is conceptually equivalent to performing a Cartesian Product of two relations and then applying a Selection condition.",
                    options: [
                        { key: "A", text: "Projection" },
                        { key: "B", text: "Union" },
                        { key: "C", text: "Join (Theta Join)" },
                        { key: "D", text: "Intersection" }
                    ]
                },
                {
                    subject_id: dbmsId,
                    unit: 4,
                    topic: "Transactions & Concurrency",
                    question_text: "Which property of ACID ensures that concurrent execution of transactions results in a state equivalent to some serial execution?",
                    difficulty: "MEDIUM",
                    correct_answer: "B",
                    explanation: "Isolation ensures that transactions execute concurrently without interference, satisfying serializability.",
                    options: [
                        { key: "A", text: "Atomicity" },
                        { key: "B", text: "Isolation" },
                        { key: "C", text: "Consistency" },
                        { key: "D", text: "Durability" }
                    ]
                },
                {
                    subject_id: osId,
                    unit: 2,
                    topic: "CPU Scheduling",
                    question_text: "Which of the following CPU scheduling algorithms is guaranteed to avoid starvation?",
                    difficulty: "MEDIUM",
                    correct_answer: "A",
                    explanation: "Round Robin (RR) with a fixed time quantum ensures that every ready process gets a turn in cyclic order, preventing indefinite starvation.",
                    options: [
                        { key: "A", text: "Round Robin" },
                        { key: "B", text: "Shortest Job First (SJF)" },
                        { key: "C", text: "Priority Scheduling without aging" },
                        { key: "D", text: "Shortest Remaining Time First" }
                    ]
                },
                {
                    subject_id: osId,
                    unit: 3,
                    topic: "Deadlocks",
                    question_text: "Which of the following is NOT one of Coffman's four necessary conditions for deadlock?",
                    difficulty: "EASY",
                    correct_answer: "D",
                    explanation: "The four conditions are Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. Aging is a scheduling starvation prevention technique.",
                    options: [
                        { key: "A", text: "Mutual Exclusion" },
                        { key: "B", text: "Hold and Wait" },
                        { key: "C", text: "Circular Wait" },
                        { key: "D", text: "Aging" }
                    ]
                },
                {
                    subject_id: cnId,
                    unit: 3,
                    topic: "Routing",
                    question_text: "Dijkstra's shortest path algorithm is predominantly used in which routing protocol type?",
                    difficulty: "EASY",
                    correct_answer: "B",
                    explanation: "Link State routing protocols (such as OSPF and IS-IS) use Dijkstra's algorithm to compute the shortest paths across the topology.",
                    options: [
                        { key: "A", text: "Distance Vector Routing" },
                        { key: "B", text: "Link State Routing" },
                        { key: "C", text: "Flooding" },
                        { key: "D", text: "Random Walk" }
                    ]
                },
                {
                    subject_id: cnId,
                    unit: 3,
                    topic: "Congestion Control",
                    question_text: "What mechanism does the Leaky Bucket algorithm employ to handle bursty network traffic?",
                    difficulty: "HARD",
                    correct_answer: "C",
                    explanation: "The Leaky Bucket algorithm outputs packets at a strictly constant rate regardless of the burstiness of incoming packets, smoothing the traffic stream.",
                    options: [
                        { key: "A", text: "Outputs packets proportionally to queue length" },
                        { key: "B", text: "Accumulates tokens during idle periods" },
                        { key: "C", text: "Transmits packets at a strictly constant rate" },
                        { key: "D", text: "Drops packets randomly when queue is half full" }
                    ]
                },
                {
                    subject_id: javaId,
                    unit: 2,
                    topic: "Collections",
                    question_text: "In Java 8 and later, when does a HashMap bucket switch its internal structure from a linked list to a balanced Red-Black tree?",
                    difficulty: "HARD",
                    correct_answer: "A",
                    explanation: "When the number of entries in a bucket exceeds the TREEIFY_THRESHOLD (8) and the table capacity is at least 64, the linked list is transformed into a Red-Black tree.",
                    options: [
                        { key: "A", text: "When bucket size reaches 8 and capacity >= 64" },
                        { key: "B", text: "When total map elements reach 16" },
                        { key: "C", text: "When load factor drops below 0.5" },
                        { key: "D", text: "HashMap never uses trees internally" }
                    ]
                }
            ];

            for (const q of sampleQuestions) {
                const [qRes] = await db.query(`
                    INSERT INTO questions (subject_id, unit, topic, question_text, difficulty, question_type, correct_answer, explanation)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [q.subject_id, q.unit, q.topic, q.question_text, q.difficulty, "MCQ", q.correct_answer, q.explanation]);

                const questionId = qRes.insertId;
                for (const opt of q.options) {
                    await db.query(`
                        INSERT INTO question_options (question_id, option_key, option_text)
                        VALUES (?, ?, ?)
                    `, [questionId, opt.key, opt.text]);
                }
            }
            console.log("Sample questions and options seeded.");
        }

        // SEED SAMPLE PYQs
        const [pyqCount] = await db.query("SELECT COUNT(*) AS cnt FROM pyqs");
        if (pyqCount[0].cnt === 0 && subMap["Database Management Systems"]) {
            const dbmsId = subMap["Database Management Systems"];
            const osId = subMap["Operating Systems"];
            const cnId = subMap["Computer Networks"];

            const samplePyqs = [
                {
                    subject_id: dbmsId,
                    regulation: "2021",
                    year: 2025,
                    semester: 5,
                    title: "DBMS End-Semester Exam Paper - Nov/Dec 2025",
                    file_url: "/uploads/pyqs/dbms_2025_regular.pdf",
                    exam_type: "Regular"
                },
                {
                    subject_id: dbmsId,
                    regulation: "2021",
                    year: 2024,
                    semester: 5,
                    title: "DBMS End-Semester Exam Paper - Apr/May 2024",
                    file_url: "/uploads/pyqs/dbms_2024_regular.pdf",
                    exam_type: "Regular"
                },
                {
                    subject_id: osId,
                    regulation: "2021",
                    year: 2024,
                    semester: 5,
                    title: "Operating Systems University Examination - Nov/Dec 2024",
                    file_url: "/uploads/pyqs/os_2024_regular.pdf",
                    exam_type: "Regular"
                },
                {
                    subject_id: cnId,
                    regulation: "2021",
                    year: 2024,
                    semester: 5,
                    title: "Computer Networks Question Paper - Nov/Dec 2024",
                    file_url: "/uploads/pyqs/cn_2024_regular.pdf",
                    exam_type: "Regular"
                }
            ];

            for (const p of samplePyqs) {
                await db.query(`
                    INSERT INTO pyqs (subject_id, regulation, year, semester, exam_type, title, file_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [p.subject_id, p.regulation, p.year, p.semester, p.exam_type, p.title, p.file_url]);
            }
            console.log("Sample PYQs seeded.");
        }

        // SEED SAMPLE MOCK TESTS
        const [mockCount] = await db.query("SELECT COUNT(*) AS cnt FROM mock_tests");
        if (mockCount[0].cnt === 0 && subMap["Database Management Systems"]) {
            const dbmsId = subMap["Database Management Systems"];
            const [mRes] = await db.query(`
                INSERT INTO mock_tests (title, subject_id, duration_minutes, total_marks, passing_marks, description)
                VALUES ('DBMS Mid-Semester Assessment', ?, 30, 30, 15, 'Timed assessment covering Relational Algebra, Normalization, and ACID properties.')
            `, [dbmsId]);

            const mockTestId = mRes.insertId;
            const [dbmsQuestions] = await db.query("SELECT id FROM questions WHERE subject_id = ?", [dbmsId]);
            for (const q of dbmsQuestions) {
                await db.query(`
                    INSERT INTO mock_test_questions (mock_test_id, question_id, marks)
                    VALUES (?, ?, 10)
                `, [mockTestId, q.id]);
            }
            console.log("Sample mock test created.");
        }

        console.log("Database initialized and seeded successfully!");
    } catch (error) {
        console.error("Database initialization error:", error);
        throw error;
    }
};

module.exports = initDatabase;

if (require.main === module) {
    initDatabase().then(() => {
        console.log("Migration executed successfully.");
        process.exit(0);
    }).catch(err => {
        console.error("Migration failed:", err);
        process.exit(1);
    });
}
