import { useState } from 'react';
import { api } from '../../api.js';
import { Card, Empty, ErrorMsg, Loading, useAsync } from '../../components/ui.jsx';

const TABS = ['Users', 'Classes', 'Subjects', 'Assignments', 'Enrollments'];

export default function Admin() {
  const [tab, setTab] = useState('Users');
  return (
    <>
      <h1>Administration</h1>
      <div className="tabs" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {tab === 'Users' && <Users />}
      {tab === 'Classes' && <Classes />}
      {tab === 'Subjects' && <Subjects />}
      {tab === 'Assignments' && <Assignments />}
      {tab === 'Enrollments' && <Enrollments />}
    </>
  );
}

// Small helper for forms that post and then reload a list.
function useSubmit(path, build, reset, onDone) {
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try { await api.post(path, build()); reset(); onDone(); } catch (x) { setErr(x); } finally { setBusy(false); }
  }
  return { err, busy, submit };
}

function Users() {
  const [role, setRole] = useState('');
  const list = useAsync(() => api.get('/users', { role }), [role]);
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'teacher' });
  const form = useSubmit('/users', () => f, () => setF({ name: '', email: '', password: '', role: 'teacher' }), list.reload);
  return (
    <>
      <Card title="Create a user">
        <form className="toolbar" onSubmit={form.submit}>
          <label className="field inline"><span>Name</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required minLength={2} /></label>
          <label className="field inline"><span>Email</span><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></label>
          <label className="field inline"><span>Temporary password</span><input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={8} /></label>
          <label className="field inline"><span>Role</span>
            <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="teacher">Teacher</option><option value="student">Student</option><option value="admin">Admin</option></select>
          </label>
          <button className="btn primary" disabled={form.busy}>Create</button>
        </form>
        <ErrorMsg error={form.err} />
      </Card>
      <Card title="Users" actions={
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role">
          <option value="">All roles</option><option value="student">Students</option><option value="teacher">Teachers</option><option value="admin">Admins</option>
        </select>}>
        {list.loading && <Loading />}<ErrorMsg error={list.error} />
        {list.data && <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
          <tbody>{list.data.map((u) => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td></tr>)}</tbody></table></div>}
      </Card>
    </>
  );
}

function Classes() {
  const list = useAsync(() => api.get('/classes'), []);
  const [f, setF] = useState({ name: '', academic_year: '', section: 'A' });
  const form = useSubmit('/classes', () => f, () => setF({ name: '', academic_year: '', section: 'A' }), list.reload);
  return (
    <>
      <Card title="Create a class">
        <form className="toolbar" onSubmit={form.submit}>
          <label className="field inline"><span>Name</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required placeholder="CSE III Year" /></label>
          <label className="field inline"><span>Academic year</span><input value={f.academic_year} onChange={(e) => setF({ ...f, academic_year: e.target.value })} required minLength={4} placeholder="2026-27" /></label>
          <label className="field inline"><span>Section</span><input value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })} /></label>
          <button className="btn primary" disabled={form.busy}>Create</button>
        </form>
        <ErrorMsg error={form.err} />
      </Card>
      <Card title="Classes">
        {list.loading && <Loading />}<ErrorMsg error={list.error} />
        {list.data && (list.data.length === 0 ? <Empty>No classes yet.</Empty> : <div className="table-wrap"><table><thead><tr><th>Name</th><th>Year</th><th>Section</th></tr></thead>
          <tbody>{list.data.map((c) => <tr key={c.id}><td>{c.name}</td><td>{c.academic_year}</td><td>{c.section}</td></tr>)}</tbody></table></div>)}
      </Card>
    </>
  );
}

function Subjects() {
  const list = useAsync(() => api.get('/subjects'), []);
  const [f, setF] = useState({ code: '', name: '' });
  const form = useSubmit('/subjects', () => f, () => setF({ code: '', name: '' }), list.reload);
  return (
    <>
      <Card title="Create a subject">
        <form className="toolbar" onSubmit={form.submit}>
          <label className="field inline"><span>Code</span><input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} required minLength={2} placeholder="CS301" /></label>
          <label className="field inline"><span>Name</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required minLength={2} placeholder="Data Structures" /></label>
          <button className="btn primary" disabled={form.busy}>Create</button>
        </form>
        <ErrorMsg error={form.err} />
      </Card>
      <Card title="Subjects">
        {list.loading && <Loading />}<ErrorMsg error={list.error} />
        {list.data && (list.data.length === 0 ? <Empty>No subjects yet.</Empty> : <div className="table-wrap"><table><thead><tr><th>Code</th><th>Name</th></tr></thead>
          <tbody>{list.data.map((s) => <tr key={s.id}><td>{s.code}</td><td>{s.name}</td></tr>)}</tbody></table></div>)}
      </Card>
    </>
  );
}

