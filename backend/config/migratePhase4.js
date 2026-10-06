const db = require("./db");

async function migratePhase4() {
    console.log("Starting Phase 4 DB schema migrations...");

    // 1. pyqs table
    const [pCols] = await db.query("SHOW COLUMNS FROM pyqs");
    const pColNames = pCols.map(c => c.Field);
    console.log("Current pyqs columns:", pColNames);

    if (!pColNames.includes("unit_id")) {
        await db.query("ALTER TABLE pyqs ADD COLUMN unit_id INT NULL AFTER subject_id");
        try {
            await db.query("ALTER TABLE pyqs ADD CONSTRAINT fk_pyqs_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL");
        } catch (e) {
            console.log("Notice on fk_pyqs_unit:", e.message);
        }
    }
    if (!pColNames.includes("question")) {
        await db.query("ALTER TABLE pyqs ADD COLUMN question TEXT NULL AFTER unit_id");
    }
    if (!pColNames.includes("marks")) {
        await db.query("ALTER TABLE pyqs ADD COLUMN marks INT DEFAULT 13 AFTER exam_type");
    }
    if (!pColNames.includes("question_number")) {
        await db.query("ALTER TABLE pyqs ADD COLUMN question_number VARCHAR(20) NULL AFTER marks");
    }

    await db.query("ALTER TABLE pyqs MODIFY COLUMN title VARCHAR(255) NULL");
    await db.query("ALTER TABLE pyqs MODIFY COLUMN semester INT NULL");
    await db.query("ALTER TABLE pyqs MODIFY COLUMN regulation VARCHAR(20) DEFAULT '2021'");

    // 2. mock_tests table
    const [mCols] = await db.query("SHOW COLUMNS FROM mock_tests");
    const mColNames = mCols.map(c => c.Field);
    console.log("Current mock_tests columns:", mColNames);

    if (!mColNames.includes("duration")) {
        await db.query("ALTER TABLE mock_tests ADD COLUMN duration INT DEFAULT 30 AFTER subject_id");
        await db.query("UPDATE mock_tests SET duration = COALESCE(duration_minutes, 30) WHERE duration IS NULL");
    }
    if (!mColNames.includes("total_questions")) {
        await db.query("ALTER TABLE mock_tests ADD COLUMN total_questions INT DEFAULT 0 AFTER duration");
        await db.query("UPDATE mock_tests m SET total_questions = (SELECT COUNT(*) FROM mock_test_questions mq WHERE mq.mock_test_id = m.id)");
    }

    // 3. test_attempts table
    const [taCols] = await db.query("SHOW COLUMNS FROM test_attempts");
    const taColNames = taCols.map(c => c.Field);
    console.log("Current test_attempts columns:", taColNames);

    if (!taColNames.includes("started_at")) {
        await db.query("ALTER TABLE test_attempts ADD COLUMN started_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER mock_test_id");
        await db.query("UPDATE test_attempts SET started_at = start_time WHERE start_time IS NOT NULL AND started_at IS NULL");
    }
    if (!taColNames.includes("completed_at")) {
        await db.query("ALTER TABLE test_attempts ADD COLUMN completed_at TIMESTAMP NULL AFTER score");
        await db.query("UPDATE test_attempts SET completed_at = end_time WHERE end_time IS NOT NULL AND completed_at IS NULL");
    }
    if (!taColNames.includes("time_used_seconds")) {
        await db.query("ALTER TABLE test_attempts ADD COLUMN time_used_seconds INT DEFAULT 0 AFTER completed_at");
    }
    if (!taColNames.includes("total_questions")) {
        await db.query("ALTER TABLE test_attempts ADD COLUMN total_questions INT DEFAULT 0");
    }
    if (!taColNames.includes("correct_answers")) {
        await db.query("ALTER TABLE test_attempts ADD COLUMN correct_answers INT DEFAULT 0");
    }
    if (!taColNames.includes("wrong_answers")) {
        await db.query("ALTER TABLE test_attempts ADD COLUMN wrong_answers INT DEFAULT 0");
    }
    if (!taColNames.includes("unanswered")) {
        await db.query("ALTER TABLE test_attempts ADD COLUMN unanswered INT DEFAULT 0");
    }

    // 4. test_answers table
    const [tansCols] = await db.query("SHOW COLUMNS FROM test_answers");
    const tansColNames = tansCols.map(c => c.Field);
    console.log("Current test_answers columns:", tansColNames);

    if (!tansColNames.includes("selected_option_id")) {
        await db.query("ALTER TABLE test_answers ADD COLUMN selected_option_id INT NULL AFTER question_id");
    }

    // 5. Seed question-level PYQs for Phase 4 if not seeded
    const [existingQPYQs] = await db.query("SELECT COUNT(*) as cnt FROM pyqs WHERE question IS NOT NULL AND unit_id IS NOT NULL");
    if (existingQPYQs[0].cnt < 5) {
        console.log("Seeding question-level PYQs for Phase 4...");
        const [subjects] = await db.query("SELECT id, name FROM subjects");
        const subMap = {};
        subjects.forEach(s => subMap[s.name] = s.id);

        const [units] = await db.query("SELECT id, subject_id, unit_number FROM units");
        const unitMap = {}; // key: `${subject_id}_${unit_number}` -> unit.id
        units.forEach(u => unitMap[`${u.subject_id}_${u.unit_number}`] = u.id);

        const dbmsId = subMap["Database Management Systems"] || subjects[0]?.id;
        const osId = subMap["Operating Systems"] || subjects[1]?.id;
        const cnId = subMap["Computer Networks"] || subjects[2]?.id;

        const pyqsToSeed = [
            {
                subject_id: dbmsId,
                unit_number: 3,
                year: 2025,
                exam_type: "End Semester",
                regulation: "2021",
                marks: 13,
                question_number: "Q1",
                question: "Explain Boyce-Codd Normal Form (BCNF) and Third Normal Form (3NF) with an example. Prove why BCNF is strictly stronger than 3NF.",
                title: "BCNF vs 3NF Decomposition Analysis"
            },
            {
                subject_id: dbmsId,
                unit_number: 2,
                year: 2025,
                exam_type: "End Semester",
                regulation: "2021",
                marks: 13,
                question_number: "Q2",
                question: "Construct advanced SQL queries using GROUP BY, HAVING, and correlated subqueries on Employee and Department schemas.",
                title: "SQL Aggregate Functions and Subqueries"
            },
            {
                subject_id: dbmsId,
                unit_number: 1,
                year: 2025,
                exam_type: "End Semester",
                regulation: "2021",
                marks: 13,
                question_number: "Q3",
                question: "Compare Relational Data Model with Entity-Relationship (ER) model. Draw an ER diagram for a Hospital Management System.",
                title: "ER Diagram and Relational Schema Modeling"
            },
            {
                subject_id: dbmsId,
                unit_number: 3,
                year: 2024,
                exam_type: "End Semester",
                regulation: "2021",
                marks: 13,
                question_number: "Q1",
                question: "State and prove Armstrong axioms for functional dependencies. Derive pseudo-transitivity and decomposition rules.",
                title: "Armstrong Axioms and Functional Dependencies"
            },
            {
                subject_id: dbmsId,
                unit_number: 2,
                year: 2024,
                exam_type: "End Semester",
                regulation: "2021",
                marks: 2,
                question_number: "Q2",
                question: "Differentiate between DROP, TRUNCATE, and DELETE commands in SQL with respect to rollback capability.",
                title: "DROP vs TRUNCATE vs DELETE in SQL"
            },
            {
                subject_id: dbmsId,
                unit_number: 1,
                year: 2023,
                exam_type: "End Semester",
                regulation: "2021",
                marks: 13,
                question_number: "Q1",
                question: "Explain the Three-Schema ANSI-SPARC architecture of database systems and discuss physical and logical data independence.",
                title: "Three-Schema DBMS Architecture"
            },
            {
                subject_id: osId,
                unit_number: 1,
                year: 2024,
                exam_type: "End Semester",
                regulation: "2021",
                marks: 13,
                question_number: "Q1",
                question: "Explain process state transitions and the structure of Process Control Block (PCB). Detail the steps involved in context switching.",
                title: "Process State Machine and PCB Context Switch"
            },
            {
                subject_id: cnId,
                unit_number: 3,
                year: 2024,
                exam_type: "End Semester",
                regulation: "2021",
                marks: 13,
                question_number: "Q1",
                question: "Explain Dijkstra's shortest path routing algorithm and illustrate step-by-step path calculation using a 6-node network graph.",
                title: "Dijkstra Link State Routing Algorithm"
            }
        ];

        for (const q of pyqsToSeed) {
            const unitId = unitMap[`${q.subject_id}_${q.unit_number}`] || null;
            await db.query(`
                INSERT INTO pyqs (subject_id, unit_id, question, year, exam_type, regulation, marks, question_number, title, semester)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 5)
            `, [q.subject_id, unitId, q.question, q.year, q.exam_type, q.regulation, q.marks, q.question_number, q.title]);
        }
        console.log("Question-level PYQs seeded successfully.");
    }

    console.log("Phase 4 schema migrations successfully completed!");
}

if (require.main === module) {
    migratePhase4().then(() => {
        console.log("Done.");
        process.exit(0);
    }).catch(err => {
        console.error("Migration failed:", err);
        process.exit(1);
    });
}

module.exports = migratePhase4;
