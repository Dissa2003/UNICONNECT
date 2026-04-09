import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/HomePage.css';
import Navbar from '../components/Navbar';

export default function HomePage() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const syncAuthState = () => setIsLoggedIn(!!localStorage.getItem('token'));
    window.addEventListener('storage', syncAuthState);
    window.addEventListener('auth-changed', syncAuthState);

    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener('auth-changed', syncAuthState);
    };
  }, []);

  useEffect(() => {
    const blockProtectedActions = (event) => {
      if (isLoggedIn) return;

      const target = event.target.closest('a, button');
      if (!target) return;

      if (target.classList.contains('allow-public-action') || target.classList.contains('nav-login')) {
        return;
      }

      event.preventDefault();
      navigate('/login');
    };

    document.addEventListener('click', blockProtectedActions);
    return () => document.removeEventListener('click', blockProtectedActions);
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    // Custom cursor
    const outer = document.getElementById('cursorOuter');
    const inner = document.getElementById('cursorInner');
    document.addEventListener('mousemove', e => {
      inner.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      outer.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    });

    document.querySelectorAll('a, button, .feat-card, .step, .wcard, .stat-card').forEach(el => {
      el.addEventListener('mouseenter', () => {
        outer.querySelector('.cursor-ring').style.cssText += 'width:60px;height:60px;opacity:.4;';
      });
      el.addEventListener('mouseleave', () => {
        outer.querySelector('.cursor-ring').style.cssText += 'width:36px;height:36px;opacity:.7;';
      });
    });

    // Reveal on scroll
    const reveals = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 80);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(r => io.observe(r));

    // Counter animation
    document.querySelectorAll('.stat-num').forEach(el => {
      const io2 = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        io2.unobserve(el);
        el.style.transition = 'opacity .5s';
        el.style.opacity = '0';
        setTimeout(() => { el.style.opacity = '1'; }, 200);
      }, { threshold: 0.5 });
      io2.observe(el);
    });

    return () => {
      document.removeEventListener('mousemove', () => {});
    };
  }, []);

  return (
    <>
      {/* Cursor */}
      <div className="cursor" id="cursorOuter"><div className="cursor-ring"></div></div>
      <div className="cursor" id="cursorInner"><div className="cursor-dot"></div></div>

      {/* Orbs */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>

      {/* NAV */}
      <Navbar />

      {/* HERO */}
      <section className="hero">
        <div className="hero-badge"><span></span> Intelligent Student Support Platform</div>
        <h1 className="hero-title">
          Connect, Collaborate,<br />
          <em>Thrive Together</em>
        </h1>
        <p className="hero-sub">
          UniConnect unifies peer matching, tutor booking, shared resources, and wellness intelligence into one seamless academic experience — so students spend less time coordinating and more time learning.
        </p>
        <div className="hero-actions">
          <a href="#how" className="btn-primary allow-public-action">
            <span>Start a Demo</span>
            <span>→</span>
          </a>
          <a href="/" className="btn-ghost" style={{ color: '#000' }}>
            <span>▶</span>
            <span>Watch Demo</span>
          </a>
        </div>
      </section>

      {/* STATS */}
      <div className="stats-strip">
        <div className="stat-card">
          <div className="stat-num">40%</div>
          <div className="stat-label">Collaboration Efficiency Gain</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">3×</div>
          <div className="stat-label">Faster Tutor Booking</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">98%</div>
          <div className="stat-label">Scheduling Conflict Resolution</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">↓62%</div>
          <div className="stat-label">Reported Stress Levels</div>
        </div>
      </div>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="features-header reveal">
          <div className="section-label">Core Features</div>
          <h2>Everything a student needs, unified</h2>
          <p>Five intelligent modules working in harmony — from smart peer matching to proactive wellness detection, all in one coherent platform.</p>
        </div>

        <div className="features-grid reveal">
          <div className="feat-card">
            <div className="feat-icon blue">🔗</div>
            <h3>Smart Peer Matching</h3>
            <p>Profile-based compatibility scoring using academic attributes, learning styles, timezone, and workload — with explainable match results for instructor review.</p>
            <span className="feat-tag">AI · ML</span>
          </div>
          <div className="feat-card">
            <div className="feat-icon cyan">📅</div>
            <h3>Intelligent Tutor Booking</h3>
            <p>Automated availability reconciliation with real-time conflict detection, WebSocket-powered locking, and multi-channel notifications. Zero double-bookings.</p>
            <span className="feat-tag">Real-time</span>
          </div>
          <div className="feat-card">
            <div className="feat-icon green">🤝</div>
            <h3>Collaborative Learning Space</h3>
            <p>Sync & async study rooms with shared task boards, low-latency whiteboard, code-sharing via WebRTC, and versioned docs with semantic tagging.</p>
            <span className="feat-tag">WebRTC · Live</span>
          </div>
          <div className="feat-card">
            <div className="feat-icon purple">🔍</div>
            <h3>Smart Reference Engine</h3>
            <p>Centralized knowledge layer with NLP tagging, embedding-based semantic search, knowledge graphs, and contextual reranking across all course materials.</p>
            <span className="feat-tag">NLP · Semantic</span>
          </div>
          <div className="feat-card">
            <div className="feat-icon amber">🧠</div>
            <h3>Stress Management Intelligence</h3>
            <p>Privacy-first wellness layer evaluating stress risk via passive signals, workload analytics, and adaptive micro-interventions — with counselor escalation paths.</p>
            <span className="feat-tag">Wellness · AI</span>
          </div>
          <div className="feat-card">
            <div className="feat-icon rose">⚡</div>
            <h3>Unified Event Bus</h3>
            <p>Service-oriented architecture with REST, GraphQL, and WebSocket APIs — each module independent yet seamlessly coordinated via a shared event-driven backbone.</p>
            <span className="feat-tag">Microservices</span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how" id="how">
        <div className="how-inner">
          <div>
            <div className="section-label reveal">How It Works</div>
            <h2 className="reveal" style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(2rem,4vw,3rem)",fontWeight:"800",letterSpacing:"-.04em",lineHeight:"1.05",marginBottom:"3rem"}}>
              From signup to<br />collaboration in minutes
            </h2>
            <div className="how-steps">
              <div className="step reveal">
                <div className="step-num">01</div>
                <div>
                  <div className="step-title">Build your academic profile</div>
                  <div className="step-desc">Add courses, learning preferences, availability windows and your timezone. The more context you provide, the smarter your matches become.</div>
                </div>
              </div>
              <div className="step reveal">
                <div className="step-num">02</div>
                <div>
                  <div className="step-title">Get matched instantly</div>
                  <div className="step-desc">Our weighted scoring model evaluates similarity and complementarity across skill sets, study habits, and schedules — returning ranked matches with explanations.</div>
                </div>
              </div>
              <div className="step reveal">
                <div className="step-num">03</div>
                <div>
                  <div className="step-title">Collaborate in study rooms</div>
                  <div className="step-desc">Jump into shared workspaces with task boards, live whiteboards, co-editing, and a shared resource library — all synced in real time.</div>
                </div>
              </div>
              <div className="step reveal">
                <div className="step-num">04</div>
                <div>
                  <div className="step-title">Stay supported & stress-free</div>
                  <div className="step-desc">Passive signals and periodic check-ins feed our wellness model, which surfaces gentle nudges and escalates to professional support when needed.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Visual panel */}
          <div className="how-visual reveal">
            <div className="vis-card vis-main">
              <div>
                <div className="vis-main-title">Match Score</div>
                <div className="vis-score">94.2</div>
                <div style={{fontSize:".8rem",color:"rgba(255,255,255,.4)",marginTop:".2rem"}}>Compatibility index · Alex & Jordan</div>
              </div>
              <div className="vis-bars">
                <div className="vis-bar-row">
                  <div className="vis-bar-label">Subject overlap</div>
                  <div className="vis-bar-track"><div className="vis-bar-fill b1" style={{width:"92%"}}></div></div>
                </div>
                <div className="vis-bar-row">
                  <div className="vis-bar-label">Schedule match</div>
                  <div className="vis-bar-track"><div className="vis-bar-fill b2" style={{width:"87%"}}></div></div>
                </div>
                <div className="vis-bar-row">
                  <div className="vis-bar-label">Learning style</div>
                  <div className="vis-bar-track"><div className="vis-bar-fill b3" style={{width:"95%"}}></div></div>
                </div>
                <div className="vis-bar-row">
                  <div className="vis-bar-label">Workload balance</div>
                  <div className="vis-bar-track"><div className="vis-bar-fill b4" style={{width:"78%"}}></div></div>
                </div>
              </div>
            </div>

            <div className="vis-card vis-float-1">
              <div className="mini-tag">Booking Confirmed</div>
              <div className="mini-val">2:30 PM</div>
              <div className="mini-sub">Dr. Reyes · Linear Algebra</div>
              <div className="mini-pill"><div className="dot-green"></div> No conflicts detected</div>
            </div>

            <div className="vis-card vis-float-2">
              <div className="mini-tag">Wellness Alert</div>
              <div className="mini-val" style={{background:"linear-gradient(90deg,#ff6b8a,#ffb347)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>Low risk</div>
              <div className="mini-sub">Stress index stable · Week 7</div>
              <div className="mini-pill" style={{background:"rgba(255,107,138,.1)",borderColor:"rgba(255,107,138,.2)",color:"#ff8fab"}}><div className="dot-green" style={{background:"#ff8fab"}}></div> Nudge sent</div>
            </div>
          </div>
        </div>
      </section>

      {/* WELLNESS */}
      <section className="wellness" id="wellness">
        <div className="wellness-inner">
          <div className="section-label reveal" style={{justifyContent:"center"}}>Wellbeing First</div>
          <div className="reveal">
            <h2>Academic support that <em style={{fontStyle:"normal",background:"linear-gradient(90deg,var(--azure),var(--aqua))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>cares</em></h2>
            <p>UniConnect's lightweight, privacy-first wellness layer watches for stress signals before they become crises — so students feel supported, not surveilled.</p>
          </div>
          <div className="wellness-cards reveal">
            <div className="wcard">
              <div className="wcard-icon">🌡️</div>
              <h4>Mood Tracking</h4>
              <p>Periodic low-friction prompts combined with passive engagement signals to build an honest picture of student wellbeing over time.</p>
            </div>
            <div className="wcard">
              <div className="wcard-icon">📊</div>
              <h4>Stress Scoring</h4>
              <p>Multi-factor model combining deadline proximity, participation trends, workload spikes, and self-reports into a single actionable index.</p>
            </div>
            <div className="wcard">
              <div className="wcard-icon">💬</div>
              <h4>Adaptive Support</h4>
              <p>Study-break suggestions, peer nudges, and automatic counselor referrals when thresholds are exceeded — always privacy-respecting.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-box reveal">
          <div className="hero-badge" style={{margin:"0 auto 1.5rem",display:"inline-flex"}}>✦ Now in Early Access</div>
          <h2>Ready to transform your<br />academic experience?</h2>
          <p>Join thousands of students already using UniConnect to collaborate smarter, book tutors faster, and stay mentally well throughout their degree.</p>
          <div className="email-row">
            <input className="email-input" type="email" placeholder="your@university.edu" />
            <a href="/login" className="btn-primary" style={{whiteSpace:"nowrap"}}>Get Access →</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="logo"><div className="logo-icon">✦</div> UniConnect</div>
        <div className="footer-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/docs">Docs</a>
          <a href="/contact">Contact</a>
        </div>
        <div className="footer-copy">© 2025 UniConnect. All rights reserved.</div>
      </footer>
    </>
  );
}
