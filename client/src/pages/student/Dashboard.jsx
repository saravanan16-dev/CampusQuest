import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, Cell, ReferenceLine } from 'recharts';
import { api } from '../../api.js';
import { Card, Empty, ErrorMsg, Loading, StatusChip, fmtDate, pct, useAsync } from '../../components/ui.jsx';

const COLORS = { weak: '#c0392b', developing: '#d9a21b', strong: '#2e8b57', insufficient: '#9aa3ad' };

export default function StudentDashboard() {
  const topics = useAsync(() => api.get('/analytics/me/topics'), []);
  const trend = useAsync(() => api.get('/analytics/me/trend'), []);
  const rules = useAsync(() => api.get('/analytics/rules'), []);

  if (topics.loading || trend.loading) return <Loading />;
  const err = topics.error || trend.error;
  if (err) return <ErrorMsg error={err} />;

  const weak = topics.data.filter((t) => t.status === 'weak');
  const chartTopics = topics.data.map((t) => ({ name: t.topic_name, accuracy: t.accuracy === null ? 0 : Math.round(t.accuracy * 100), status: t.status }));
  const r = rules.data;

  return (
    <>
      <h1>My progress</h1>

      {weak.length > 0 && (
        <div className="alert warn">
          <strong>{weak.length === 1 ? '1 topic needs revision' : `${weak.length} topics need revision`}:</strong>{' '}
          {weak.map((t) => t.topic_name).join(', ')}. <Link to="/student/recommendations">See targeted practice →</Link>
        </div>
      )}

      <div className="grid two">
        <Card title="Accuracy by topic">
          {chartTopics.length === 0 ? <Empty>Complete an assessment to see your topic accuracy.</Empty> : (
            <div className="chart" role="img" aria-label="Bar chart of accuracy by topic">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartTopics} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  {r && <ReferenceLine y={r.weakThreshold * 100} stroke="#c0392b" strokeDasharray="4 4" />}
                  <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                    {chartTopics.map((t) => <Cell key={t.name} fill={COLORS[t.status]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {r && <p className="muted small">Dashed line: weak threshold ({r.weakThreshold * 100}%). Topics need at least {r.minAttempts} answered questions before they are flagged.</p>}
        </Card>

        <Card title="Score trend">
          {trend.data.length === 0 ? <Empty>No submitted assessments yet.</Empty> : (
            <div className="chart" role="img" aria-label="Line chart of assessment scores over time">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trend.data.map((t) => ({ ...t, date: fmtDate(t.submitted_at) }))} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `${v}%`} labelFormatter={(l, p) => (p[0] ? `${p[0].payload.title} · ${l}` : l)} />
                  <Line type="monotone" dataKey="percent" stroke="#2f5fd0" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card title="Topic details">
        {topics.data.length === 0 ? <Empty>No results yet.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Subject</th><th>Topic</th><th>Correct</th><th>Accuracy</th><th>Status</th><th>Change since earlier quizzes</th></tr></thead>
              <tbody>
                {topics.data.map((t) => (
                  <tr key={t.topic_id}>
                    <td>{t.subject_code}</td>
                    <td>{t.topic_name}</td>
                    <td>{t.correct}/{t.attempted}</td>
                    <td>{pct(t.accuracy)}</td>
                    <td><StatusChip status={t.status} /></td>
                    <td>
                      {t.improvement
                        ? <span className={t.improvement.delta >= 0 ? 'up' : 'down'}>{t.improvement.delta >= 0 ? '▲' : '▼'} {pct(Math.abs(t.improvement.delta))} ({pct(t.improvement.before)} → {pct(t.improvement.after)})</span>
                        : <span className="muted">Not enough data</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small">Changes show encouraging movement between assessments, not proof that practice caused it.</p>
      </Card>
    </>
  );
}
