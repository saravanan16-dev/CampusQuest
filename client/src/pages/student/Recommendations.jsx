import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { Card, Empty, ErrorMsg, Loading, useAsync } from '../../components/ui.jsx';

export default function Recommendations() {
  const recs = useAsync(() => api.get('/recommendations/me'), []);

  if (recs.loading) return <Loading />;
  if (recs.error) return <ErrorMsg error={recs.error} />;

  return (
    <>
      <h1>Targeted practice</h1>
      <p className="muted">Recommendations come from your assessment answers: topics where you answered fewer than half correctly. Each one shows the evidence behind it.</p>
      {recs.data.length === 0 ? (
        <Card><Empty>No weak topics flagged right now. Keep taking assessments to build up enough data.</Empty></Card>
      ) : recs.data.map((r) => (
        <Card key={r.topic_id} title={`${r.subject_code} · ${r.topic_name}`}>
          <p><strong>Why:</strong> {r.reason}</p>
          <div className="grid two">
            <div>
              <h3>Practice questions</h3>
              {r.questions.length === 0 ? <p className="muted">No unseen questions left for this topic. Ask your teacher to add more.</p> : (
                <ul className="plain">
                  {r.questions.map((q) => <li key={q.id}><span className={`tag tag-${q.difficulty}`}>{q.difficulty}</span> {q.text}</li>)}
                </ul>
              )}
              <Link className="btn" to={`/student/practice?topicId=${r.topic_id}`}>Practise this topic</Link>
            </div>
            <div>
              <h3>Study material</h3>
              {r.resources.length === 0 ? <p className="muted">No resources are tagged with this topic yet.</p> : (
                <ul className="plain">
                  {r.resources.map((x) => <DownloadLink key={x.id} resource={x} />)}
                </ul>
              )}
            </div>
          </div>
        </Card>
      ))}
    </>
  );
}

function DownloadLink({ resource }) {
  const [err, setErr] = useState(null);
  return (
    <li>
      <button className="link" onClick={() => api.download(`/resources/${resource.id}/download`, resource.original_name).catch(setErr)}>{resource.title}</button>
      <ErrorMsg error={err} />
    </li>
  );
}
