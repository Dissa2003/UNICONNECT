import React, { useEffect, useState } from 'react';
import api from '../services/api';
import TutorNav from '../components/TutorNav';
import '../styles/TutorDashboard.css';

const dayOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const timeOptions = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

const initialProfile = {
  firstName: '',
  lastName: '',
  personalEmail: '',
  phoneNumber: '',
  dateOfBirth: '',
  gender: '',
  subjectsYouTeach: [],
  teachingStyle: '',
  language: '',
  hourlyRate: 0,
  isFree: false,
  educationQualification: '',
  yearsOfExperience: 0,
  averageRating: 0,
  teachingLevel: '',
  availableDays: [],
  availableTime: '',
  availability: {},
  cityDistrict: '',
  teachingMode: ''
};

export default function TutorDashboard() {
  const [profile, setProfile] = useState(initialProfile);
  const [subjectText, setSubjectText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get('/tutor-profile/me');
        const p = { ...initialProfile, ...res.data };
        setProfile(p);
        setSubjectText((p.subjectsYouTeach || []).join(', '));
      } catch (err) {
        // If profile doesn't exist yet, keep empty default
      }
    };
    loadProfile();
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

  const toggleSlot = (day, time) => {
    const key = `${day}-${time}`;
    setProfile((prev) => {
      const nextAvailability = { ...prev.availability, [key]: !prev.availability?.[key] };
      const activeDays = dayOptions.filter((d) =>
        timeOptions.some((t) => nextAvailability[`${d}-${t}`])
      );

      return {
        ...prev,
        availability: nextAvailability,
        availableDays: activeDays,
      };
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
        yearsOfExperience: Number(profile.yearsOfExperience || 0),
        averageRating: Number(profile.averageRating || 0),
        isFree: Boolean(profile.isFree),
        hourlyRate: profile.isFree ? 0 : Number(profile.hourlyRate || 0),
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

  return (
    <div className="tutor-page">
      <TutorNav active="dashboard" />

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
            <SelectField
              label="Teaching Style"
              value={profile.teachingStyle}
              onChange={(v) => setProfile({ ...profile, teachingStyle: v })}
              options={['', 'Theory-based', 'Practical/Hands-on', 'Exam-oriented', 'Visual', 'Auditory', 'Kinaesthetic', 'Reading/Writing']}
            />
            <SelectField
              label="Teaching Language"
              value={profile.language}
              onChange={(v) => setProfile({ ...profile, language: v })}
              options={['', 'English', 'Sinhala', 'Singlish', 'Tamil']}
            />
            <Field
              label="Hourly Rate (LKR)"
              type="number"
              value={profile.hourlyRate}
              onChange={(v) => setProfile({ ...profile, hourlyRate: v })}
            />
            <CheckboxField
              label="I offer free tutoring"
              checked={Boolean(profile.isFree)}
              onChange={(checked) => setProfile({ ...profile, isFree: checked, hourlyRate: checked ? 0 : profile.hourlyRate })}
            />
            <Field label="Education Qualification" value={profile.educationQualification} onChange={(v) => setProfile({ ...profile, educationQualification: v })} />
            <Field label="Years of Experience" type="number" value={profile.yearsOfExperience} onChange={(v) => setProfile({ ...profile, yearsOfExperience: v })} />
            <Field
              label="Average Rating (0-5)"
              type="number"
              value={profile.averageRating}
              onChange={(v) => setProfile({ ...profile, averageRating: v })}
            />
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

          <div className="availability-wrap">
            <div className="days-label">Weekly Availability Slots</div>
            <div className="availability-grid">
              <div className="availability-cell time-header" />
              {dayOptions.map((day) => (
                <div key={day} className="availability-cell day-header">{day}</div>
              ))}

              {timeOptions.map((time) => (
                <React.Fragment key={time}>
                  <div className="availability-cell time-label">{time}</div>
                  {dayOptions.map((day) => {
                    const key = `${day}-${time}`;
                    const active = Boolean(profile.availability?.[key]);
                    return (
                      <button
                        type="button"
                        key={key}
                        className={`slot-btn ${active ? 'active' : ''}`}
                        onClick={() => toggleSlot(day, time)}
                        aria-label={`Toggle ${day} ${time}`}
                      />
                    );
                  })}
                </React.Fragment>
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

function CheckboxField({ label, checked, onChange }) {
  return (
    <div className="field-wrap">
      <label>{label}</label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: '20px', height: '20px', marginTop: '0.35rem' }}
      />
    </div>
  );
}
