import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/TutorDashboard.css';

const dayOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const initialProfile = {
  firstName: '',
  lastName: '',
  personalEmail: '',
  phoneNumber: '',
  dateOfBirth: '',
  gender: '',
  subjectsYouTeach: [],
  educationQualification: '',
  yearsOfExperience: 0,
  teachingLevel: '',
  availableDays: [],
  availableTime: '',
  cityDistrict: '',
  teachingMode: ''
};

export default function TutorDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(initialProfile);
  const [subjectText, setSubjectText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const greetingName = useMemo(() => {
    const full = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    return full || 'Tutor';
  }, [profile.firstName, profile.lastName]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverflowY = document.body.style.overflowY;
    document.body.style.overflow = 'auto';
    document.body.style.overflowY = 'auto';

    const loadProfile = async () => {
      try {
        const res = await api.get('/tutor-profile/me');
        const p = { ...initialProfile, ...res.data };
        setProfile(p);
        setSubjectText((p.subjectsYouTeach || []).join(', '));
      } catch (err) {
        // If profile doesn't exist yet, keep empty default and prefill from token-less known fields if possible.
      }
    };

    loadProfile();

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overflowY = prevOverflowY;
    };
  }, []);

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

  const showStatus = (msg, error = false) => {
    setMessage(msg);
    setIsError(error);
    setTimeout(() => setMessage(''), 2800);
  };

  const toggleDay = (day) => {
    setProfile((prev) => {
      const has = prev.availableDays.includes(day);
      const nextDays = has ? prev.availableDays.filter((d) => d !== day) : [...prev.availableDays, day];
      return { ...prev, availableDays: nextDays };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const subjects = subjectText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        ...profile,
        subjectsYouTeach: subjects,
        yearsOfExperience: Number(profile.yearsOfExperience || 0)
      };

      const res = await api.post('/tutor-profile', payload);
      setProfile({ ...initialProfile, ...res.data });
      setSubjectText(((res.data && res.data.subjectsYouTeach) || subjects).join(', '));
      showStatus('Tutor profile updated successfully');
    } catch (err) {
      showStatus(err.response?.data?.message || 'Failed to update profile', true);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // proceed anyway
    } finally {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth-changed'));
      navigate('/login');
    }
  };

  return (
    <div className="tutor-page">
      <div className="cur" id="tCurO"><div className="cur-ring" /></div>
      <div className="cur" id="tCurI"><div className="cur-dot" /></div>

      <nav className="tutor-nav">
        <a href="#top" className="logo">
          <div className="logo-icon">✦</div>
          Uni<em>Connect</em>
        </a>
        <ul className="nav-links">
          <li><a href="#top" className="active">For Tutors</a></li>
          <li><a href="#profile">Profile</a></li>
          <li><a href="#features">Features</a></li>
        </ul>
        <div className="nav-cta">
          <button className="btn-nav-ghost" onClick={() => navigate('/tutor')} title="Tutor home">👤 {greetingName}</button>
          <button className="btn-nav-solid" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-left">
          <div className="hero-eyebrow"><span className="eyebrow-dot" />Tutor Platform</div>
          <h1 className="hero-title">Teach smarter.<br />Earn <em>more.</em><br />Impact more.</h1>
          <p className="hero-sub">
            UniConnect gives you an intelligent booking system, matched students who fit your expertise, and real-time insights so you can focus on great teaching.
          </p>
          <div className="hero-actions">
            <a href="#profile" className="btn-primary">Update Tutor Profile <span>→</span></a>
            <a href="#features" className="btn-outline">See Features</a>
          </div>
        </div>

        <div className="hero-right">
          <div className="dashboard-mock">
            <div className="mock-title-bar">Tutor Dashboard</div>
            <div className="mock-stats">
              <div className="mock-stat"><div className="mn">12</div><div className="ml">Sessions this week</div></div>
              <div className="mock-stat"><div className="mn">4.9★</div><div className="ml">Avg rating</div></div>
              <div className="mock-stat"><div className="mn">98%</div><div className="ml">Show-up rate</div></div>
            </div>
            <div className="mock-chart">
              <div className="mock-chart-label">Weekly Earnings</div>
              <div className="bars-row">
                <div className="bar" style={{ height: '35%' }} />
                <div className="bar" style={{ height: '52%' }} />
                <div className="bar" style={{ height: '45%' }} />
                <div className="bar" style={{ height: '70%' }} />
                <div className="bar active" style={{ height: '88%' }} />
                <div className="bar" style={{ height: '60%' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-wrap" id="features">
        <div className="section-eyebrow">Platform Features</div>
        <h2 className="section-title">Everything you need to teach at your best</h2>
        <div className="features-grid">
          <div className="feat-card"><h3>Smart Calendar & Booking</h3><p>Real-time conflict detection and clean scheduling.</p></div>
          <div className="feat-card"><h3>AI Student Matching</h3><p>Better-fit students based on your expertise and availability.</p></div>
          <div className="feat-card"><h3>Earnings & Insights</h3><p>Transparent progress and monthly performance visibility.</p></div>
        </div>
      </section>

      <section className="section-wrap" id="profile">
        <div className="section-eyebrow">Tutor Profile</div>
        <h2 className="section-title">Update Your Tutor Information</h2>
        <div className="profile-card">
          <div className="profile-grid">
            <Field label="First Name" value={profile.firstName} onChange={(v) => setProfile({ ...profile, firstName: v })} />
            <Field label="Last Name" value={profile.lastName} onChange={(v) => setProfile({ ...profile, lastName: v })} />
            <Field label="Personal Email" value={profile.personalEmail} onChange={(v) => setProfile({ ...profile, personalEmail: v })} />
            <Field label="Phone Number" value={profile.phoneNumber} onChange={(v) => setProfile({ ...profile, phoneNumber: v })} />
            <Field label="Date of Birth" type="date" value={profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : ''} onChange={(v) => setProfile({ ...profile, dateOfBirth: v })} />
            <SelectField label="Gender" value={profile.gender} onChange={(v) => setProfile({ ...profile, gender: v })} options={['', 'Male', 'Female', 'Other', 'Prefer not to say']} />
            <Field label="Subjects You Teach" value={subjectText} onChange={(v) => setSubjectText(v)} placeholder="Math, Science, English" />
            <Field label="Education Qualification" value={profile.educationQualification} onChange={(v) => setProfile({ ...profile, educationQualification: v })} />
            <Field label="Years of Experience" type="number" value={profile.yearsOfExperience} onChange={(v) => setProfile({ ...profile, yearsOfExperience: v })} />
            <SelectField label="Teaching Level" value={profile.teachingLevel} onChange={(v) => setProfile({ ...profile, teachingLevel: v })} options={['', 'Primary', 'O/L', 'A/L', 'University']} />
            <SelectField label="Available Time" value={profile.availableTime} onChange={(v) => setProfile({ ...profile, availableTime: v })} options={['', 'Morning', 'Afternoon', 'Evening']} />
            <Field label="City / District" value={profile.cityDistrict} onChange={(v) => setProfile({ ...profile, cityDistrict: v })} />
            <SelectField label="Teaching Mode" value={profile.teachingMode} onChange={(v) => setProfile({ ...profile, teachingMode: v })} options={['', 'Online', 'Physical Classes', 'Both']} />
          </div>

          <div className="days-wrap">
            <div className="days-label">Available Days</div>
            <div className="days-grid">
              {dayOptions.map((d) => (
                <label key={d} className={`day-pill ${profile.availableDays.includes(d) ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={profile.availableDays.includes(d)}
                    onChange={() => toggleDay(d)}
                  />
                  {d}
                </label>
              ))}
            </div>
          </div>

          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Tutor Profile'}
          </button>
        </div>
      </section>

      {message && <div className={`floating-status ${isError ? 'error' : ''}`}>{message}</div>}

      <footer>
        <div className="footer-logo"><div className="logo-icon">✦</div> UniConnect</div>
        <div className="footer-copy">© 2026 UniConnect. Tutor Portal.</div>
      </footer>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div className="field-wrap">
      <label>{label}</label>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="field-wrap">
      <label>{label}</label>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o || 'empty'} value={o}>{o || 'Select'}</option>
        ))}
      </select>
    </div>
  );
}
