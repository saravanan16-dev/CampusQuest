import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api.js';
import { Card, Empty, ErrorMsg, Loading, useAsync, useClassSubjects } from '../../components/ui.jsx';

export default function Practice() {
  const [params, setParams] = useSearchParams();
  const pairs = useClassSubjects();
  const topicsAll = useAsync(async () => {
    const subjects = [...new Set((await api.get('/me/classes')).map((p) => p.subject_id))];
    const lists = await Promise.all(subjects.map((id) => api.get('/topics', { subjectId: id })));
    return lists.flat();
  }, []);
  const topicId = params.get('topicId') || '';
  const [difficulty, setDifficulty] = useState('');
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState({}); // questionId -> { selected, correct, correct_answer, explanation }

  useEffect(() => {
    setQuestions(null);
    setFeedback({});
    setError(null);
    if (!topicId) return;
    api.get('/practice/questions', { topicId, difficulty, limit: 5 }).then(setQuestions).catch(setError);
  }, [topicId, difficulty]);

  async function answer(q, selected) {
    if (feedback[q.id]) return;
    try {
      const r = await api.post('/practice/answer', { questionId: q.id, selected });
      setFeedback((f) => ({ ...f, [q.id]: { selected, ...r } }));
    } catch (e) {
      setError(e);
    }
  }

  if (pairs.loading || topicsAll.loading) return <Loading />;
  if (pairs.error || topicsAll.error) return <ErrorMsg error={pairs.error || topicsAll.error} />;

  const done = questions && questions.length > 0 && questions.every((q) => feedback[q.id]);
  const score = questions ? questions.filter((q) => feedback[q.id]?.correct).length : 0;

  return (
    <>
      <h1>Practice</h1>
      <Card>
        <div className="toolbar">
          <label className="field inline">
            <span>Topic</span>
            <select value={topicId} onChange={(e) => setParams(e.target.value ? { topicId: e.target.value } : {})}>
              <option value="">Choose a topic…</option>
              {topicsAll.data.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="field inline">
            <span>Difficulty</span>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="">Any</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </select>
          </label>
        </div>
      </Card>

      <ErrorMsg error={error} />
      {!topicId && <Empty>Pick a topic to start a short practice set.</Empty>}
      {topicId && !questions && !error && <Loading />}
      {questions && questions.length === 0 && <Empty>No questions available for this topic and difficulty.</Empty>}

      {questions && questions.map((q, i) => {
        const f = feedback[q.id];
        return (
          <Card key={q.id} title={`Question ${i + 1}`}>
            <p>{q.text}</p>
            <div className="options">
              {q.options.map((o) => {
                let cls = 'option';
                if (f) {
                  if (o === f.correct_answer) cls += ' right';
                  else if (o === f.selected) cls += ' wrong';
                }
                return <button key={o} className={cls} disabled={Boolean(f)} onClick={() => answer(q, o)}>{o}</button>;
              })}
            </div>
            {f && (
              <p className={`alert ${f.correct ? 'ok' : 'error'}`}>
                {f.correct ? 'Correct.' : `Not quite. The answer is "${f.correct_answer}".`} {f.explanation}
              </p>
            )}
          </Card>
        );
      })}
      {done && <p className="alert ok">Set complete: {score} of {questions.length} correct. Practice does not change your assessment scores; retake an assessment to measure improvement.</p>}
    </>
  );
}