function Assignments() {
  const list = useAsync(() => api.get('/teacher-assignments'), []);
  const teachers = useAsync(() => api.get('/users', { role: 'teacher' }), []);
  const classes = useAsync(() => api.get('/classes'), []);
  const subjects = useAsync(() => api.get('/subjects'), []);
  const [f, setF] = useState({ teacher_id: '', class_id: '', subject_id: '' });
  const form = useSubmit('/teacher-assignments',
    () => ({ teacher_id: Number(f.teacher_id), class_id: Number(f.class_id), subject_id: Number(f.subject_id) }),
    () => setF({ teacher_id: '', class_id: '', subject_id: '' }), list.reload);
  const [err, setErr] = useState(null);
  const ready = teachers.data && classes.data && subjects.data;
  return (
    <>
      <Card title="Assign a teacher to a class and subject">
        {!ready ? <Loading /> : (
          <form className="toolbar" onSubmit={form.submit}>
            <label className="field inline"><span>Teacher</span><select value={f.teacher_id} onChange={(e) => setF({ ...f, teacher_id: e.target.value })} required>
              <option value="">Choose…</option>{teachers.data.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            <label className="field inline"><span>Class</span><select value={f.class_id} onChange={(e) => setF({ ...f, class_id: e.target.value })} required>
              <option value="">Choose…</option>{classes.data.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section} ({c.academic_year})</option>)}</select></label>
            <label className="field inline"><span>Subject</span><select value={f.subject_id} onChange={(e) => setF({ ...f, subject_id: e.target.value })} required>
              <option value="">Choose…</option>{subjects.data.map((s) => <option key={s.id} value={s.id}>{s.code} {s.name}</option>)}</select></label>
            <button className="btn primary" disabled={form.busy}>Assign</button>
          </form>
        )}
        <ErrorMsg error={form.err} />
      </Card>
      <Card title="Current assignments">
        {list.loading && <Loading />}<ErrorMsg error={list.error || err} />
        {list.data && (list.data.length === 0 ? <Empty>No assignments yet.</Empty> : <div className="table-wrap"><table><thead><tr><th>Teacher</th><th>Class</th><th>Subject</th><th></th></tr></thead>
          <tbody>{list.data.map((a) => (
            <tr key={a.id}><td>{a.teacher_name}</td><td>{a.class_name} {a.section} ({a.academic_year})</td><td>{a.subject_code} {a.subject_name}</td>
              <td><button className="btn danger" onClick={() => { if (window.confirm('Remove this assignment?')) api.del(`/teacher-assignments/${a.id}`).then(list.reload).catch(setErr); }}>Remove</button></td></tr>
          ))}</tbody></table></div>)}
      </Card>
    </>
  );
}

function Enrollments() {
  const classes = useAsync(() => api.get('/classes'), []);
  const students = useAsync(() => api.get('/users', { role: 'student' }), []);
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [err, setErr] = useState(null);
  const enrolled = useAsync(() => (classId ? api.get(`/classes/${classId}/enrollments`) : Promise.resolve([])), [classId]);

  async function enroll(e) {
    e.preventDefault();
    setErr(null);
    try { await api.post(`/classes/${classId}/enrollments`, { studentId: Number(studentId) }); setStudentId(''); enrolled.reload(); } catch (x) { setErr(x); }
  }

  const enrolledIds = new Set((enrolled.data || []).map((s) => s.id));
  return (
    <>
      <Card title="Enrol students">
        {!classes.data || !students.data ? <Loading /> : (
          <form className="toolbar" onSubmit={enroll}>
            <label className="field inline"><span>Class</span><select value={classId} onChange={(e) => setClassId(e.target.value)} required>
              <option value="">Choose…</option>{classes.data.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section} ({c.academic_year})</option>)}</select></label>
            <label className="field inline"><span>Student</span><select value={studentId} onChange={(e) => setStudentId(e.target.value)} required disabled={!classId}>
              <option value="">Choose…</option>{students.data.filter((s) => !enrolledIds.has(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}</select></label>
            <button className="btn primary" disabled={!classId}>Enrol</button>
          </form>
        )}
        <ErrorMsg error={err} />
      </Card>
      {classId && (
        <Card title="Enrolled students">
          {enrolled.loading && <Loading />}
          {enrolled.data && (enrolled.data.length === 0 ? <Empty>No students enrolled yet.</Empty> : <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th></th></tr></thead>
            <tbody>{enrolled.data.map((s) => (
              <tr key={s.id}><td>{s.name}</td><td>{s.email}</td>
                <td><button className="btn danger" onClick={() => { if (window.confirm(`Remove ${s.name} from this class?`)) api.del(`/classes/${classId}/enrollments/${s.id}`).then(enrolled.reload).catch(setErr); }}>Remove</button></td></tr>
            ))}</tbody></table></div>)}
        </Card>
      )}
    </>
  );
}
