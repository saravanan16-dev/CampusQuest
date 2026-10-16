import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../api.js';
import { Card, Empty, ErrorMsg, Loading, StatusChip, pct, useAsync, useClassSubjects } from '../../components/ui.jsx';

export default function TeacherDashboard() {
  const pairs = useClassSubjects();
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [student, setStudent] = useState(null);

  const classes = useMemo(() => {
    const m = new Map();
    (pairs.data || []).forEach((p) => m.set(p.class_id, `${p.class_name} ${p.section} (${p.academic_year})`));
    return [...m.entries()];
  }, [pairs.data]);
  const subjects = useMemo(
    () => (pairs.data || []).filter((p) => String(p.class_id) === String(classId)),
    [pairs.data, classId]
  );

  useEffect(() => { if (!classId && classes.length) setClassId(String(classes[0][0])); }, [classes, classId]);
  useEffect(() => { setSubjectId(''); setStudent(null); }, [classId]);

  const params = { subjectId: subjectId || undefined };
  const summary = useAsync(() => (classId ? api.get(`/analytics/classes/${classId}/summary`, params) : Promise.resolve(null)), [classId, subjectId]);
  const topics = useAsync(() => (classId ? api.get(`/analytics/classes/${classId}/topics`, params) : Promise.resolve(null)), [classId, subjectId]);
  const students = useAsync(() => (classId ? api.get(`/analytics/classes/${classId}/students`, params) : Promise.resolve(null)), [classId, subjectId]);
  const rules = useAsync(() => api.get('/analytics/rules'), []);

  if (pairs.loading) return <Loading />;
  if (pairs.error) return <ErrorMsg error={pairs.error} />;
  if (!classes.length) return <><h1>Class analytics</h1><Empty>You have no assigned classes yet. Ask an administrator to assign you to a class and subject.</Empty></>;

  const gaps = (topics.data || []).filter((t) => t.is_gap);
  const chartData = (summary.data?.assessments || []).map((a) => ({ name: a.title, avg: a.avg_percent ?? 0, submitted: a.submitted }));

  return (
    <>
      <h1>Class analytics</h1>
      <Card>
        <div className="toolbar">
          <label className="field inline">
            <span>Class</span>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <label className="field inline">
            <span>Subject</span>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">All my subjects</option>
              {subjects.map((s) => <option key={s.subject_id} value={s.subject_id}>{s.subject_code} {s.subject_name}</option>)}
            </select>
          </label>
        </div>
      </Card>

      {gaps.length > 0 && (
        <div className="alert warn">
          <strong>{gaps.length} class-level {gaps.length === 1 ? 'gap' : 'gaps'}:</strong> {gaps.map((g) => g.topic_name).join(', ')}.
          {rules.data && <> A topic is flagged when class accuracy is below {rules.data.weakThreshold * 100}% or at least {rules.data.classGapStudentShare * 100}% of assessed students are weak on it.</>}
        </div>
      )}

      <div className="grid two">
        <Card title="Average score by assessment">
          {summary.loading ? <Loading /> : chartData.length === 0 ? <Empty>No published assessments yet.</Empty> : (
            <div className="chart" role="img" aria-label="Bar chart of class average score per assessment">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v, n, p) => [`${v}% (${p.payload.submitted} submitted)`, 'Average']} />
                  <Bar dataKey="avg" fill="#2f5fd0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {summary.data && <p className="muted small">{summary.data.enrolled} students enrolled.</p>}
        </Card>

        <Card title="Class accuracy by topic">
          {topics.loading ? <Loading /> : (topics.data || []).length === 0 ? <Empty>No graded answers yet.</Empty> : (
            <div className="chart" role="img" aria-label="Bar chart of class accuracy by topic">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topics.data.map((t) => ({ name: t.topic_name, acc: Math.round((t.accuracy || 0) * 100), gap: t.is_gap }))} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  {rules.data && <ReferenceLine y={rules.data.weakThreshold * 100} stroke="#c0392b" strokeDasharray="4 4" />}
                  <Bar dataKey="acc" radius={[4, 4, 0, 0]}>
                    {topics.data.map((t) => <Cell key={t.topic_id} fill={t.is_gap ? '#c0392b' : '#2e8b57'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card title="Topics">
        <ErrorMsg error={topics.error} />
        {(topics.data || []).length === 0 ? <Empty>No topic data yet.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Subject</th><th>Topic</th><th>Class accuracy</th><th>Answers</th><th>Weak students</th><th>Flag</th></tr></thead>
              <tbody>
                {topics.data.map((t) => (
                  <tr key={t.topic_id}>
                    <td>{t.subject_code}</td><td>{t.topic_name}</td><td>{pct(t.accuracy)}</td><td>{t.correct}/{t.attempted}</td>
                    <td>{t.assessed_students ? `${t.weak_students} of ${t.assessed_students}` : 'Not enough data'}</td>
                    <td>{t.is_gap ? <span className="chip chip-weak">Learning gap</span> : <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Students">
        <ErrorMsg error={students.error} />
        {students.data && (students.data.length === 0 ? <Empty>No students are enrolled in this class.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Assessments</th><th>Average</th><th>Weak topics</th><th></th></tr></thead>
              <tbody>
                {students.data.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td><td>{s.submissions}</td><td>{s.avg_percent === null ? '—' : `${s.avg_percent}%`}</td>
                    <td>{s.weak_topics.length ? s.weak_topics.join(', ') : <span className="muted">None flagged</span>}</td>
                    <td><button className="btn" onClick={() => setStudent(s)}>Details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </Card>

      {student && <StudentDetail classId={classId} subjectId={subjectId} student={student} onClose={() => setStudent(null)} />}
    </>
  );
}

function StudentDetail({ classId, subjectId, student, onClose }) {
  const t = useAsync(() => api.get(`/analytics/classes/${classId}/students/${student.id}/topics`, { subjectId: subjectId || undefined }), [classId, subjectId, student.id]);
  return (
    <Card title={`${student.name}: topic performance`} actions={<button className="btn" onClick={onClose}>Close</button>}>
      {t.loading && <Loading />}
      <ErrorMsg error={t.error} />
      {t.data && (t.data.length === 0 ? <Empty>No graded answers for this student yet.</Empty> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Topic</th><th>Correct</th><th>Accuracy</th><th>Status</th></tr></thead>
            <tbody>{t.data.map((x) => <tr key={x.topic_id}><td>{x.topic_name}</td><td>{x.correct}/{x.attempted}</td><td>{pct(x.accuracy)}</td><td><StatusChip status={x.status} /></td></tr>)}</tbody>
          </table>
        </div>
      ))}
    </Card>
  );
}
