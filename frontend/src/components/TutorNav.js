import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/TutorDashboard.css';
import { useTheme } from '../ThemeContext';

/**
 * Shared navbar for all tutor-section pages.
 * Also owns the custom cursor and body-style override for the tutor theme.
 * Props:
 *   active: 'dashboard' | 'clients' | 'chatting'
 */
export default function TutorNav({ active }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Override global body styles (set by Auth/HomePage/StudyRoom) and hide pseudo-element overlays
  useEffect(() => {
    const prev = {
      overflow: document.body.style.overflow,
      overflowY: document.body.style.overflowY,
      bg: document.body.style.background,
      color: document.body.style.color,
      cursor: document.body.style.cursor,
    };
    document.body.style.overflow = 'auto';
    document.body.style.overflowY = 'auto';
    document.body.style.background = theme === 'dark' ? '#0f172a' : '#f0f4ff';
    document.body.style.color = theme === 'dark' ? '#f0f4ff' : '#0d1b3e';
    document.body.style.cursor = 'none';

    const styleTag = document.createElement('style');
    styleTag.id = 'tutor-body-fix';
    styleTag.textContent = 'body::before, body::after { display: none !important; }';
    document.head.appendChild(styleTag);

    return () => {
      document.body.style.overflow = prev.overflow;
      document.body.style.overflowY = prev.overflowY;
      document.body.style.background = prev.bg;
      document.body.style.color = prev.color;
      document.body.style.cursor = prev.cursor;
      const tag = document.getElementById('tutor-body-fix');
      if (tag) tag.remove();
    };
  }, [theme]);

  // Custom cursor tracking
  useEffect(() => {
    const cO = document.getElementById('tCurO');
    const cI = document.getElementById('tCurI');
    if (!cO || !cI) return;
    const move = (e) => {
      cI.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
      cO.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
    };
    document.addEventListener('mousemove', move);

    const enter = () => {
      const ring = cO.querySelector('.cur-ring');
      if (ring) ring.style.cssText += 'width:52px;height:52px;opacity:.25;';
    };
    const leave = () => {
      const ring = cO.querySelector('.cur-ring');
      if (ring) ring.style.cssText += 'width:32px;height:32px;opacity:.45;';
    };
    const hoverEls = document.querySelectorAll('a,button,input,select,textarea,label');
    hoverEls.forEach((el) => {
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
    });
    return () => {
      document.removeEventListener('mousemove', move);
      hoverEls.forEach((el) => {
        el.removeEventListener('mouseenter', enter);
        el.removeEventListener('mouseleave', leave);
      });
    };
  }, []);

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch (e) { /* proceed anyway */ }
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('auth-changed'));
    navigate('/login');
  };

  return (
    <>
      <div className="cur" id="tCurO"><div className="cur-ring" /></div>
      <div className="cur" id="tCurI"><div className="cur-dot" /></div>

      <nav className="tutor-nav">
        <button type="button" className="logo" onClick={() => navigate('/tutor')}>
          <div className="logo-icon">
            <img src="/favicon/cropped_circle_image.png" alt="UniConnect" />
          </div>
          Uni<em>Connect</em>
        </button>

        <ul className="nav-links">
          <li>
            <button
              type="button"
              className={active === 'dashboard' ? 'active' : ''}
              onClick={() => navigate('/tutor')}
            >
              Profile
            </button>
          </li>
          <li>
            <button
              type="button"
              className={active === 'clients' ? 'active' : ''}
              onClick={() => navigate('/tutor/clients')}
            >
              Clients
            </button>
          </li>
          <li>
            <button
              type="button"
              className={active === 'chatting' ? 'active' : ''}
              onClick={() => navigate('/tutor/chatting')}
            >
              Tutor Chatting
            </button>
          </li>
          <li>
            <button
              type="button"
              className={active === 'earnings' ? 'active' : ''}
              onClick={() => navigate('/tutor/earnings')}
            >
              Earnings
            </button>
          </li>
        </ul>

        <div className="nav-cta">
          <button
            className="btn-nav-ghost theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="btn-nav-solid" onClick={handleLogout}>Logout</button>
        </div>
      </nav>
    </>
  );
}
