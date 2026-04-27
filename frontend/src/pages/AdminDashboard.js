import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTheme } from '../ThemeContext';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const fmt = (n) =>
  n !== undefined && n !== null ? `LKR ${Number(n).toLocaleString()}` : '—';
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const avatarLetter = (name) =>
  name ? name.trim()[0].toUpperCase() : '?';

/* ─── stat card ────────────────────────────────────────────────────────────── */
function StatCard({ label, value, icon, accent, cardBg, text, subtle }) {
  return (
    <div style={{
      background: cardBg, borderRadius: 14, padding: '1.4rem 1.6rem',
      border: `1px solid ${accent}33`, display: 'flex', alignItems: 'center', gap: '1rem',
      boxShadow: `0 4px 24px ${accent}18`,
    }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.8rem', color: subtle, marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── data table ────────────────────────────────────────────────────────────── */
function DataTable({ columns, rows, emptyMsg, cardBg, text, border, subtle, accent }) {
  const [search, setSearch] = useState('');
  const inputBg = cardBg === '#111827' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';

  const filtered = rows.filter(row =>
    Object.values(row).some(v =>
      String(v ?? '').toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div>
      <input
        placeholder="Search…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          background: inputBg, border: `1px solid ${border}`, borderRadius: 8,
          color: text, padding: '0.5rem 1rem', fontSize: '0.85rem',
          marginBottom: '1rem', outline: 'none', width: 220,
        }}
      />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c.key} style={{
                  textAlign: 'left', padding: '0.6rem 0.8rem',
                  color: accent, fontWeight: 600, fontSize: '0.78rem',
                  borderBottom: `1px solid ${border}`, whiteSpace: 'nowrap',
                }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={columns.length} style={{ padding: '2rem', textAlign: 'center', color: subtle }}>{emptyMsg || 'No data'}</td></tr>
            ) : filtered.map((row, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${border}33`, transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = `${accent}09`}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {columns.map(c => (
                  <td key={c.key} style={{ padding: '0.65rem 0.8rem', color: text, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '0.75rem', color: subtle, fontSize: '0.78rem' }}>
        Showing {filtered.length} of {rows.length}
      </div>
    </div>
  );
}

/* ─── badge ─────────────────────────────────────────────────────────────────── */
function Badge({ value }) {
  const colors = {
    completed: ['#00E5C3', '#003d35'],
    pending:   ['#FBBC05', '#3d3000'],
    failed:    ['#FF5252', '#3d0000'],
    accepted:  ['#4A9EFF', '#001a3d'],
    rejected:  ['#FF5252', '#3d0000'],
    cancelled: ['#aaa',    '#222'],
    admin:     ['#c084fc', '#2d1a47'],
    tutor:     ['#4A9EFF', '#001a3d'],
    student:   ['#00E5C3', '#003d35'],
    peer:      ['#FBBC05', '#3d3000'],
    tutoring:  ['#4A9EFF', '#001a3d'],
  };
  const [fg, bg] = colors[value] || ['#aaa', '#222'];
  return (
    <span style={{ background: bg, color: fg, borderRadius: 99, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600 }}>
      {value}
    </span>
  );
}

/* ─── avatar chip ───────────────────────────────────────────────────────────── */
function AvatarChip({ name, email, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${accent}33`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
        {avatarLetter(name)}
      </div>
      <div style={{ overflow: 'hidden' }}>
        <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{name || '—'}</div>
        {email && <div style={{ fontSize: '0.72rem', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{email}</div>}
      </div>
    </div>
  );
}

/* ─── main component ────────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  /* theme tokens */
  const bg      = isDark ? '#0A0E1A' : '#f0f4ff';
  const sidebar = isDark ? '#0D1221' : '#1a2a4a';
  const cardBg  = isDark ? '#111827' : '#ffffff';
  const text    = isDark ? '#e2e8f0' : '#1e293b';
  const subtle  = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const border  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const topbarBg = isDark ? 'rgba(13,18,33,0.95)' : 'rgba(255,255,255,0.95)';
  const accent  = '#4A9EFF';
  const cyan    = '#00E5C3';

  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [groups, setGroups] = useState([]);
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());

  /* custom cursor */
  useEffect(() => {
    const cO = document.getElementById('adm-cO');
    const cI = document.getElementById('adm-cI');
    if (!cO || !cI) return;
    const move = e => {
      cI.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
      cO.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
    };
    document.addEventListener('mousemove', move);
    const enter = () => { const r = cO.querySelector('.adm-ring'); if (r) { r.style.width='52px'; r.style.height='52px'; r.style.opacity='0.35'; } };
    const leave = () => { const r = cO.querySelector('.adm-ring'); if (r) { r.style.width='34px'; r.style.height='34px'; r.style.opacity='0.65'; } };
    const hoverEls = document.querySelectorAll('a,button,input');
    hoverEls.forEach(el => { el.addEventListener('mouseenter', enter); el.addEventListener('mouseleave', leave); });
    return () => {
      document.removeEventListener('mousemove', move);
      hoverEls.forEach(el => { el.removeEventListener('mouseenter', enter); el.removeEventListener('mouseleave', leave); });
    };
  }, [tab, loading]);

  /* live clock */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const loadData = useCallback(async (key) => {
    setLoading(true);
    setError('');
    try {
      if (key === 'overview') {
        const r = await api.get('/admin/stats');
        setStats(r.data);
      }
      if (key === 'users') {
        const r = await api.get('/admin/users');
        setUsers(r.data);
      }
      if (key === 'tutors') {
        const r = await api.get('/admin/tutors');
        setTutors(r.data);
      }
      if (key === 'groups') {
        const r = await api.get('/admin/groups');
        setGroups(r.data);
      }
      if (key === 'payments') {
        const r = await api.get('/admin/payments');
        setPayments(r.data);
      }
      if (key === 'bookings') {
        const r = await api.get('/admin/bookings');
        setBookings(r.data);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData('overview');
  }, [loadData]);

  const handleTab = (key) => {
    setTab(key);
    loadData(key);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('availableRoles');
    window.dispatchEvent(new Event('auth-changed'));
    navigate('/login');
  };

  /* ── sidebar nav items ── */
  const navItems = [
    { key: 'overview', icon: '📊', label: 'Overview'   },
    { key: 'users',    icon: '👥', label: 'All Users'   },
    { key: 'tutors',   icon: '📚', label: 'Tutors'      },
    { key: 'groups',   icon: '🏫', label: 'Study Groups'},
    { key: 'payments', icon: '💳', label: 'Payments'    },
    { key: 'bookings', icon: '🤝', label: 'Bookings'    },
  ];

  /* ── column definitions ── */
  const userCols = [
    { key: 'name',       label: 'Name',       render: (v, r) => <AvatarChip name={v} email={r.email} accent={accent} /> },
    { key: 'role',       label: 'Role',       render: v => <Badge value={v} /> },
    { key: 'university', label: 'University'  },
    { key: 'createdAt',  label: 'Joined',     render: v => fmtDate(v) },
  ];

  const tutorCols = [
    { key: '_name',           label: 'Tutor',    render: (v, r) => <AvatarChip name={`${r.firstName||''} ${r.lastName||''}`.trim() || r.user?.name} email={r.personalEmail || r.user?.email} accent={accent} /> },
    { key: 'subjectsYouTeach',label: 'Subjects', render: v => Array.isArray(v) ? v.join(', ') || '—' : '—' },
    { key: 'hourlyRate',      label: 'Rate',     render: (v, r) => r.isFree ? 'Free' : fmt(v) },
    { key: 'teachingStyle',   label: 'Style'     },
    { key: 'language',        label: 'Language'  },
    { key: 'createdAt',       label: 'Joined',   render: v => fmtDate(v) },
  ];

  const groupCols = [
    { key: 'name',      label: 'Group Name' },
    { key: 'groupType', label: 'Type',      render: v => <Badge value={v} /> },
    { key: '_members',  label: 'Members',   render: (v, r) => r.members?.length || 0 },
    { key: 'createdAt', label: 'Created',   render: v => fmtDate(v) },
  ];

  const paymentCols = [
    { key: 'transactionRef', label: 'Ref' },
    { key: '_student', label: 'Student',  render: (v, r) => <AvatarChip name={r.student?.name} email={r.student?.email} accent={accent} /> },
    { key: '_tutor',   label: 'Tutor',    render: (v, r) => <AvatarChip name={r.tutor?.name}   email={r.tutor?.email}   accent={cyan}   /> },
    { key: 'totalAmount', label: 'Amount',render: v => fmt(v) },
    { key: 'hours',    label: 'Hours'    },
    { key: 'status',   label: 'Status',  render: v => <Badge value={v} /> },
    { key: 'createdAt',label: 'Date',    render: v => fmtDate(v) },
  ];

  const bookingCols = [
    { key: '_student', label: 'Student',  render: (v, r) => <AvatarChip name={r.student?.name} email={r.student?.email} accent={accent} /> },
    { key: '_tutor',   label: 'Tutor',    render: (v, r) => <AvatarChip name={r.tutor?.name}   email={r.tutor?.email}   accent={cyan}   /> },
    { key: 'subject',  label: 'Subject'  },
    { key: 'matchScore',label: 'Match',  render: v => v ? `${(v * 100).toFixed(0)}%` : '—' },
    { key: 'maxBudget',label: 'Budget',  render: v => fmt(v) },
    { key: 'status',   label: 'Status',  render: v => <Badge value={v} /> },
    { key: 'createdAt',label: 'Date',    render: v => fmtDate(v) },
  ];

  /* ── render ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', sans-serif", background: bg, cursor: 'none' }}>

      {/* Custom cursor */}
      <div id="adm-cO" style={{ position: 'fixed', top: 0, left: 0, zIndex: 99999, pointerEvents: 'none' }}>
        <div className="adm-ring" style={{ width: 34, height: 34, border: `1.5px solid ${accent}`, borderRadius: '50%', transform: 'translate(-50%,-50%)', opacity: 0.65, transition: 'width .25s, height .25s, opacity .25s' }} />
      </div>
      <div id="adm-cI" style={{ position: 'fixed', top: 0, left: 0, zIndex: 99999, pointerEvents: 'none' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: cyan, transform: 'translate(-50%,-50%)' }} />
      </div>

      {/* ── Top Header (brand + horizontal nav + actions) ── */}
      <header style={{
        flexShrink: 0,
        background: isDark ? '#0D1221' : '#1a2a4a',
        boxShadow: '0 2px 20px rgba(0,0,0,0.35)',
        zIndex: 20,
      }}>
        {/* Top row: brand left, actions right */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 2rem', height: 56, borderBottom: `1px solid rgba(255,255,255,0.07)`,
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${accent}, ${cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛡️</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem', lineHeight: 1.2 }}>UniConnect</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>Admin Panel</div>
            </div>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
              {now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />
            <button
              onClick={() => loadData(tab)}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: 7, padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
              onMouseEnter={e => e.currentTarget.style.background = `${accent}33`}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            >↻ Refresh</button>
            <button
              onClick={toggleTheme}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: 7, padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.82rem' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              title={isDark ? 'Light mode' : 'Dark mode'}
            >{isDark ? '☀️' : '🌙'}</button>
            <button
              onClick={handleLogout}
              style={{ background: 'rgba(255,82,82,0.15)', border: '1px solid rgba(255,82,82,0.3)', color: '#FF7070', borderRadius: 7, padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,82,82,0.28)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,82,82,0.15)'}
            >🚪 Logout</button>
          </div>
        </div>

        {/* Nav tab row: all tabs spread horizontally */}
        <nav style={{ display: 'flex', alignItems: 'flex-end', padding: '0 2rem', gap: 2, overflowX: 'auto' }}>
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => handleTab(item.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '0.65rem 1.1rem',
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: 'transparent',
                color: tab === item.key ? '#fff' : 'rgba(255,255,255,0.5)',
                fontWeight: tab === item.key ? 600 : 400,
                fontSize: '0.85rem',
                borderBottom: tab === item.key ? `2.5px solid ${accent}` : '2.5px solid transparent',
                transition: 'all .15s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (tab !== item.key) e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
              onMouseLeave={e => { if (tab !== item.key) e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Scrollable content ── */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '1.75rem 2rem' }}>

        {error && (
          <div style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 10, padding: '0.75rem 1rem', color: '#ff6b6b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: subtle }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⟳</div>
            <p>Loading…</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Overview */}
            {tab === 'overview' && stats && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
                  <StatCard label="Total Users"        value={stats.userCount}    icon="👥" accent={accent}   cardBg={cardBg} text={text} subtle={subtle} />
                  <StatCard label="Students"           value={stats.studentCount} icon="🎓" accent={cyan}     cardBg={cardBg} text={text} subtle={subtle} />
                  <StatCard label="Tutors"             value={stats.tutorCount}   icon="📚" accent="#c084fc"  cardBg={cardBg} text={text} subtle={subtle} />
                  <StatCard label="Study Groups"       value={stats.groupCount}   icon="🏫" accent="#FBBC05"  cardBg={cardBg} text={text} subtle={subtle} />
                  <StatCard label="Bookings"           value={stats.bookingCount} icon="🤝" accent="#FF9800"  cardBg={cardBg} text={text} subtle={subtle} />
                  <StatCard label="Completed Payments" value={stats.paymentCount} icon="💳" accent={cyan}     cardBg={cardBg} text={text} subtle={subtle} />
                  <StatCard label="Total Revenue"      value={fmt(stats.totalRevenue)} icon="💰" accent={accent} cardBg={cardBg} text={text} subtle={subtle} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div style={{ background: cardBg, borderRadius: 14, padding: '1.5rem', border: `1px solid ${border}` }}>
                    <h3 style={{ color: accent, margin: '0 0 1rem', fontSize: '1rem' }}>Quick Access</h3>
                    {navItems.filter(n => n.key !== 'overview').map(item => (
                      <button
                        key={item.key}
                        onClick={() => handleTab(item.key)}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', marginBottom: 6, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: text, fontSize: '0.875rem', cursor: 'pointer' }}
                      >
                        {item.icon} {item.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ background: cardBg, borderRadius: 14, padding: '1.5rem', border: `1px solid ${border}` }}>
                    <h3 style={{ color: cyan, margin: '0 0 1rem', fontSize: '1rem' }}>Platform Info</h3>
                    {[
                      ['Date', new Date().toLocaleDateString('en-GB')],
                      ['Database', 'MongoDB Atlas'],
                      ['Auth', 'JWT + Face ID'],
                      ['Currency', 'LKR (Simulated)'],
                      ['Matching', 'Weighted Score Algorithm'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: `1px solid ${border}`, fontSize: '0.85rem' }}>
                        <span style={{ color: subtle }}>{k}</span>
                        <span style={{ color: text, fontWeight: 500 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'users' && (
              <div style={{ background: cardBg, borderRadius: 14, padding: '1.5rem', border: `1px solid ${border}` }}>
                <DataTable columns={userCols} rows={users} emptyMsg="No users found" cardBg={cardBg} text={text} border={border} subtle={subtle} accent={accent} />
              </div>
            )}

            {tab === 'tutors' && (
              <div style={{ background: cardBg, borderRadius: 14, padding: '1.5rem', border: `1px solid ${border}` }}>
                <DataTable columns={tutorCols} rows={tutors} emptyMsg="No tutor profiles found" cardBg={cardBg} text={text} border={border} subtle={subtle} accent={accent} />
              </div>
            )}

            {tab === 'groups' && (
              <div style={{ background: cardBg, borderRadius: 14, padding: '1.5rem', border: `1px solid ${border}` }}>
                <DataTable columns={groupCols} rows={groups} emptyMsg="No study groups found" cardBg={cardBg} text={text} border={border} subtle={subtle} accent={accent} />
              </div>
            )}

            {tab === 'payments' && (
              <div style={{ background: cardBg, borderRadius: 14, padding: '1.5rem', border: `1px solid ${border}` }}>
                <DataTable columns={paymentCols} rows={payments} emptyMsg="No payments yet" cardBg={cardBg} text={text} border={border} subtle={subtle} accent={accent} />
              </div>
            )}

            {tab === 'bookings' && (
              <div style={{ background: cardBg, borderRadius: 14, padding: '1.5rem', border: `1px solid ${border}` }}>
                <DataTable columns={bookingCols} rows={bookings} emptyMsg="No bookings found" cardBg={cardBg} text={text} border={border} subtle={subtle} accent={accent} />
              </div>
            )}
          </>
        )}
        </div>{/* end padding */}
      </main>
    </div>
  );
}

