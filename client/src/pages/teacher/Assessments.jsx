import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { Card, ClassSubjectPicker, Empty, ErrorMsg, Loading, fmtDate, parsePair, useAsync, useClassSubjects } from '../../components/ui.jsx';

export default function TeacherAssessments() {
  const pairs = useClassSubjects();
  const list = useAsync(() => api.get('/assessments'), []);
  const [open, setOpen] = useState(null); // assessment id whose submissions are shown
  const [creating, setCreating] = useState(false);

  if (pairs.loading || list.loading) return <Loading />;
  if (pairs.error || list.error) return <ErrorMsg error={pairs.error || list.error} />;

  return (
    <>
      <div className="page-head">
        <h1>Assessments</h1>
        {pairs.data.length > 0 && <button className="btn primary" onClick={() => setCreating(!creating)}>{creating ? 'Cancel' : 'New assessment'}</button>}
      </div>

      {creating && <CreateForm pairs={pairs.data} onDone={() => { setCreating(false); list.reload(); }} />}

      <Card title="Your assessments">
        {list.data.length === 0 ? <Empty>No assessments yet.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Title</th><th>Class</th><th>Subject</th><th>Questions</th><th>Status</th><th>Submitted</th><th></th></tr></thead>
              <tbody>
                {list.data.map((a) => (
                  <Row key={a.id} a={a} onChanged={list.reload} onToggle={() => setOpen(open === a.id ? null : a.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {open && <Submissions id={open} />}
    </>
  );
}

function Row({ a, onChanged, onToggle }) {
  const [err, setErr] = useState(null);
  const act = (fn) => fn().then(onChanged).catch(setErr);
  return (
    <tr>
      <td>{a.title}<ErrorMsg error={err} /></td>
      <td>{a.class_name}</td><td>{a.subject_code}</td><td>{a.question_count}</td>
      <td><span className={`chip chip-${a.status}`}>{a.status}</span></td>
      <td>{a.submitted_count}</td>
      <td className="nowrap">
        {a.status === 'draft' && <><button className="btn primary" onClick={() => act(() => api.post(`/assessments/${a.id}/publish`))}>Publish</button>{' '}
          <button className="btn danger" onClick={() => { if (window.confirm('Delete this draft?')) act(() => api.del(`/assessments/${a.id}`)); }}>Delete</button></>}
        {a.status === 'published' && <button className="btn" onClick={() => { if (window.confirm('Close this assessment? Students will no longer be able to submit.')) act(() => api.post(`/assessments/${a.id}/close`)); }}>Close</button>}
        {a.status !== 'draft' && <>{' '}<button className="btn" onClick={onToggle}>Results</button></>}
      </td>
    </tr>
  );
}

function Submissions({ id }) {
  const s = useAsync(() => api.get(`/assessments/${id}/submissions`), [id]);
  return (
    <Card title="Submissions">
      {s.loading && <Loading />}
      <ErrorMsg error={s.error} />
      {s.data && (s.data.length === 0 ? <Empty>No submissions yet.</Empty> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Score</th><th>Submitted</th><th></th></tr></thead>
            <tbody>{s.data.map((x) => (
              <tr key={x.submission_id}><td>{x.name}</td><td>{x.total_score}/{x.max_score}</td><td>{fmtDate(x.submitted_at)}</td>
                <td><Link className="btn" to={`/results/${x.submission_id}`}>View</Link></td></tr>
            ))}</tbody>
          </table>
        </div>
      ))}
    </Card>
  );
}

function CreateForm({ pairs, onDone }) {
  const [pair, setPair] = useState(`${pairs[0].class_id}:${pairs[0].subject_id}`);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [closes, setCloses] = useState('');
  const [selected, setSelected] = useState({}); // question_id -> marks
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const { classId, subjectId } = parsePair(pair);

  const qs = useAsync(() => api.get('/questions', { subjectId, page: 1, limit: 100 }), [subjectId]);
  useEffect(() => setSelected({}), [subjectId]);

  const toggle = (id) => setSelected((s) => { const n = { ...s }; if (n[id]) delete n[id]; else n[id] = 1; return n; });
  const ids = Object.keys(selected);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    if (!ids.length) return setErr(new Error('Select at least one question'));
    setBusy(true);
    try {
      await api.post('/assessments', {
        class_id: classId, subject_id: subjectId, title,
        duration_min: duration ? Number(duration) : null,
        closes_at: closes || null,
        questions: ids.map((id) => ({ question_id: Number(id), marks: Number(selected[id]) || 1 })),
      });
      onDone();
    } catch (x) { setErr(x); } finally { setBusy(false); }
  }

  return (
    <Card title="New assessment (saved as a draft)">
      <form className="stack" onSubmit={submit}>
        <div className="toolbar">
          <ClassSubjectPicker pairs={pairs} value={pair} onChange={setPair} />
          <label className="field inline"><span>Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} /></label>
          <label className="field inline"><span>Time limit (minutes, optional)</span><input type="number" min="1" max="600" value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
          <label className="field inline"><span>Closes (optional)</span><input type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} /></label>
        </div>
        <h3>Choose questions ({ids.length} selected)</h3>
        {qs.loading && <Loading />}
        <ErrorMsg error={qs.error} />
        {qs.data && (qs.data.items.length === 0 ? <Empty>This subject has no questions yet. Add some in the question bank first.</Empty> : (
          <div className="table-wrap tall">
            <table>
              <thead><tr><th></th><th>Question</th><th>Topic</th><th>Level</th><th>Marks</th></tr></thead>
              <tbody>
                {qs.data.items.map((q) => (
                  <tr key={q.id}>
                    <td><input type="checkbox" checked={Boolean(selected[q.id])} onChange={() => toggle(q.id)} aria-label={`Select question ${q.id}`} /></td>
                    <td>{q.text}</td><td>{q.topic_name}</td><td><span className={`tag tag-${q.difficulty}`}>{q.difficulty}</span></td>
                    <td>{selected[q.id] ? <input className="narrow" type="number" min="1" max="100" value={selected[q.id]} onChange={(e) => setSelected({ ...selected, [q.id]: e.target.value })} /> : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <ErrorMsg error={err} />
        <div><button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save draft'}</button></div>
      </form>
    </Card>
  );
}
