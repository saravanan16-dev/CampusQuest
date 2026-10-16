import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const NAV = {
  student: [
    ['/student', 'Dashboard', true],
    ['/student/recommendations', 'Recommendations'],
    ['/student/practice', 'Practice'],
    ['/student/assessments', 'Assessments'],
    ['/student/resources', 'Resources'],
  ],
  teacher: [
    ['/teacher', 'Class analytics', true],
    ['/teacher/assessments', 'Assessments'],
    ['/teacher/questions', 'Question bank'],
    ['/teacher/resources', 'Resources'],
  ],
  admin: [
    ['/admin', 'Administration', true],
    ['/admin/resources', 'Resources'],
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">CampusQuest</div>
        <nav aria-label="Main">
          {(NAV[user.role] || []).map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="who">
          <div className="who-name">{user.name}</div>
          <div className="muted small">{user.role}</div>
          <button className="link" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
