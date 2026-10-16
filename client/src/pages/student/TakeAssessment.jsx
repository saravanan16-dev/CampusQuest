import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { Card, ErrorMsg, Loading } from '../../components/ui.jsx';

export default function TakeAssessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const submitted = useRef(false);

  const draftKey = `cq_draft_${id}`;

  useEffect(() => {
    api.post(`/assessments/${id}/start`)
      .then((d) => {
        setData(d);
        // Restore unsent answers if the page was refreshed.
        try { setAnswers(JSON.parse(localStorage.getItem(draftKey)) || {}); } catch { /* ignore */ }
        if (d.assessment.duration_min) setSecondsLeft(Math.max(0, d.assessment.duration_min * 60 - d.seconds_elapsed));
      })
      .catch(setError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!data || !data.assessment.duration_min) return undefined;
    // Count down from the server-reported remaining time (immune to the browser clock and time zone).
    const end = Date.now() + Math.max(0, data.assessment.duration_min * 60 - data.seconds_elapsed) * 1000;
    const t = setInterval(() => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && !submitted.current) submit();
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function choose(qid, option) {
    const next = { ...answers, [qid]: option };
    setAnswers(next);
    try { localStorage.setItem(draftKey, JSON.stringify(next)); } catch { /* storage unavailable */ }
  }

  async function submit() {
    if (submitted.current) return;
    submitted.current = true;
    setBusy(true);
    setError(null);
    try {
      const r = await api.post(`/assessments/${id}/submit`, { answers });
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      navigate(`/results/${r.id}`, { replace: true });
    } catch (e) {
      submitted.current = false;
      setError(e);
      setBusy(false);
    }
  }

  if (error && !data) return <ErrorMsg error={error} />;
  if (!data) return <Loading />;

  const answered = Object.keys(answers).length;
  const mm = secondsLeft === null ? null : `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;

  return (
    <>
      <div className="quiz-head">
        <div>
          <h1>{data.assessment.title}</h1>
          <p className="muted">{data.assessment.subject_code} · {answered} of {data.questions.length} answered</p>
        </div>
        {mm && <div className={`timer ${secondsLeft < 60 ? 'danger' : ''}`} role="timer" aria-label="Time remaining">{mm}</div>}
      </div>

      {data.questions.map((q, i) => (
        <Card key={q.id} title={`Question ${i + 1}`}>
          <p>{q.text}</p>
          <div className="options" role="radiogroup" aria-label={`Question ${i + 1}`}>
            {q.options.map((o) => (
              <button
                key={o} role="radio" aria-checked={answers[q.id] === o}
                className={`option ${answers[q.id] === o ? 'selected' : ''}`} onClick={() => choose(q.id, o)}
              >{o}</button>
            ))}
          </div>
        </Card>
      ))}

      <ErrorMsg error={error} />
      <div className="sticky-bar">
        <span className="muted">{data.questions.length - answered} unanswered questions are marked incorrect.</span>
        <button className="btn primary" disabled={busy} onClick={() => { if (answered === data.questions.length || window.confirm('Submit with unanswered questions?')) submit(); }}>
          {busy ? 'Submitting…' : 'Submit assessment'}
        </button>
      </div>
    </>
  );
}
