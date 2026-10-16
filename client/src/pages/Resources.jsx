import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Card, ClassSubjectPicker, Empty, ErrorMsg, Loading, fmtDate, parsePair, useAsync, useClassSubjects } from '../components/ui.jsx';

export default function Resources() {
  const { user } = useAuth();
  const canManage = user.role !== 'student';
  const pairs = useClassSubjects();
  const [pair, setPair] = useState('');
  const [q, setQ] = useState('');
  const [topicId, setTopicId] = useState('');
  const [page, setPage] = useState(1);
  const { classId, subjectId } = parsePair(pair);

  useEffect(() => {
    if (pairs.data && pairs.data.length && !pair) setPair(`${pairs.data[0].class_id}:${pairs.data[0].subject_id}`);
  }, [pairs.data, pair]);

  const topics = useAsync(() => (subjectId ? api.get('/topics', { subjectId }) : Promise.resolve([])), [subjectId]);
  const list = useAsync(
    () => (classId ? api.get('/resources', { classId, subjectId, topicId, q: q || undefined, page, limit: 10 }) : Promise.resolve(null)),
    [classId, subjectId, topicId, q, page]
  );

  if (pairs.loading) return <Loading />;
  if (pairs.error) return <ErrorMsg error={pairs.error} />;
  if (!pairs.data.length) return <><h1>Resources</h1><Empty>You are not linked to any class and subject yet.</Empty></>;

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.limit)) : 1;

  return (
    <>
      <h1>Resources</h1>
      <Card>
        <div className="toolbar">
          <ClassSubjectPicker pairs={pairs.data} value={pair} onChange={(v) => { setPair(v); setTopicId(''); setPage(1); }} />
          <label className="field inline">
            <span>Topic</span>
            <select value={topicId} onChange={(e) => { setTopicId(e.target.value); setPage(1); }}>
              <option value="">All topics</option>
              {(topics.data || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="field inline">
            <span>Search</span>
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Title or topic" />
          </label>
        </div>
      </Card>

      {canManage && classId && <UploadForm classId={classId} subjectId={subjectId} topics={topics.data || []} onDone={list.reload} />}

      <Card title="Files">
        {list.loading && <Loading />}
        <ErrorMsg error={list.error} />
        {list.data && (list.data.items.length === 0 ? <Empty>No resources match.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Title</th><th>Topic</th><th>Uploaded</th><th>By</th><th></th></tr></thead>
              <tbody>
                {list.data.items.map((r) => <Row key={r.id} r={r} canManage={canManage} onRemoved={list.reload} />)}
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

function Row({ r, canManage, onRemoved }) {
  const [err, setErr] = useState(null);
  return (
    <tr>
      <td>{r.title}<div className="muted small">{r.original_name}</div><ErrorMsg error={err} /></td>
      <td>{r.topic_name || '—'}</td>
      <td>{fmtDate(r.created_at)}</td>
      <td>{r.uploaded_by_name}</td>
      <td className="nowrap">
        <button className="btn" onClick={() => api.download(`/resources/${r.id}/download`, r.original_name).catch(setErr)}>Download</button>{' '}
        {canManage && <button className="btn danger" onClick={() => { if (window.confirm(`Remove "${r.title}"?`)) api.del(`/resources/${r.id}`).then(onRemoved).catch(setErr); }}>Remove</button>}
      </td>
    </tr>
  );
}

function UploadForm({ classId, subjectId, topics, onDone }) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [file, setFile] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    if (!file) return setErr(new Error('Choose a file to upload'));
    const fd = new FormData();
    fd.append('class_id', classId);
    fd.append('subject_id', subjectId);
    if (topic) fd.append('topic_id', topic);
    fd.append('title', title);
    fd.append('file', file);
    setBusy(true);
    try {
      await api.upload('/resources', fd);
      setTitle(''); setTopic(''); setFile(null);
      e.target.reset();
      onDone();
    } catch (x) {
      setErr(x);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Upload a resource">
      <form className="toolbar" onSubmit={submit}>
        <label className="field inline"><span>Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} /></label>
        <label className="field inline">
          <span>Topic (optional)</span>
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">None</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="field inline"><span>File</span><input type="file" onChange={(e) => setFile(e.target.files[0] || null)} accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg" /></label>
        <button className="btn primary" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button>
      </form>
      <ErrorMsg error={err} />
    </Card>
  );
}
