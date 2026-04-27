import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTheme } from '../ThemeContext';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isDark = theme === 'dark';
  const bg = isDark ? '#0A0E1A' : '#f0f4ff';
  const cardBg = isDark ? '#111827' : '#ffffff';
  const text = isDark ? '#e2e8f0' : '#1e293b';
  const subtle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const accent = '#4A9EFF';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email: email.trim(), password, role: 'admin' });
      const { token, role } = res.data;
      if (role !== 'admin') {
        setError('Access denied. Admin credentials required.');
        return;
      }
      localStorage.setItem('token', token);
      window.dispatchEvent(new Event('auth-changed'));
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
      <button
        onClick={toggleTheme}
        style={{ position: 'fixed', top: 16, right: 16, background: 'none', border: `1px solid ${border}`, color: text, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 14 }}
      >
        {isDark ? '☀️' : '🌙'}
      </button>

      <div style={{ width: 380, background: cardBg, borderRadius: 16, padding: '2.5rem', boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.5)' : '0 8px 40px rgba(0,0,0,0.12)', border: `1px solid ${border}` }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 52, height: 52, background: `linear-gradient(135deg, ${accent}, #00E5C3)`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: 24 }}>🛡️</div>
          <h1 style={{ color: text, fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Admin Portal</h1>
          <p style={{ color: subtle, fontSize: '0.875rem', marginTop: 6 }}>UniConnect administration</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: subtle, fontSize: '0.8rem', marginBottom: 6, fontWeight: 500 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@uniconnect.lk"
              required
              style={{ width: '100%', padding: '0.7rem 1rem', background: inputBg, border: `1px solid ${border}`, borderRadius: 10, color: text, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: subtle, fontSize: '0.8rem', marginBottom: 6, fontWeight: 500 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%', padding: '0.7rem 1rem', background: inputBg, border: `1px solid ${border}`, borderRadius: 10, color: text, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(255,80,80,0.12)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 8, padding: '0.6rem 1rem', color: '#ff6b6b', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.8rem', background: `linear-gradient(135deg, ${accent}, #1A6BFF)`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'opacity .2s' }}
          >
            {loading ? 'Signing in…' : 'Sign In as Admin'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{ background: 'none', border: 'none', color: accent, fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
