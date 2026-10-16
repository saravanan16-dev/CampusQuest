const test = require('node:test');
const assert = require('node:assert');
const { classify, classGap, improvement } = require('../src/modules/analytics/rules');

const R = { weakThreshold: 0.5, strongThreshold: 0.75, minAttempts: 5, classGapStudentShare: 0.4, minImprovementAttempts: 3 };

test('classify follows the design example (Data Structures)', () => {
  assert.equal(classify(8, 10, R), 'strong'); // Arrays 80%
  assert.equal(classify(3, 10, R), 'weak'); // Linked Lists 30%
  assert.equal(classify(7, 10, R), 'developing'); // Stacks 70%
});

test('classify boundaries', () => {
  assert.equal(classify(5, 10, R), 'developing'); // exactly 50% is not weak
  assert.equal(classify(15, 20, R), 'strong'); // exactly 75% is strong
  assert.equal(classify(2, 4, R), 'insufficient'); // fewer than 5 attempts never flags
  assert.equal(classify(0, 0, R), 'insufficient');
});

test('classGap triggers on low class accuracy or many weak students', () => {
  assert.equal(classGap(7, 18, 2, 3, R), true); // 39% class accuracy
  assert.equal(classGap(15, 20, 1, 5, R), false); // 75% and 20% weak
  assert.equal(classGap(15, 20, 2, 5, R), true); // 40% of students weak
  assert.equal(classGap(1, 4, 1, 1, R), false); // not enough attempts
});

test('improvement compares the latest assessment with earlier ones', () => {
  const rows = [
    { submission_id: 1, submitted_at: '2026-09-20 10:00:00', correct: 0, attempted: 3 },
    { submission_id: 2, submitted_at: '2026-10-05 10:00:00', correct: 2, attempted: 3 },
  ];
  const r = improvement(rows, R);
  assert.equal(r.before, 0);
  assert.ok(Math.abs(r.after - 2 / 3) < 1e-9);
  assert.ok(r.delta > 0.66);
});

test('improvement needs two periods with enough attempts', () => {
  assert.equal(improvement([{ submission_id: 1, submitted_at: 'a', correct: 1, attempted: 3 }], R), null);
  const thin = [
    { submission_id: 1, submitted_at: '2026-09-20', correct: 1, attempted: 2 },
    { submission_id: 2, submitted_at: '2026-10-05', correct: 2, attempted: 3 },
  ];
  assert.equal(improvement(thin, R), null);
});

test('improvement is order independent', () => {
  const a = { submission_id: 1, submitted_at: '2026-09-20', correct: 1, attempted: 3 };
  const b = { submission_id: 2, submitted_at: '2026-10-05', correct: 3, attempted: 3 };
  assert.deepEqual(improvement([a, b], R), improvement([b, a], R));
});
