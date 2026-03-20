import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import HomePage from './pages/HomePage';
import StudentDashboard from './pages/StudentDashboard';
import TutorDashboard from './pages/TutorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import StudyRoom from './pages/StudyRoom';
import Navbar from './components/Navbar';
import { useEffect } from 'react';

// note: the separate Register page file exists but we now redirect to the (tabbed) login component

// simple guard
function Private({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

function AppWrapper() {
  // wrapper component so we can use hooks like useNavigate for inactivity
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const publicRoutes = ['/', '/login', '/register'];
    const token = localStorage.getItem('token');
    if (!token && !publicRoutes.includes(location.pathname)) {
      navigate('/login', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    let timer;
    const LOGOUT_TIME = 15 * 60 * 1000; // 15 minutes
    const logout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('availableRoles');
      navigate('/login');
    };
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(logout, LOGOUT_TIME);
      localStorage.setItem('lastActivity', Date.now());
    };
    // if user already idle on load, immediately logout
    const last = parseInt(localStorage.getItem('lastActivity') || '0', 10);
    if (last && Date.now() - last > LOGOUT_TIME) {
      logout();
    }
    ['click','keydown','mousemove','touchstart'].forEach(evt => document.addEventListener(evt, reset));
    reset();
    const storageHandler = e => {
      if (e.key === 'lastActivity' && e.newValue) {
        // another tab updated activity; restart timer
        reset();
      }
      if (e.key === 'token' && !e.newValue) {
        // token removed elsewhere
        logout();
      }
    };
    window.addEventListener('storage', storageHandler);
    return () => {
      clearTimeout(timer);
      ['click','keydown','mousemove','touchstart'].forEach(evt => document.removeEventListener(evt, reset));
      window.removeEventListener('storage', storageHandler);
    };
  }, [navigate]);

  return (
    <> 
      {!['/', '/login', '/register', '/tutor', '/study-room'].includes(location.pathname) && <Navbar />}
      <Routes>
        <Route path="/" element={<HomePage/>} />
        <Route path="/login" element={<Login/>} />
        {/* both routes use the same login/register component */}
        <Route path="/register" element={<Login/>} />
        <Route path="/student" element={<Private><StudentDashboard/></Private>} />
        <Route path="/tutor" element={<Private><TutorDashboard/></Private>} />
        <Route path="/admin" element={<Private><AdminDashboard/></Private>} />
        <Route path="/study-room" element={<Private><StudyRoom/></Private>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppWrapper />
    </BrowserRouter>
  );
}

export default App;