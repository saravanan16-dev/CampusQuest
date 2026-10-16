// Pure analytics rules: no database and no config import, so they are unit-testable.
// `r` is the rules object from config: { weakThreshold, strongThreshold, minAttempts,
// classGapStudentShare, minImprovementAttempts }.

const ratio = (c, n) => (n > 0 ? c / n : null);

function classify(correct, attempted, r) {
  if (attempted < r.minAttempts) return 'insufficient';
  const acc = correct / attempted;
  if (acc < r.weakThreshold) return 'weak';
  if (acc < r.strongThreshold) return 'developing';
  return 'strong';
}

// A topic is a class-level gap when overall class accuracy is weak, or when enough of the
// assessed students are individually weak on it.
function classGap(classCorrect, classAttempted, weakStudents, assessedStudents, r) {
  if (classAttempted < r.minAttempts) return false;
  const lowClass = classCorrect / classAttempted < r.weakThreshold;
  const manyWeak = assessedStudents > 0 && weakStudents / assessedStudents >= r.classGapStudentShare;
  return lowClass || manyWeak;
}

// rows: [{ submitted_at, submission_id, correct, attempted }] for ONE topic, any order.
// before = every earlier submission on the topic, after = the latest one.
// Returns null unless both sides have enough attempts to compare.
function improvement(rows, r) {
  if (rows.length < 2) return null;
  const sorted = [...rows].sort(
    (a, b) => String(a.submitted_at).localeCompare(String(b.submitted_at)) || a.submission_id - b.submission_id
  );
  const last = sorted[sorted.length - 1];
  const earlier = sorted.slice(0, -1);
  const bc = earlier.reduce((s, x) => s + Number(x.correct), 0);
  const bn = earlier.reduce((s, x) => s + Number(x.attempted), 0);
  const ac = Number(last.correct);
  const an = Number(last.attempted);
  if (bn < r.minImprovementAttempts || an < r.minImprovementAttempts) return null;
  const before = bc / bn;
  const after = ac / an;
  return { before, after, delta: after - before, before_attempts: bn, after_attempts: an };
}

module.exports = { ratio, classify, classGap, improvement };
