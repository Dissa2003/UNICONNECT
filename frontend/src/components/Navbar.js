import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../styles/HomePage.css';
import api from '../services/api';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'));
  const [availableRoles, setAvailableRoles] = useState([]);
  const [switchingRole, setSwitchingRole] = useState(false);

  const getRoleFromToken = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || null;
    } catch (e) {
      return null;
    }
  };

  const getProfileRoute = () => {
    const role = getRoleFromToken();
    if (role === 'admin') return '/admin';
    if (role === 'tutor') return '/tutor';
    return '/student';
  };

  const getStoredRoles = () => {
    try {
      const raw = localStorage.getItem('availableRoles');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  const syncAuthState = () => {
    const hasToken = !!localStorage.getItem('token');
    setLoggedIn(hasToken);
    setAvailableRoles(hasToken ? getStoredRoles() : []);
  };

  // sync login state when storage changes (e.g. from another tab)
  useEffect(() => {
    const handler = () => syncAuthState();
    window.addEventListener('storage', handler);
    window.addEventListener('auth-changed', handler);
    syncAuthState();
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('auth-changed', handler);
    };
  }, []);

  // same-tab route changes should also refresh auth button state
  useEffect(() => {
    syncAuthState();
  }, [location.pathname]);

  const handleSwitchRole = async () => {
    const currentRole = getRoleFromToken();
    const targetRole = availableRoles.find((role) => role !== currentRole);

    if (!targetRole) {
      return;
    }

    setSwitchingRole(true);
    try {
      const res = await api.post('/auth/switch-role', { role: targetRole });
      const { token, role, availableRoles: rolesFromServer } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('availableRoles', JSON.stringify(Array.isArray(rolesFromServer) ? rolesFromServer : [role]));
      window.dispatchEvent(new Event('auth-changed'));

      if (role === 'admin') navigate('/admin');
      else if (role === 'tutor') navigate('/tutor');
      else navigate('/student');
    } catch (e) {
      // Keep the current session if role switch fails.
    } finally {
      setSwitchingRole(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // proceed with local logout even if API fails
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('availableRoles');
      window.dispatchEvent(new Event('auth-changed'));
      setLoggedIn(false);
      navigate('/login');
    }
  };

  return (
    <nav>
      <div className="logo">
        <div className="logo-icon">✦</div>
        UniConnect
      </div>
      <ul className="nav-links">
        <li><Link to="/">Home</Link></li>
        <li><Link to="#wellness">Wellness</Link></li>
        <li><Link to="#book">Book a Tutor</Link></li>
        <li><Link to="#references">References</Link></li>
        <li><Link to="#group">Need a Group</Link></li>
        <li><Link to="#room">Study Room</Link></li>
      </ul>
      <div className="nav-actions">
        {loggedIn ? (
          <>
            {availableRoles.length > 1 && (
              <button className="nav-login" onClick={handleSwitchRole} disabled={switchingRole}>
                {switchingRole ? 'Switching...' : `Switch to ${getRoleFromToken() === 'tutor' ? 'Student' : 'Tutor'}`}
              </button>
            )}
            <button className="nav-profile" onClick={() => navigate(getProfileRoute())} title="Open profile">
              <span role="img" aria-label="profile">👤</span>
            </button>
            <button className="nav-logout" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <Link to="/login" className="nav-login">Login</Link>
        )}
      </div>
    </nav>
  );
}
