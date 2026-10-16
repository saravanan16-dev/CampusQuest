import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { ErrorMsg } from '../components/ui.jsx';

const HOME = { student: '/student', teacher: '/teacher', admin: '/admin' };

export default function Login() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={HOME[user.role]} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const u = mode === 'login' ? await login(form.email, form.password) : await register(form.name, form.email, form.password);
      navigate(HOME[u.role], { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>CampusQuest</h1>
        <p className="muted">Learning intelligence for engineering classes</p>

        {mode === 'register' && (
          <label className="field">
            <span>Full name</span>
            <input value={form.name} onChange={set('name')} required minLength={2} autoComplete="name" />
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password" value={form.password} onChange={set('password')} required
            minLength={mode === 'register' ? 8 : 1} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          {mode === 'register' && <small className="muted">At least 8 characters</small>}
        </label>

        <ErrorMsg error={error} />
        <button className="btn primary block" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create student account'}
        </button>
        <button type="button" className="link center" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}>
          {mode === 'login' ? 'New student? Create an account' : 'Already registered? Sign in'}
        </button>
        {mode === 'register' && <p className="muted small">Teacher and admin accounts are created by an administrator. After registering, ask your administrator to enrol you in a class.</p>}
      </form>
    </div>
  );
}
