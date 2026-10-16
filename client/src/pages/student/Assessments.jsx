import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { Card, Empty, ErrorMsg, Loading, fmtDate, useAsync } from '../../components/ui.jsx';

function state(a) {
  if (a.submitted_at) return { label: 'Submitted', action: 'result' };
  if (a.status === 'closed' || !a.not_closed) return { label: 'Closed', action: null };
  if (!a.opened) return { label: `Opens ${fmtDate(a.opens_at)}`, action: null };
  return { label: a.submission_id ? 'In progress' : 'Open', action: 'take' };
}

export default function StudentAssessments() {
  const list = useAsync(() => api.get('/assessments'), []);
  const history = useAsync(() => api.get('/submissions/me'), []);

  if (list.loading || history.loading) return <Loading />;
  if (list.error || history.error) return <ErrorMsg error={list.error || history.error} />;

  return (
    <>
      <h1>Assessments</h1>
      <Card title="Available and past assessments">
        {list.data.length === 0 ? <Empty>No assessments have been published for your classes yet.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Title</th><th>Subject</th><th>Questions</th><th>Time limit</th><th>Due</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {list.data.map((a) => {
                  const s = state(a);
                  return (
                    <tr key={a.id}>
                      <td>{a.title}</td>
                      <td>{a.subject_code}</td>
                      <td>{a.question_count}</td>
                      <td>{a.duration_min ? `${a.duration_min} min` : 'None'}</td>
                      <td>{a.closes_at ? fmtDate(a.closes_at) : '—'}</td>
                      <td>{s.label}{a.submitted_at ? ` · ${a.total_score}/${a.max_score}` : ''}</td>
                      <td>
                        {s.action === 'take' && <Link className="btn primary" to={`/student/assessments/${a.id}/take`}>{a.submission_id ? 'Resume' : 'Start'}</Link>}
                        {s.action === 'result' && <Link className="btn" to={`/results/${a.submission_id}`}>View result</Link>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Result history">
        {history.data.length === 0 ? <Empty>Nothing submitted yet.</Empty> : (
          <ul className="plain">
            {history.data.map((h) => (
              <li key={h.submission_id}>
                <Link to={`/results/${h.submission_id}`}>{h.title}</Link> · {h.subject_code} · {h.total_score}/{h.max_score} · {fmtDate(h.submitted_at)}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
