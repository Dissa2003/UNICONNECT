import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTheme } from '../ThemeContext';

const FACE_MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
const FACE_API_CDN = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';

export default function UserProfilePage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDk = theme !== 'light';

  // user data
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, msg: '', ok: true });

  // basic info edit
  const [editName, setEditName] = useState('');
  const [editUni, setEditUni] = useState('');
  const [editDegree, setEditDegree] = useState('');
  const [editYear, setEditYear] = useState('');
  const [savingBasic, setSavingBasic] = useState(false);

  // password change
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  // inline validation errors
  const [basicErrs, setBasicErrs] = useState({ name: '', uni: '', degree: '', year: '' });
  const [passErrs, setPassErrs] = useState({ cur: '', new: '', confirm: '' });

  // avatar
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);

  // face ID
  const [hasFaceId, setHasFaceId] = useState(null);
  const [faceOpen, setFaceOpen] = useState(false);
  const [faceBusy, setFaceBusy] = useState(false);
  const [faceError, setFaceError] = useState('');
  const [faceInfo, setFaceInfo] = useState('');
  const faceVideoRef = useRef(null);
  const faceStreamRef = useRef(null);
  const faceApiRef = useRef(null);
  const modelsLoaded = useRef(false);

  const pal = {
    bg:        isDk ? '#0A0E1A' : '#f0f4ff',
    card:      isDk ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.9)',
    cardBorder:isDk ? 'rgba(255,255,255,.09)' : 'rgba(26,107,255,.14)',
    text:      isDk ? '#fff' : '#0d1b3e',
    muted:     isDk ? 'rgba(255,255,255,.45)' : '#5a6a8a',
    input:     isDk ? 'rgba(255,255,255,.06)' : '#fff',
    inputBorder:isDk? 'rgba(255,255,255,.12)' : 'rgba(26,107,255,.22)',
    inputFocus:isDk ? '#1A6BFF' : '#1A6BFF',
    label:     isDk ? 'rgba(255,255,255,.55)' : '#5a6a8a',
  };

  const showToast = (msg, ok = true) => {
    setToast({ show: true, msg, ok });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  // load user + face status
  useEffect(() => {
    (async () => {
      try {
        const uRes = await api.get('/users/me');
        setUser(uRes.data);
        setEditName(uRes.data.name || '');
        setEditUni(uRes.data.university || '');
        setEditDegree(uRes.data.degreeProgram || '');
        setEditYear(uRes.data.year ? String(uRes.data.year) : '');
      } catch (err) {
        showToast('Failed to load profile. Make sure you are logged in.', false);
      } finally {
        setLoading(false);
      }
      try {
        const fRes = await api.get('/auth/face-status');
        setHasFaceId(fRes.data.enrolled);
      } catch {
        setHasFaceId(false);
      }
    })();
  }, []);

  // Custom cursor (matches Login/Dashboard style)
  useEffect(() => {
    const cO = document.getElementById('cO');
    const cI = document.getElementById('cI');
    if (!cO || !cI) return;
    const move = e => {
      cI.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
      cO.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
    };
    const enter = () => { cO.querySelector('.cur-ring').style.cssText += 'width:52px;height:52px;opacity:.35;'; };
    const leave = () => { cO.querySelector('.cur-ring').style.cssText += 'width:34px;height:34px;opacity:.65;'; };
    document.addEventListener('mousemove', move);
    const hoverEls = document.querySelectorAll('a,button,input');
    hoverEls.forEach(el => {
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
    });
    return () => {
      document.removeEventListener('mousemove', move);
      hoverEls.forEach(el => {
        el.removeEventListener('mouseenter', enter);
        el.removeEventListener('mouseleave', leave);
      });
    };
  }, [loading]);

  // ── Avatar ───────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please select an image file', false); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5 MB', false); return; }
    try {
      setAvatarUploading(true);
      const form = new FormData();
      form.append('avatar', file);
      const res = await api.post('/users/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(u => ({ ...u, avatar: res.data.avatar }));
      showToast('Profile photo updated ✓');
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload failed', false);
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── Basic info ───────────────────────────────────────────────
  const saveBasic = async () => {
    const errs = { name: '', uni: '', degree: '', year: '' };
    const name = editName.trim();
    if (!name) errs.name = 'Name is required.';
    else if (name.length < 2) errs.name = 'Name must be at least 2 characters.';
    else if (name.length > 100) errs.name = 'Name must be 100 characters or fewer.';
    if (editUni.trim().length > 100) errs.uni = 'University name must be 100 characters or fewer.';
    if (editDegree.trim().length > 100) errs.degree = 'Degree program must be 100 characters or fewer.';
    if (editYear) {
      const y = Number(editYear);
      if (!Number.isInteger(y) || y < 1 || y > 6) errs.year = 'Year must be a whole number between 1 and 6.';
    }
    setBasicErrs(errs);
    if (Object.values(errs).some(e => e)) return;
    try {
      setSavingBasic(true);
      const res = await api.patch('/users/me', {
        name,
        university: editUni.trim(),
        degreeProgram: editDegree.trim(),
        year: editYear ? Number(editYear) : undefined,
      });
      setUser(res.data);
      showToast('Details saved ✓');
    } catch (err) {
      showToast(err.response?.data?.message || 'Save failed', false);
    } finally {
      setSavingBasic(false);
    }
  };

  // ── Password ─────────────────────────────────────────────────
  const savePassword = async () => {
    const errs = { cur: '', new: '', confirm: '' };
    if (!curPass) errs.cur = 'Current password is required.';
    if (!newPass) errs.new = 'New password is required.';
    else if (newPass.length < 8) errs.new = 'Password must be at least 8 characters.';
    else if (!/[A-Za-z]/.test(newPass)) errs.new = 'Password must contain at least one letter.';
    else if (!/[0-9]/.test(newPass)) errs.new = 'Password must contain at least one number.';
    if (!errs.new) {
      if (!confirmPass) errs.confirm = 'Please confirm your new password.';
      else if (newPass !== confirmPass) errs.confirm = 'Passwords do not match.';
    }
    setPassErrs(errs);
    if (Object.values(errs).some(e => e)) return;
    try {
      setSavingPass(true);
      await api.patch('/users/me/password', { currentPassword: curPass, newPassword: newPass });
      setCurPass(''); setNewPass(''); setConfirmPass('');
      setPassErrs({ cur: '', new: '', confirm: '' });
      showToast('Password changed ✓');
    } catch (err) {
      showToast(err.response?.data?.message || 'Password change failed', false);
    } finally {
      setSavingPass(false);
    }
  };

  // ── Face ID ──────────────────────────────────────────────────
  const ensureFaceModels = async () => {
    if (modelsLoaded.current && faceApiRef.current) return faceApiRef.current;
    let faceapi = window.faceapi;
    if (!faceapi) {
      await new Promise((res, rej) => {
        const ex = document.querySelector('script[data-face-api="true"]');
        if (ex) { ex.addEventListener('load', res, { once: true }); ex.addEventListener('error', rej, { once: true }); return; }
        const s = document.createElement('script');
        s.src = FACE_API_CDN; s.async = true; s.dataset.faceApi = 'true';
        s.onload = res; s.onerror = () => rej(new Error('Failed to load face-api'));
        document.body.appendChild(s);
      });
      faceapi = window.faceapi;
    }
    if (!faceapi) throw new Error('face-api unavailable');
    await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL);
    faceApiRef.current = faceapi;
    modelsLoaded.current = true;
    return faceapi;
  };

  useEffect(() => {
    if (!faceOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        faceStreamRef.current = stream;
        if (faceVideoRef.current) {
          faceVideoRef.current.srcObject = stream;
          await faceVideoRef.current.play();
        }
        setFaceInfo('Camera ready. Keep your face centred and click Scan Face.');
      } catch {
        if (!cancelled) setFaceError('Could not access camera. Please allow camera permission.');
      }
    })();
    return () => {
      cancelled = true;
      if (faceStreamRef.current) {
        faceStreamRef.current.getTracks().forEach(t => t.stop());
        faceStreamRef.current = null;
      }
    };
  }, [faceOpen]);

  const scanAndEnroll = async () => {
    setFaceBusy(true); setFaceError('');
    try {
      const faceapi = await ensureFaceModels();
      const video = faceVideoRef.current;
      if (!video) throw new Error('Camera not ready');
      const det = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!det) throw new Error('No face detected. Keep your face centred and try again.');
      const descriptor = Array.from(det.descriptor).map(v => Number(v.toFixed(8)));
      await api.post('/auth/update-face', { faceDescriptor: descriptor });
      setHasFaceId(true);
      setFaceInfo('Face ID enrolled successfully!');
      setTimeout(() => setFaceOpen(false), 1600);
    } catch (err) {
      setFaceError(err?.response?.data?.message || err.message || 'Scan failed');
    } finally {
      setFaceBusy(false);
    }
  };

  // ── Styles ───────────────────────────────────────────────────
  const cardStyle = {
    background: pal.card,
    border: `1px solid ${pal.cardBorder}`,
    borderRadius: '16px',
    padding: '1.6rem 1.8rem',
    marginBottom: '1.2rem',
  };
  const labelStyle = { display: 'block', fontSize: '0.74rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: pal.label, marginBottom: '0.4rem' };
  const inputStyle = {
    width: '100%', padding: '0.7rem 1rem',
    background: pal.input, border: `1.5px solid ${pal.inputBorder}`,
    borderRadius: '10px', color: pal.text,
    fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', outline: 'none',
    boxSizing: 'border-box',
  };
  const sectionTitle = { fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: pal.text, marginBottom: '1.1rem' };
  const btnPrimary = {
    padding: '0.65rem 1.4rem', borderRadius: '10px',
    background: 'linear-gradient(135deg,#1A6BFF,#38BFFF)',
    border: 'none', color: '#fff', cursor: 'pointer',
    fontWeight: 700, fontSize: '0.875rem', fontFamily: 'DM Sans',
  };
  const btnGhost = {
    padding: '0.65rem 1.2rem', borderRadius: '10px',
    background: 'transparent', border: `1px solid ${pal.cardBorder}`,
    color: pal.muted, cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'DM Sans',
  };
  const errStyle = { fontSize: '0.73rem', color: '#ff5272', marginTop: '0.35rem' };
  const errBorder = '1.5px solid #ff5272';

  if (loading) return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center', background: pal.bg, color: pal.text }}>
      Loading…
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: pal.bg, color: pal.text, fontFamily: 'DM Sans, sans-serif', paddingBottom: '4rem' }}>
      {/* custom cursor */}
      <div className="cur" id="cO" style={{ position: 'fixed', top: 0, left: 0, zIndex: 12001, pointerEvents: 'none' }}>
        <div className="cur-ring" style={{ width: '34px', height: '34px', border: '1.5px solid #1A6BFF', borderRadius: '50%', transform: 'translate(-50%,-50%)', opacity: 0.65, transition: 'all 0.25s' }}></div>
      </div>
      <div className="cur" id="cI" style={{ position: 'fixed', top: 0, left: 0, zIndex: 12001, pointerEvents: 'none' }}>
        <div className="cur-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00E5C3', transform: 'translate(-50%,-50%)' }}></div>
      </div>

      {/* orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(26,107,255,.12),transparent 70%)', top: -150, right: -100, filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,229,195,.09),transparent 70%)', bottom: -80, left: -80, filter: 'blur(100px)' }} />
      </div>

      {/* toast */}
      {toast.show && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: toast.ok ? 'rgba(0,229,195,.15)' : 'rgba(255,82,114,.15)', border: `1px solid ${toast.ok ? 'rgba(0,229,195,.35)' : 'rgba(255,82,114,.35)'}`, color: toast.ok ? '#00e5c3' : '#ff5272', padding: '0.65rem 1.4rem', borderRadius: '99px', fontSize: '0.87rem', fontWeight: 600, zIndex: 9000, backdropFilter: 'blur(10px)' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 780, margin: '0 auto', padding: '2.5rem 1.5rem 0' }}>
        {/* back */}
        <button onClick={() => navigate(-1)} style={{ ...btnGhost, marginBottom: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          ← Back
        </button>

        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(1.5rem,3vw,2rem)', letterSpacing: '-0.04em', marginBottom: '0.4rem', color: pal.text }}>My Profile</div>
        <div style={{ fontSize: '0.875rem', color: pal.muted, marginBottom: '2rem' }}>Edit your account details, photo, and Face ID</div>

        {/* ── Avatar card ── */}
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* avatar circle */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: 90, height: 90, borderRadius: '50%',
                background: user?.avatar ? 'transparent' : 'linear-gradient(135deg,#1A6BFF,#00E5C3)',
                display: 'grid', placeItems: 'center', overflow: 'hidden',
                border: `3px solid ${isDk ? 'rgba(255,255,255,.12)' : 'rgba(26,107,255,.2)'}`,
              }}
            >
              {user?.avatar
                ? <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '2.2rem' }}>🎓</span>
              }
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: '50%',
                background: '#1A6BFF', border: `2px solid ${pal.bg}`,
                color: '#fff', fontSize: '0.7rem', cursor: 'pointer',
                display: 'grid', placeItems: 'center',
              }}
              title="Change photo"
            >
              {avatarUploading ? '…' : '✏'}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>

          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.05rem', color: pal.text }}>{user?.name}</div>
            <div style={{ fontSize: '0.78rem', color: '#00E5C3', marginTop: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{user?.role}</div>
            <div style={{ fontSize: '0.78rem', color: pal.muted, marginTop: '0.4rem' }}>{user?.email}</div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              style={{ ...btnGhost, marginTop: '0.8rem', fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
            >
              {avatarUploading ? 'Uploading…' : 'Change photo'}
            </button>
          </div>
        </div>

        {/* ── Basic info ── */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Basic Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Full Name</label>
              <input style={{ ...inputStyle, border: basicErrs.name ? errBorder : inputStyle.border }} value={editName} onChange={e => { setEditName(e.target.value); setBasicErrs(p => ({ ...p, name: '' })); }} placeholder="Your full name" />
              {basicErrs.name && <div style={errStyle}>{basicErrs.name}</div>}
            </div>
            <div>
              <label style={labelStyle}>University</label>
              <input style={{ ...inputStyle, border: basicErrs.uni ? errBorder : inputStyle.border }} value={editUni} onChange={e => { setEditUni(e.target.value); setBasicErrs(p => ({ ...p, uni: '' })); }} placeholder="e.g. University of Melbourne" />
              {basicErrs.uni && <div style={errStyle}>{basicErrs.uni}</div>}
            </div>
            <div>
              <label style={labelStyle}>Degree Program</label>
              <input style={{ ...inputStyle, border: basicErrs.degree ? errBorder : inputStyle.border }} value={editDegree} onChange={e => { setEditDegree(e.target.value); setBasicErrs(p => ({ ...p, degree: '' })); }} placeholder="e.g. Bachelor of IT" />
              {basicErrs.degree && <div style={errStyle}>{basicErrs.degree}</div>}
            </div>
            <div>
              <label style={labelStyle}>Year of Study</label>
              <input style={{ ...inputStyle, border: basicErrs.year ? errBorder : inputStyle.border }} type="number" min="1" max="6" value={editYear} onChange={e => { setEditYear(e.target.value); setBasicErrs(p => ({ ...p, year: '' })); }} placeholder="1 – 6" />
              {basicErrs.year && <div style={errStyle}>{basicErrs.year}</div>}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Email <span style={{ opacity: 0.5, textTransform: 'none', fontSize: '0.7rem' }}>(cannot be changed)</span></label>
              <input style={{ ...inputStyle, opacity: 0.55, cursor: 'not-allowed' }} value={user?.email || ''} readOnly />
            </div>
          </div>
          <div style={{ marginTop: '1.2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={saveBasic} disabled={savingBasic} style={btnPrimary}>
              {savingBasic ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* ── Password ── */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Change Password</div>
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            <div>
              <label style={labelStyle}>Current Password</label>
              <input style={{ ...inputStyle, border: passErrs.cur ? errBorder : inputStyle.border }} type="password" value={curPass} onChange={e => { setCurPass(e.target.value); setPassErrs(p => ({ ...p, cur: '' })); }} placeholder="••••••••" autoComplete="current-password" />
              {passErrs.cur && <div style={errStyle}>{passErrs.cur}</div>}
            </div>
            <div>
              <label style={labelStyle}>New Password</label>
              <input style={{ ...inputStyle, border: passErrs.new ? errBorder : inputStyle.border }} type="password" value={newPass} onChange={e => { setNewPass(e.target.value); setPassErrs(p => ({ ...p, new: '' })); }} placeholder="Min 8 characters, include letters &amp; numbers" autoComplete="new-password" />
              {passErrs.new && <div style={errStyle}>{passErrs.new}</div>}
            </div>
            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <input style={{ ...inputStyle, border: passErrs.confirm ? errBorder : inputStyle.border }} type="password" value={confirmPass} onChange={e => { setConfirmPass(e.target.value); setPassErrs(p => ({ ...p, confirm: '' })); }} placeholder="Re-enter new password" autoComplete="new-password" />
              {passErrs.confirm && <div style={errStyle}>{passErrs.confirm}</div>}
            </div>
          </div>
          <div style={{ marginTop: '1.2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={savePassword} disabled={savingPass} style={btnPrimary}>
              {savingPass ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </div>

        {/* ── Face ID ── */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Smart Login — Face ID</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.875rem', color: hasFaceId ? '#00e5c3' : pal.muted }}>
              {hasFaceId === null ? 'Checking…' : hasFaceId ? '✓ Face ID is enrolled — Smart Login active' : '✗ No Face ID enrolled yet'}
            </div>
            <button
              onClick={() => { setFaceError(''); setFaceInfo('Opening camera…'); setFaceOpen(true); }}
              style={{ ...btnPrimary, background: 'linear-gradient(135deg,rgba(0,229,195,.18),rgba(0,229,195,.3))', border: '1px solid rgba(0,229,195,.3)', color: '#00e5c3' }}
            >
              {hasFaceId ? 'Update Face ID' : 'Enroll Face ID'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Face modal ── */}
      {faceOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(3,8,16,.78)', zIndex: 1300, display: 'grid', placeItems: 'center', padding: '1rem' }} onClick={() => setFaceOpen(false)}>
          <div style={{ width: 'min(500px,96vw)', background: isDk ? '#0e1a33' : '#f0f4ff', border: `1px solid ${pal.cardBorder}`, borderRadius: '16px', padding: '1.5rem 1.6rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1rem', color: pal.text }}>{hasFaceId ? 'Update Face ID' : 'Enroll Face ID'}</div>
              <button onClick={() => setFaceOpen(false)} style={{ background: 'transparent', border: 'none', color: pal.muted, cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <video ref={faceVideoRef} autoPlay muted playsInline style={{ width: '100%', maxHeight: 280, borderRadius: '10px', background: '#02070f', border: '1px solid rgba(255,255,255,.1)', marginBottom: '0.8rem' }} />
            {faceInfo && <div style={{ fontSize: '0.82rem', color: '#9ff5e7', marginBottom: '0.6rem' }}>{faceInfo}</div>}
            {faceError && <div style={{ fontSize: '0.82rem', color: '#ff8aa2', marginBottom: '0.6rem' }}>{faceError}</div>}
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button onClick={scanAndEnroll} disabled={faceBusy} style={{ ...btnPrimary, flex: 1 }}>
                {faceBusy ? 'Scanning…' : 'Scan Face'}
              </button>
              <button onClick={() => setFaceOpen(false)} style={{ ...btnGhost, flex: 0.5 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
