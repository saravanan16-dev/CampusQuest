import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

// Loads data on mount and whenever deps change. Returns { data, error, loading, reload }.
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return fn()
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => setState({ data: null, error, loading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}

// The (class, subject) pairs the current user works with.
export function useClassSubjects() {
  return useAsync(() => api.get('/me/classes'), []);
}

export const Loading = ({ text = 'Loading…' }) => <p className="muted" role="status">{text}</p>;

export const ErrorMsg = ({ error }) =>
  error ? <p className="alert error" role="alert">{error.message || String(error)}</p> : null;

export const Empty = ({ children }) => <p className="empty">{children}</p>;

export function Card({ title, actions, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

const STATUS_LABEL = { weak: 'Weak', developing: 'Developing', strong: 'Strong', insufficient: 'Not enough data' };
export const StatusChip = ({ status }) => <span className={`chip chip-${status}`}>{STATUS_LABEL[status] || status}</span>;

export const pct = (v, digits = 0) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(digits)}%`);

export const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(String(s).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

// Picker for a (class, subject) pair. value is "classId:subjectId".
export function ClassSubjectPicker({ pairs, value, onChange, label = 'Class and subject' }) {
  return (
    <label className="field inline">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {pairs.map((p) => (
          <option key={`${p.class_id}:${p.subject_id}`} value={`${p.class_id}:${p.subject_id}`}>
            {p.class_name} {p.section} · {p.subject_code} {p.subject_name}
          </option>
        ))}
      </select>
    </label>
  );
}

export const parsePair = (v) => {
  const [classId, subjectId] = (v || ':').split(':').map(Number);
  return { classId: classId || undefined, subjectId: subjectId || undefined };
};
