import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/Login.css';

const FACE_MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
const FACE_API_CDN = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';

export default function Login() {
  const navigate = useNavigate();

  // page state
  const [isLogin, setIsLogin] = useState(true);

  // login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginRole, setLoginRole] = useState('student');
  const [remember, setRemember] = useState(false);
  const [loginEmailErr, setLoginEmailErr] = useState(false);
  const [loginPassErr, setLoginPassErr] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // register form
  const [regFirst, setRegFirst] = useState('');
  const [regLast, setRegLast] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirmPass, setRegConfirmPass] = useState('');
  const [regFaceDescriptor, setRegFaceDescriptor] = useState([]);
  const [regUni, setRegUni] = useState('');
  const [regDegree, setRegDegree] = useState('');
  const [regYear, setRegYear] = useState('');
  const [regRole, setRegRole] = useState('student');
  const [regEmailErr, setRegEmailErr] = useState(false);
  const [regPassErr, setRegPassErr] = useState(false);
  const [regStrength, setRegStrength] = useState(0);
  const [regLoading, setRegLoading] = useState(false);

  // smart login camera state
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [faceMode, setFaceMode] = useState('register');
  const [faceBusy, setFaceBusy] = useState(false);
  const [faceError, setFaceError] = useState('');
  const [faceInfo, setFaceInfo] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const faceApiRef = useRef(null);
  const modelsLoadedRef = useRef(false);

  // overlay
  const [overlay, setOverlay] = useState({show: false, title: '', msg: ''});

  const getDashboardRoute = (role) => {
    if (role === 'admin') return '/admin';
    if (role === 'tutor') return '/tutor';
    return '/student';
  };

  const getRoleFromToken = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || 'student';
    } catch (e) {
      return 'student';
    }
  };

  // cursor and hover animations
  useEffect(() => {
    const cO = document.getElementById('cO');
    const cI = document.getElementById('cI');
    const move = e => {
      cI.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
      cO.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
    };
    document.addEventListener('mousemove', move);

    const enter = () => { cO.querySelector('.cur-ring').style.cssText += 'width:52px;height:52px;opacity:.35;'; };
    const leave = () => { cO.querySelector('.cur-ring').style.cssText += 'width:34px;height:34px;opacity:.65;'; };
    const hoverEls = document.querySelectorAll('a,button,input,.pill,.role-btn,.remember');
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
  }, []);

  // password strength meter
  useEffect(() => {
    let score = 0;
    const v = regPass;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    setRegStrength(score);
  }, [regPass]);

  useEffect(() => () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // if already logged in, send to role-specific dashboard
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    navigate(getDashboardRoute(getRoleFromToken(token)));
  }, [navigate]);



  const switchTab = login => {
    setIsLogin(login);
    setOverlay({show: false, title: '', msg: ''});
  };

  const setRole = (role, panel) => {
    if (panel === 'login') setLoginRole(role);
    else setRegRole(role);
  };

  const toggleRemember = () => {
    setRemember(r => !r);
  };

  const togglePwd = id => {
    const inp = document.getElementById(id);
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const ensureFaceModels = async () => {
    if (modelsLoadedRef.current && faceApiRef.current) {
      return faceApiRef.current;
    }

    let faceapi = window.faceapi;

    if (!faceapi) {
      await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-face-api="true"]');
        if (existing) {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', reject, { once: true });
          return;
        }

        const script = document.createElement('script');
        script.src = FACE_API_CDN;
        script.async = true;
        script.dataset.faceApi = 'true';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load face-api script'));
        document.body.appendChild(script);
      });

      faceapi = window.faceapi;
    }

    if (!faceapi) {
      throw new Error('face-api is unavailable');
    }

    await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL);

    faceApiRef.current = faceapi;
    modelsLoadedRef.current = true;
    return faceapi;
  };

  const openFaceScanner = async mode => {
    setFaceMode(mode);
    setFaceError('');
    setFaceInfo('Opening camera...');
    setFaceModalOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setFaceInfo('Camera ready. Keep your face centered and click Scan Face.');
    } catch (err) {
      setFaceError('Could not access camera. Please allow camera permission.');
    }
  };

  const closeFaceScanner = () => {
    stopCamera();
    setFaceModalOpen(false);
    setFaceBusy(false);
    setFaceError('');
    setFaceInfo('');
  };

  const scanFace = async () => {
    setFaceBusy(true);
    setFaceError('');

    try {
      const faceapi = await ensureFaceModels();
      const video = videoRef.current;

      if (!video) {
        throw new Error('Video element missing');
      }

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error('No face detected. Please ensure your face is visible.');
      }

      const descriptor = Array.from(detection.descriptor).map(v => Number(v.toFixed(8)));

      if (faceMode === 'register') {
        setRegFaceDescriptor(descriptor);
        setFaceInfo('Face captured successfully. Continue registration now.');
        setTimeout(() => closeFaceScanner(), 600);
      } else {
        const payload = { faceDescriptor: descriptor };
        if (loginEmail.trim()) {
          payload.email = loginEmail.trim();
        }

        const res = await api.post('/auth/face-login', {
          ...payload
        });

        const { token, role } = res.data;
        localStorage.setItem('token', token);
        window.dispatchEvent(new Event('auth-changed'));
        closeFaceScanner();
        setOverlay({ show: true, title: 'Smart Login successful', msg: 'Redirecting to your dashboard…' });
        setTimeout(() => {
          navigate(getDashboardRoute(role));
        }, 1200);
      }
    } catch (err) {
      setFaceError(err?.response?.data?.message || err.message || 'Face scan failed');
    } finally {
      setFaceBusy(false);
    }
  };

  const handleLogin = async () => {
    // no client-side validation; submit whatever the user enters
    setLoginEmailErr(false);
    setLoginPassErr(false);

    setLoginLoading(true);
    try {
      const res = await api.post('/auth/login', { email: loginEmail, password: loginPass });
      const { token, role } = res.data;
      localStorage.setItem('token', token);
      window.dispatchEvent(new Event('auth-changed'));
      setOverlay({ show: true, title: 'Welcome back!', msg: 'Redirecting to your dashboard…' });
      setTimeout(() => {
        navigate(getDashboardRoute(role));
      }, 1500);
    } catch (err) {
      // display server error if desired
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async () => {
    // no validation at all
    setRegEmailErr(false);
    setRegPassErr(false);

    if (regPass !== regConfirmPass) {
      setRegPassErr(true);
      return;
    }

    if (regRole === 'tutor' && regFaceDescriptor.length === 0) {
      setOverlay({ show: true, title: 'Face ID required', msg: 'Please add your Face ID to register as a tutor.' });
      setTimeout(() => setOverlay({ show: false, title: '', msg: '' }), 2200);
      return;
    }

    setRegLoading(true);
    try {
      await api.post('/auth/register', {
        firstName: regFirst,
        lastName: regLast,
        name: `${regFirst} ${regLast}`.trim(),
        email: regEmail,
        password: regPass,
        faceDescriptor: regFaceDescriptor,
        role: regRole,
        university: regUni,
        degreeProgram: regDegree,
        year: regYear ? Number(regYear) : undefined
      });
      setOverlay({ show: true, title: 'Account created!', msg: 'Setting up your profile…' });
      setTimeout(() => {
        setIsLogin(true);
      }, 2000);
    } catch (err) {
      // ignore or handle server error
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="layout">
      <div className="left">
        <div className="left-bg"></div>
        <div className="logo">
          <div className="logo-icon">✦</div>
          UniConnect
        </div>
        <div className="left-hero">
          <div className="left-badge">
            <span className="badge-dot"></span> Intelligent Platform
          </div>
          <h2 className="left-title">
            Your campus,<br />
            <em>amplified.</em>
          </h2>
          <p className="left-sub">
            Connect with the right peers, book tutors in seconds, and get wellness support — all in one intelligent space designed for students.
          </p>
          <div className="feat-pills">
            <div className="pill">
              <div className="pill-icon pi-blue">🔗</div>
              <div className="pill-text">
                <strong>Smart Peer Matching</strong>
                AI-powered compatibility across courses & schedules
              </div>
            </div>
            <div className="pill">
              <div className="pill-icon pi-cyan">📅</div>
              <div className="pill-text">
                <strong>Zero-Conflict Booking</strong>
                Real-time tutor availability with instant confirmation
              </div>
            </div>
            <div className="pill">
              <div className="pill-icon pi-green">🧠</div>
              <div className="pill-text">
                <strong>Wellness Intelligence</strong>
                Proactive stress detection & adaptive support
              </div>
            </div>
          </div>
        </div>
        <div className="stats-row">
          <div className="stat">
            <div className="stat-n">40%</div>
            <div className="stat-l">Efficiency gain</div>
          </div>
          <div className="stat">
            <div className="stat-n">3×</div>
            <div className="stat-l">Faster booking</div>
          </div>
          <div className="stat">
            <div className="stat-n">↓62%</div>
            <div className="stat-l">Student stress</div>
          </div>
        </div>
      </div>
      <div className="right">
        <div className="form-box" style={{ position: 'relative' }}>
          {overlay.show && (
            <div className="success-overlay show" id="successOverlay">
              <div className="success-check">✓</div>
              <h3>{overlay.title}</h3>
              <p>{overlay.msg}</p>
            </div>
          )}
          <div className="form-header">
            <h1 id="formTitle">{isLogin ? 'Welcome back' : 'Join UniConnect'}</h1>
            <p id="formSub">
              {isLogin ? (
                <>Don't have an account? <button type="button" className="link-btn" onClick={() => switchTab(false)}>Create one free</button></>
              ) : (
                <>Already have an account? <button type="button" className="link-btn" onClick={() => switchTab(true)}>Sign in</button></>
              )}
            </p>
          </div>
          <div className="tabs">
            <button className={`tab ${isLogin ? 'active' : ''}`} onClick={() => switchTab(true)}>
              Sign In
            </button>
            <button className={`tab ${!isLogin ? 'active' : ''}`} onClick={() => switchTab(false)}>
              Register
            </button>
          </div>
          {/* login panel */}
          <div className={`form-panel ${isLogin ? 'active' : ''}`} id="panelLogin">
            <div className="socials">
              <button type="button" className="social-btn">
                {/* google svg omitted for brevity, we can reuse same markup */}
                <svg viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.20-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.70 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.70 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.60 3.30-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google
              </button>
              <button type="button" className="social-btn">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                GitHub
              </button>
            </div>
            <div className="divider">or continue with email</div>
            <div className="role-select" id="loginRoles">
              <button className={`role-btn ${loginRole==='student'?'active':''}`} onClick={() => setRole('student','login')}>
                <span className="role-dot"></span> 🎓 Student
              </button>
              <button className={`role-btn ${loginRole==='tutor'?'active':''}`} onClick={() => setRole('tutor','login')}>
                <span className="role-dot"></span> 📚 Tutor
              </button>
            </div>
            <div className="field">
              <label>Personal Email</label>
              <div className="input-wrap">
                <span className="input-icon">✉</span>
                <input
                  type="email"
                  id="loginEmail"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  className={loginEmailErr ? 'err' : ''}
                />
              </div>
              <div className={`field-error ${loginEmailErr ? 'show' : ''}`} id="loginEmailErr">
                Please enter your email
              </div>
            </div>
            <div className="field">
              <label>Password</label>
              <div className="input-wrap">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  id="loginPass"
                  className={`has-toggle ${loginPassErr ? 'err' : ''}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                />
                <button
                  className="input-toggle"
                  onClick={() => togglePwd('loginPass')}
                  tabIndex="-1"
                >👁</button>
              </div>
              <div className={`field-error ${loginPassErr ? 'show' : ''}`} id="loginPassErr">
                Password must be at least 8 characters
              </div>
            </div>
            <div className="row">
              <div className={`remember ${remember ? 'active' : ''}`} id="rememberMe" onClick={toggleRemember}>
                <div className="check-box"><span className="check-tick">✓</span></div>
                <span className="remember-label">Remember me</span>
              </div>
              <a href="/forgot-password" className="forgot">Forgot password?</a>
            </div>
            <button className={`btn-submit ${loginLoading ? 'loading' : ''}`} id="loginBtn" onClick={handleLogin}>
              <span className="btn-text">Sign In to UniConnect</span>
              <div className="spinner"></div>
            </button>
            <button className="btn-smart" type="button" onClick={() => openFaceScanner('login')}>
              Smart Login (Face ID)
            </button>
          </div>
          {/* register panel */}
          <div className={`form-panel ${!isLogin ? 'active' : ''}`} id="panelReg">
            <div className="socials">
              <button type="button" className="social-btn">
                <svg viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.20-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.70 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.70 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.60 3.30-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google
              </button>
              <button type="button" className="social-btn">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                GitHub
              </button>
            </div>
            <div className="divider">or register with email</div>
            <div className="role-select" id="regRoles">
              <button className={`role-btn ${regRole==='student'?'active':''}`} onClick={() => setRole('student','reg')}>
                <span className="role-dot"></span> 🎓 Student
              </button>
              <button className={`role-btn ${regRole==='tutor'?'active':''}`} onClick={() => setRole('tutor','reg')}>
                <span className="role-dot"></span> 📚 Tutor
              </button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.6rem'}}>
              <div className="field">
                <label>First Name</label>
                <div className="input-wrap">
                  <span className="input-icon">👤</span>
                  <input type="text" id="regFirst" placeholder="Alex" value={regFirst} onChange={e => setRegFirst(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>Last Name</label>
                <div className="input-wrap">
                  <span className="input-icon" style={{left:'.7rem'}}>👤</span>
                  <input type="text" id="regLast" placeholder="Jordan" value={regLast} onChange={e => setRegLast(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="field">
              <label>Personal Email</label>
              <div className="input-wrap">
                <span className="input-icon">✉</span>
                <input
                  type="email"
                  id="regEmail"
                  placeholder="you@example.com"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  className={regEmailErr ? 'err' : ''}
                />
              </div>
              <div className={`field-error ${regEmailErr ? 'show' : ''}`} id="regEmailErr">
                Please enter your email
              </div>
            </div>
            <div className="field">
              <label>Password</label>
              <div className="input-wrap">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  id="regPass"
                  className={`has-toggle ${regPassErr ? 'err' : ''}`}
                  placeholder="Min 8 characters"
                  value={regPass}
                  onChange={e => setRegPass(e.target.value)}
                />
                <button className="input-toggle" onClick={() => togglePwd('regPass')} tabIndex="-1">👁</button>
              </div>
              <div style={{marginTop:'.5rem',display:'flex',gap:'3px'}} id="strengthBars">
                {[0,1,2,3].map(i => (
                  <div
                    key={i}
                    style={{
                      flex:1,
                      height:3,
                      borderRadius:'99px',
                      background: i < regStrength ? ['#FF5272','#FF9800','#FBBC05','#00E5C3'][regStrength - 1] : 'rgba(255,255,255,.08)',
                      transition: 'background .3s',
                    }}
                  />
                ))}
              </div>
              <div style={{fontSize:'.7rem',color: regStrength ? ['#FF5272','#FF9800','#FBBC05','#00E5C3'][regStrength - 1] : 'rgba(255,255,255,.3)', marginTop:'.25rem'}} id="strengthLabel">
                {[null,'Weak','Fair','Good','Strong'][regStrength]}
              </div>
              <div className={`field-error ${regPassErr ? 'show' : ''}`} id="regPassErr">
                Password must be at least 8 characters
              </div>
            </div>
            <div className="field" style={{marginBottom:'1rem'}}>
              <label>Confirm Password</label>
              <div className="input-wrap">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  id="regConfirmPass"
                  className={`has-toggle ${regPassErr ? 'err' : ''}`}
                  placeholder="Re-enter password"
                  value={regConfirmPass}
                  onChange={e => setRegConfirmPass(e.target.value)}
                />
                <button className="input-toggle" onClick={() => togglePwd('regConfirmPass')} tabIndex="-1">👁</button>
              </div>
            </div>
            <div className="field" style={{marginBottom:'1.4rem'}}>
              <label>University <span className="opt">(optional)</span></label>
              <div className="input-wrap">
                <span className="input-icon">🏫</span>
                <input type="text" id="regUni" placeholder="e.g. University of Melbourne" value={regUni} onChange={e => setRegUni(e.target.value)} />
              </div>
            </div>
            {regRole === 'student' && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.6rem',marginBottom:'1.4rem'}}>
                <div className="field">
                  <label>Degree Program <span className="opt">(optional)</span></label>
                  <div className="input-wrap">
                    <span className="input-icon">📘</span>
                    <input type="text" id="regDegree" placeholder="e.g. IT" value={regDegree} onChange={e => setRegDegree(e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>Year <span className="opt">(optional)</span></label>
                  <div className="input-wrap">
                    <span className="input-icon">🎓</span>
                    <input type="number" id="regYear" placeholder="1" value={regYear} onChange={e => setRegYear(e.target.value)} />
                  </div>
                </div>
              </div>
            )}
            <div className="field" style={{marginBottom:'1.4rem'}}>
              <label>Smart Login Face</label>
              <button className="btn-smart" type="button" onClick={() => openFaceScanner('register')}>
                Add your face for smart login
              </button>
              <div className="face-enroll-note">
                {regFaceDescriptor.length > 0
                  ? 'Face enrolled successfully. You can now register.'
                  : 'No face enrolled yet. Add face to enable smart login.'}
              </div>
            </div>
            <button className={`btn-submit ${regLoading ? 'loading' : ''}`} id="regBtn" onClick={handleRegister}>
              <span className="btn-text">Create My Account →</span>
              <div className="spinner"></div>
            </button>
            <p style={{fontSize:'.72rem',color:'rgba(255,255,255,.25)',textAlign:'center',marginTop:'1rem',lineHeight:1.6}}>
              By registering you agree to our <a href="/terms" style={{color:'var(--azure)',textDecoration:'none'}}>Terms of Service</a> and <a href="/privacy" style={{color:'var(--azure)',textDecoration:'none'}}>Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>

      {faceModalOpen && (
        <div className="face-modal-backdrop">
          <div className="face-modal">
            <h3>{faceMode === 'register' ? 'Enroll Face for Smart Login' : 'Smart Login'}</h3>
            <video ref={videoRef} autoPlay muted playsInline className="face-video" />
            {faceInfo ? <div className="face-info">{faceInfo}</div> : null}
            {faceError ? <div className="face-error">{faceError}</div> : null}
            <div className="face-actions">
              <button className="btn-smart" type="button" onClick={scanFace} disabled={faceBusy}>
                {faceBusy ? 'Scanning...' : 'Scan Face'}
              </button>
              <button className="btn-cancel" type="button" onClick={closeFaceScanner}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* cursor elements */}
      <div className="cur" id="cO"><div className="cur-ring"></div></div>
      <div className="cur" id="cI"><div className="cur-dot"></div></div>
      {/* orbs */}
      <div className="orb o1"></div>
      <div className="orb o2"></div>
      <div className="orb o3"></div>
    </div>
  );
}

