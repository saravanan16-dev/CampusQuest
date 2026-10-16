import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Card, ErrorMsg, Loading, StatusChip, fmtDate, useAsync } from '../components/ui.jsx';

// Shared by students (own result) and teachers (their class's results).
export default function Result() {
  const { id } = useParams();
  const { user } = useAuth();
  const r = useAsync(() => api.get(`/submissions/${id}`), [id]);

  if (r.loading) return <Loading />;
  if (r.error) return <ErrorMsg error={r.error} />;
  const s = r.data;
  const percent = s.max_score ? Math.round((s.total_score / s.max_score) * 100) : 0;

  // Per-topic breakdown from this attempt's answers.
  const byTopic = new Map();
  s.answers.forEach((a) => {
    const t = byTopic.get(a.topic_id) || { name: a.topic_name, correct: 0, n: 0 };
    t.n += 1;
    if (a.is_correct) t.correct += 1;
    byTopic.set(a.topic_id, t);
  });

  return (
    <>
      <Link to={{ student: '/student/assessments', teacher: '/teacher/assessments', admin: '/admin' }[user.role]} className="link">← Back</Link>
      <h1>{s.title}</h1>
      <p className="muted">{s.subject_code} · {user.role !== 'student' ? `${s.student_name} · ` : ''}submitted {fmtDate(s.submitted_at)}</p>

      <div className="grid three">
        <Card className="stat"><div className="stat-num">{s.total_score}/{s.max_score}</div><div className="muted">Score</div></Card>
        <Card className="stat"><div className="stat-num">{percent}%</div><div className="muted">Percentage</div></Card>
        <Card className="stat"><div className="stat-num">{s.answers.filter((a) => a.is_correct).length}/{s.answers.length}</div><div className="muted">Questions correct</div></Card>
      </div>

      <Card title="This attempt by topic">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Topic</th><th>Correct</th><th>Result</th></tr></thead>
            <tbody>
              {[...byTopic.values()].map((t) => (
                <tr key={t.name}>
                  <td>{t.name}</td><td>{t.correct}/{t.n}</td>
                  <td><StatusChip status={t.correct / t.n < 0.5 ? 'weak' : t.correct / t.n < 0.75 ? 'developing' : 'strong'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">Flags across all your assessments need more answered questions; see your dashboard.</p>
      </Card>

      <h2>Review</h2>
      {s.answers.map((a, i) => (
        <Card key={a.question_id} title={`Question ${i + 1} · ${a.topic_name}`}>
          <p>{a.text}</p>
          <ul className="plain">
            {a.options.map((o) => (
              <li key={o} className={o === a.correct_answer ? 'right-text' : o === a.selected_answer ? 'wrong-text' : ''}>
                {o}{o === a.correct_answer ? ' ✓ correct answer' : ''}{o === a.selected_answer && o !== a.correct_answer ? ' ✗ your answer' : ''}
              </li>
            ))}
          </ul>
          {a.selected_answer === null && <p className="muted">Not answered.</p>}
          {a.explanation && <p className="muted"><strong>Explanation:</strong> {a.explanation}</p>}
        </Card>
      ))}
    </>
  );
}
