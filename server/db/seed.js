// Demo data: 1 admin, 1 teacher, 3 students, 1 class, 1 subject, 3 topics, 24 questions,
// 2 published quizzes with graded submissions. Usage: npm run db:seed (run db:init first).
const bcrypt = require('bcryptjs');
const { pool, query, withTransaction } = require('../src/db');

const T = (text, options, difficulty, explanation) => ({ text, options, correct: options[0], difficulty, explanation });

const QUESTIONS = {
  Arrays: [
    T('What is the time complexity of accessing an array element by index?', ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'], 'easy', 'Index arithmetic jumps straight to the address.'),
    T('Array indices in C normally start at which number?', ['0', '1', '-1', 'It depends on the type'], 'easy', 'C arrays are zero-indexed.'),
    T('Inserting an element at the beginning of an array of n elements takes:', ['O(n)', 'O(1)', 'O(log n)', 'O(n^2)'], 'medium', 'Every existing element must shift one place right.'),
    T('Binary search on a sorted array of n elements runs in:', ['O(log n)', 'O(n)', 'O(1)', 'O(n log n)'], 'medium', 'The search range halves each step.'),
    T('Which statement about arrays is true?', ['Elements are stored in contiguous memory', 'Elements are stored in linked nodes', 'The size can never be fixed', 'Elements must be strings'], 'medium', 'Contiguous storage is what makes indexing O(1).'),
    T('Deleting the middle element of an array while keeping order requires:', ['Shifting later elements left', 'Changing one pointer only', 'Rebuilding a hash table', 'No work at all'], 'hard', 'The gap has to be closed by shifting.'),
    T('Which is a drawback of a fixed-size array?', ['Size must be known in advance', 'Slow indexing', 'No random access', 'Cannot store integers'], 'easy', 'Capacity is chosen when it is created.'),
    T('The worst-case time to search an unsorted array of n elements is:', ['O(n)', 'O(1)', 'O(log n)', 'O(n log n)'], 'hard', 'Every element may need to be checked.'),
  ],
  'Linked Lists': [
    T('Each node in a singly linked list stores data and:', ['A pointer to the next node', 'An array index', 'A hash key', 'The list length'], 'easy', 'The next pointer links the nodes.'),
    T('Inserting at the head of a singly linked list takes:', ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'], 'easy', 'Only the head pointer changes.'),
    T('Searching for a value in a singly linked list takes, in the worst case:', ['O(n)', 'O(1)', 'O(log n)', 'O(n log n)'], 'medium', 'There is no random access, so you walk the list.'),
    T('Which is easy in a doubly linked list but not in a singly linked one?', ['Moving backward from a node', 'Inserting at the head', 'Counting nodes', 'Searching forward'], 'medium', 'Each node also stores a previous pointer.'),
    T('What does the last node of a singly linked list point to?', ['NULL', 'The head', 'The previous node', 'Itself'], 'medium', 'NULL marks the end of the list.'),
    T('Reversing a singly linked list in place is done by:', ['Reversing each next pointer while walking the list', 'Copying it into an array', 'Sorting the nodes', 'Deleting the head'], 'hard', 'Keep prev, curr and next, and flip curr.next.'),
    T('Compared with arrays, linked lists use extra memory for:', ['Pointers', 'Indices', 'Hash tables', 'Headers only'], 'easy', 'Every node carries at least one pointer.'),
    T('A cycle in a linked list can be detected with:', ['Two pointers moving at different speeds', 'Binary search', 'A stack of values', 'Sorting the list'], 'hard', "Floyd's tortoise and hare meet inside a cycle."),
  ],
  Stacks: [
    T('A stack follows which order?', ['Last in, first out', 'First in, first out', 'Random order', 'Sorted order'], 'easy', 'The most recent push is popped first.'),
    T('Which operation adds an element to a stack?', ['Push', 'Pop', 'Peek', 'Dequeue'], 'easy', 'Push places an element on top.'),
    T('Which problem is typically solved with a stack?', ['Checking balanced parentheses', 'Shortest path in a weighted graph', 'Binary search', 'Merge sort'], 'medium', 'Opening brackets are pushed and matched on closing.'),
    T('What happens when you pop from an empty stack?', ['Underflow', 'It returns zero', 'It adds an element', 'It sorts the stack'], 'medium', 'There is nothing to remove, which is underflow.'),
    T('Evaluating a postfix expression uses:', ['A stack of operands', 'A queue of operators', 'A heap', 'A hash map'], 'medium', 'Operands are pushed; an operator pops two and pushes the result.'),
    T('Function calls and returns are tracked using:', ['The call stack', 'A binary tree', 'A hash table', 'A circular queue'], 'hard', 'Each call pushes a frame; return pops it.'),
    T('Which operation reads the top element without removing it?', ['Peek', 'Pop', 'Push', 'Clear'], 'easy', 'Peek (top) leaves the stack unchanged.'),
    T('Infix to postfix conversion commonly uses a stack to hold:', ['Operators and parentheses', 'Only numbers', 'Only results', 'Nothing'], 'hard', 'Operators wait on the stack until precedence allows output.'),
  ],
};

// Correct answers per student, per topic, for [quiz1 of 3, quiz2 of 3].
const PLAN = {
  'Asha Verma': { Arrays: [3, 3], 'Linked Lists': [1, 1], Stacks: [2, 2] },
  'Ravi Kumar': { Arrays: [2, 3], 'Linked Lists': [0, 2], Stacks: [3, 3] },
  'Meena Iyer': { Arrays: [1, 1], 'Linked Lists': [1, 2], Stacks: [2, 3] },
};

(async () => {
  if ((await query("SELECT id FROM users WHERE email='admin@campusquest.test'")).length) {
    console.log('Seed data already present. Nothing to do.');
    return pool.end();
  }
  const hash = (p) => bcrypt.hashSync(p, 10);
  const mk = async (name, email, pw, role) => (await query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)', [name, email, hash(pw), role])).insertId;

  const adminId = await mk('Admin User', 'admin@campusquest.test', 'Admin@1234', 'admin');
  const teacherId = await mk('Dr. Priya Nair', 'teacher@campusquest.test', 'Teacher@1234', 'teacher');
  const students = {};
  students['Asha Verma'] = await mk('Asha Verma', 'asha@campusquest.test', 'Student@1234', 'student');
  students['Ravi Kumar'] = await mk('Ravi Kumar', 'ravi@campusquest.test', 'Student@1234', 'student');
  students['Meena Iyer'] = await mk('Meena Iyer', 'meena@campusquest.test', 'Student@1234', 'student');

  const classId = (await query("INSERT INTO classes (name,academic_year,section) VALUES ('CSE III Year','2026-27','A')")).insertId;
  const subjectId = (await query("INSERT INTO subjects (code,name) VALUES ('CS301','Data Structures')")).insertId;
  await query('INSERT INTO teacher_assignments (teacher_id,class_id,subject_id) VALUES (?,?,?)', [teacherId, classId, subjectId]);
  for (const id of Object.values(students)) await query('INSERT INTO student_enrollments (class_id,student_id) VALUES (?,?)', [classId, id]);

  const qIds = {}; // topic -> [ids]
  const topicIds = {};
  for (const [topic, list] of Object.entries(QUESTIONS)) {
    topicIds[topic] = (await query('INSERT INTO topics (subject_id,name) VALUES (?,?)', [subjectId, topic])).insertId;
    qIds[topic] = [];
    for (const q of list) {
      const r = await query(
        'INSERT INTO questions (subject_id,topic_id,text,type,options,correct_answer,difficulty,explanation,created_by) VALUES (?,?,?,?,?,?,?,?,?)',
        [subjectId, topicIds[topic], q.text, 'mcq', JSON.stringify(q.options), q.correct, q.difficulty, q.explanation, teacherId]
      );
      qIds[topic].push(r.insertId);
    }
  }

  const quizzes = [
    { title: 'Quiz 1: Basics', slice: [0, 3], at: '2026-09-20 10:00:00' },
    { title: 'Quiz 2: Applications', slice: [3, 6], at: '2026-10-05 10:00:00' },
  ];

  for (const [qi, quiz] of quizzes.entries()) {
    const aId = (await query(
      "INSERT INTO assessments (class_id,subject_id,title,created_by,status,created_at) VALUES (?,?,?,?, 'published', ?)",
      [classId, subjectId, quiz.title, teacherId, quiz.at]
    )).insertId;
    const ordered = [];
    for (const topic of Object.keys(QUESTIONS)) {
      qIds[topic].slice(...quiz.slice).forEach((id, i) => ordered.push({ id, topic, idxInTopic: i }));
    }
    for (const [pos, o] of ordered.entries()) await query('INSERT INTO assessment_questions (assessment_id,question_id,position,marks) VALUES (?,?,?,1)', [aId, o.id, pos]);

    for (const [name, studentId] of Object.entries(students)) {
      await withTransaction(async (q) => {
        const sub = (await q("INSERT INTO submissions (assessment_id,student_id,started_at,submitted_at) VALUES (?,?,?,?)", [aId, studentId, quiz.at, quiz.at])).insertId;
        let total = 0;
        for (const o of ordered) {
          const correct = o.idxInTopic < PLAN[name][o.topic][qi];
          const qdef = QUESTIONS[o.topic][quiz.slice[0] + o.idxInTopic];
          const selected = correct ? qdef.correct : qdef.options[1];
          if (correct) total += 1;
          await q('INSERT INTO submission_answers (submission_id,question_id,selected_answer,is_correct,marks_awarded) VALUES (?,?,?,?,?)', [sub, o.id, selected, correct ? 1 : 0, correct ? 1 : 0]);
        }
        await q('UPDATE submissions SET total_score=?, max_score=? WHERE id=?', [total, ordered.length, sub]);
      });
    }
  }

  console.log('Seeded. Demo logins:');
  console.log('  admin@campusquest.test    / Admin@1234');
  console.log('  teacher@campusquest.test  / Teacher@1234');
  console.log('  asha@campusquest.test     / Student@1234  (weak in Linked Lists)');
  console.log('  ravi@campusquest.test     / Student@1234  (Linked Lists improving)');
  console.log('  meena@campusquest.test    / Student@1234');
  await pool.end();
})().catch(async (e) => {
  console.error('Seed failed:', e.message);
  await pool.end();
  process.exit(1);
});
