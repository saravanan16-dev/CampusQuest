import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import { Loading } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import StudentDashboard from './pages/student/Dashboard.jsx';
import Recommendations from './pages/student/Recommendations.jsx';
import Practice from './pages/student/Practice.jsx';
import StudentAssessments from './pages/student/Assessments.jsx';
import TakeAssessment from './pages/student/TakeAssessment.jsx';
import Result from './pages/Result.jsx';
import Resources from './pages/Resources.jsx';
import TeacherDashboard from './pages/teacher/Dashboard.jsx';
import TeacherAssessments from './pages/teacher/Assessments.jsx';
import Questions from './pages/teacher/Questions.jsx';
import Admin from './pages/admin/Admin.jsx';

const HOME = { student: '/student', teacher: '/teacher', admin: '/admin' };

// Redirects to login when signed out, and to the user's own portal when the role does not match.
function Guard({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.role)) return <Navigate to={HOME[user.role]} replace />;
  return children;
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return <Navigate to={user ? HOME[user.role] : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      <Route element={<Guard role={['student', 'teacher', 'admin']}><Layout /></Guard>}>
        <Route path="/student" element={<Guard role="student"><StudentDashboard /></Guard>} />
        <Route path="/student/recommendations" element={<Guard role="student"><Recommendations /></Guard>} />
        <Route path="/student/practice" element={<Guard role="student"><Practice /></Guard>} />
        <Route path="/student/assessments" element={<Guard role="student"><StudentAssessments /></Guard>} />
        <Route path="/student/assessments/:id/take" element={<Guard role="student"><TakeAssessment /></Guard>} />
        <Route path="/student/resources" element={<Guard role="student"><Resources /></Guard>} />

        <Route path="/teacher" element={<Guard role="teacher"><TeacherDashboard /></Guard>} />
        <Route path="/teacher/assessments" element={<Guard role="teacher"><TeacherAssessments /></Guard>} />
        <Route path="/teacher/questions" element={<Guard role="teacher"><Questions /></Guard>} />
        <Route path="/teacher/resources" element={<Guard role="teacher"><Resources /></Guard>} />

        <Route path="/admin" element={<Guard role="admin"><Admin /></Guard>} />
        <Route path="/admin/resources" element={<Guard role="admin"><Resources /></Guard>} />

        <Route path="/results/:id" element={<Result />} />
      </Route>

      <Route path="*" element={<Home />} />
    </Routes>
  );
}
