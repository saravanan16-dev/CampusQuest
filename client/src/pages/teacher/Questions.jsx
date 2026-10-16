import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { Card, Empty, ErrorMsg, Loading, useAsync, useClassSubjects } from '../../components/ui.jsx';

const BLANK = { text: '', type: 'mcq', options: ['', '', '', ''], correct: 0, difficulty: 'medium', explanation: '', topic_id: '' };

export default function Questions() {
  const pairs = useClassSubjects();
  const subjects = useMemo(() => {
    const m = new Map();
    (pairs.data || []).forEach((p) => m.set(p.subject_id, `${p.subject_code} ${p.subject_name}`));
    return [...m.entries()];
  }, [pairs.data]);
  const [subjectId, setSubjectId] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // question being edited, or null

  useEffect(() => { if (!subjectId && subjects.length) setSubjectId(String(subjects[0][0])); }, [subjects, subjectId]);

  const topics = useAsync(() => (subjectId ? api.get('/topics', { subjectId }) : Promise.resolve([])), [subjectId]);
  const list = useAsync(
    () => (subjectId ? api.get('/questions', { subjectId, topicId: topicFilter, difficulty, q: q || undefined, page, limit: 10 }) : Promise.resolve(null)),
    [subjectId, topicFilter, difficulty, q, page]
  );

  if (pairs.loading) return <Loading />;
  if (pairs.error) return <ErrorMsg error={pairs.error} />;
  if (!subjects.length) return <><h1>Question bank</h1><Empty>You have no assigned subjects yet.</Empty></>;

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.limit)) : 1;

  return (
    <>
      <h1>Question bank</h1>
      <Card>
        <div className="toolbar">
          <label className="field inline"><span>Subject</span>
            <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicFilter(''); setPage(1); setEditing(null); }}>
              {subjects.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <label className="field inline"><span>Topic</span>
            <select value={topicFilter} onChange={(e) => { setTopicFilter(e.target.value); setPage(1); }}>
              <option value="">All</option>{(topics.data || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="field inline"><span>Difficulty</span>
            <select value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setPage(1); }}>
              <option value="">Any</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </select>
          </label>
          <label className="field inline"><span>Search</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></label>
        </div>
      </Card>

      <TopicAdder subjectId={subjectId} onAdded={topics.reload} />
      <QuestionForm key={editing ? editing.id : 'new'} subjectId={subjectId} topics={topics.data || []} editing={editing}
        onDone={() => { setEditing(null); list.reload(); }} onCancel={() => setEditing(null)} />

      <Card title="Questions">
        {list.loading && <Loading />}
        <ErrorMsg error={list.error} />
        {list.data && (list.data.items.length === 0 ? <Empty>No questions yet. Add one above.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Question</th><th>Topic</th><th>Level</th><th>Answer</th><th></th></tr></thead>
              <tbody>
                {list.data.items.map((x) => (
                  <tr key={x.id}>
                    <td>{x.text}</td><td>{x.topic_name}</td><td><span className={`tag tag-${x.difficulty}`}>{x.difficulty}</span></td><td>{x.correct_answer}</td>
                    <td className="nowrap">
                      <button className="btn" onClick={() => { setEditing(x); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>{' '}
                      <ArchiveButton id={x.id} onDone={list.reload} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {list.data && list.data.total > list.data.limit && (
          <div className="pager">
            <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="muted">Page {page} of {totalPages}</span>
            <button className="btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </Card>
    </>
  );
}

function ArchiveButton({ id, onDone }) {
  const [err, setErr] = useState(null);
  return (
    <>
      <button className="btn danger" onClick={() => { if (window.confirm('Archive this question? Existing results are kept.')) api.del(`/questions/${id}`).then(onDone).catch(setErr); }}>Archive</button>
      <ErrorMsg error={err} />
    </>
  );
}

function TopicAdder({ subjectId, onAdded }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState(null);
  async function add(e) {
    e.preventDefault();
    setErr(null);
    try { await api.post('/topics', { subject_id: Number(subjectId), name }); setName(''); onAdded(); } catch (x) { setErr(x); }
  }
  return (
    <Card title="Add a topic">
      <form className="toolbar" onSubmit={add}>
        <label className="field inline"><span>Topic name</span><input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <button className="btn">Add topic</button>
      </form>
      <ErrorMsg error={err} />
    </Card>
  );
}

function QuestionForm({ subjectId, topics, editing, onDone, onCancel }) {
  const [f, setF] = useState(() =>
    editing
      ? { text: editing.text, type: editing.type, options: editing.type === 'mcq' ? [...editing.options] : ['', '', '', ''], correct: Math.max(0, editing.options.indexOf(editing.correct_answer)), difficulty: editing.difficulty, explanation: editing.explanation || '', topic_id: String(editing.topic_id) }
      : BLANK
  );
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const isTF = f.type === 'true_false';

  const setOpt = (i, v) => setF({ ...f, options: f.options.map((o, j) => (j === i ? v : o)) });

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    const options = isTF ? ['True', 'False'] : f.options.map((o) => o.trim()).filter(Boolean);
    const correct = isTF ? (f.correct === 0 ? 'True' : 'False') : f.options[f.correct]?.trim();
    if (!correct) return setErr(new Error('Mark one of the filled-in options as correct'));
    const body = {
      subject_id: Number(subjectId), topic_id: Number(f.topic_id), text: f.text, type: f.type,
      options: isTF ? undefined : options, correct_answer: correct, difficulty: f.difficulty, explanation: f.explanation || undefined,
    };
    setBusy(true);
    try {
      if (editing) await api.put(`/questions/${editing.id}`, body); else await api.post('/questions', body);
      setF(BLANK);
      onDone();
    } catch (x) { setErr(x); } finally { setBusy(false); }
  }

  return (
    <Card title={editing ? 'Edit question' : 'Add a question'}>
      <form onSubmit={submit} className="stack">
        <label className="field"><span>Question</span><textarea rows={2} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} required minLength={5} /></label>
        <div className="toolbar">
          <label className="field inline"><span>Topic</span>
            <select value={f.topic_id} onChange={(e) => setF({ ...f, topic_id: e.target.value })} required>
              <option value="">Choose…</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="field inline"><span>Type</span>
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value, correct: 0 })}>
              <option value="mcq">Multiple choice</option><option value="true_false">True / false</option>
            </select>
          </label>
          <label className="field inline"><span>Difficulty</span>
            <select value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}>
              <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </select>
          </label>
        </div>
        <fieldset className="options-edit">
          <legend>Options (select the correct one)</legend>
          {(isTF ? ['True', 'False'] : f.options).map((o, i) => (
            <div className="opt-row" key={i}>
              <input type="radio" name="correct" checked={f.correct === i} onChange={() => setF({ ...f, correct: i })} aria-label={`Option ${i + 1} is correct`} />
              {isTF ? <span>{o}</span> : <input value={o} onChange={(e) => setOpt(i, e.target.value)} placeholder={`Option ${i + 1}`} />}
            </div>
          ))}
        </fieldset>
        <label className="field"><span>Explanation (shown after answering)</span><textarea rows={2} value={f.explanation} onChange={(e) => setF({ ...f, explanation: e.target.value })} /></label>
        <ErrorMsg error={err} />
        <div>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add question'}</button>{' '}
          {editing && <button type="button" className="btn" onClick={onCancel}>Cancel</button>}
        </div>
      </form>
    </Card>
  );
}
