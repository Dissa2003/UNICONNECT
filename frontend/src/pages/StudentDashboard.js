/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useTheme } from '../ThemeContext';
import BreathingExercise from '../components/BreathingExercise';
import MeditationTimer from '../components/MeditationTimer';
import StressHistoryChart from '../components/StressHistoryChart';
import JournalForm from '../components/journal/JournalForm';
import JournalList from '../components/journal/JournalList';
import CalendarFilter from '../components/journal/CalendarFilter';
import JournalSummary from '../components/journal/JournalSummary';
import { isSameDay, isSameMonth, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
import '../styles/MoodJournal.css';

const FACE_MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
const FACE_API_CDN = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';

export default function StudentDashboard(){
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  const [profile, setProfile] = useState({
    university:'', degreeProgram:'', year:'', personalityType:'',
    subjects:[], weakSubjects:[], strongSubjects:[], skills:[],
    studyGoals:[], careerGoals:[], examGoals:[],
    learningStyle:'', productivityTime:'', studyMode:'',
    interests:[], tags:[], availability: {}
  });

  const [editState, setEditState] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({show:false, msg:'', isError:false});
  const [currentSection, setCurrentSection] = useState('overview');
  const [avatarEmoji, setAvatarEmoji] = useState('🎓');
  const [userAvatar, setUserAvatar] = useState('');
  const [matches, setMatches] = useState([]); // matching group data
  const [tutorQuery, setTutorQuery] = useState({
    subject: '',
    maxBudget: '',
    learningStyle: '',
    language: 'English',
    availability: {},
  });
  const [tutorMatches, setTutorMatches] = useState([]);
  const [findingTutors, setFindingTutors] = useState(false);
  const [bookingTutorIds, setBookingTutorIds] = useState({});
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [groupRequests, setGroupRequests] = useState([]);
  const [detailsPopup, setDetailsPopup] = useState({ show: false, invitee: null, request: null });
  const [manualMatchChecked, setManualMatchChecked] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteMethod, setDeleteMethod] = useState('password');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [faceDeleteOpen, setFaceDeleteOpen] = useState(false);
  const [faceDeleteBusy, setFaceDeleteBusy] = useState(false);
  const [faceDeleteError, setFaceDeleteError] = useState('');
  // face enroll (Smart Login setup)
  const [hasFaceId, setHasFaceId] = useState(null); // null = loading, true/false = known
  const [faceEnrollOpen, setFaceEnrollOpen] = useState(false);
  const [faceEnrollBusy, setFaceEnrollBusy] = useState(false);
  const [faceEnrollError, setFaceEnrollError] = useState('');
  const [faceEnrollInfo, setFaceEnrollInfo] = useState('');
  const enrollVideoRef = useRef(null);
  const enrollStreamRef = useRef(null);
  // defaults ≈ dataset means: anxiety=11,self_esteem=18,mh_history=0,depression=13,headache=3,bp=2,sleep=3,breathing=3,noise=3,living=3,safety=3,basic=3,academic=3,load=3,teacher=3,career=3,social=2,peer=3,extra=3,bullying=3
  const [wellnessAnswers, setWellnessAnswers] = useState([11, 18, 0, 13, 3, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 3, 3, 3]);
  const [stressResult, setStressResult] = useState(null);
  const [stressLoading, setStressLoading] = useState(false);
  const [activeRelaxTool, setActiveRelaxTool] = useState(null); // null | 'breathing' | 'meditation'
  const [stressHistory, setStressHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [wellnessTab, setWellnessTab] = useState('wellness'); // 'wellness' | 'relaxation' | 'history'
  const [breathingView, setBreathingView] = useState('exercise');  // null | 'video' | 'exercise'
  const [meditationView, setMeditationView] = useState(null); // null | 'video' | 'timer'
  const [relaxView, setRelaxView] = useState('breathing-exercise'); // 'breathing-exercise'|'breathing-video'|'meditation-timer'|'meditation-video'
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const [filterMode, setFilterMode] = useState('day'); // 'day' | 'week' | 'month'
  const [viewDate, setViewDate] = useState(new Date());
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const faceApiRef = useRef(null);
  const modelsLoadedRef = useRef(false);

  // Body background / color — mirrors what TutorNav.js does on tutor pages
  useEffect(() => {
    const prevBg    = document.body.style.background;
    const prevColor = document.body.style.color;
    document.body.style.background = theme === 'light' ? '#f0f4ff' : '#0A0E1A';
    document.body.style.color      = theme === 'light' ? '#0d1b3e' : '#FFFFFF';
    return () => {
      document.body.style.background = prevBg;
      document.body.style.color      = prevColor;
    };
  }, [theme]);

  // Load profile and face status on mount
  useEffect(() => {
    loadProfile();
    loadFaceStatus();
    api.get('/users/me').then(r => setUserAvatar(r.data.avatar || '')).catch(() => {});
  }, []);

  useEffect(() => {
    const sectionParam = searchParams.get('section');
    if (sectionParam) setCurrentSection(sectionParam);
  }, [searchParams]);

  // Fetch stress history whenever the wellness section becomes active
  useEffect(() => {
    if (currentSection !== 'wellness') return;
    setHistoryLoading(true);
    api.get('/stress/history')
      .then(r => setStressHistory(r.data.records || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [currentSection]);

  // Fetch journal entries when mood-journal section is active
  useEffect(() => {
    if (currentSection !== 'mood-journal') return;
    fetchJournalEntries();
  }, [currentSection]);

  const fetchJournalEntries = async () => {
    setJournalLoading(true);
    try {
      const res = await api.get('/journal');
      setJournalEntries(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch journal entries', err);
      showToast('Could not load journal entries', true);
    } finally {
      setJournalLoading(false);
    }
  };

  const handleAddJournalEntry = async (moodText) => {
    try {
      const res = await api.post('/journal', { moodText });
      const { data } = res.data;
      setJournalEntries([data, ...journalEntries]);
      showToast('Mood journal updated ✨');
    } catch (err) {
      showToast('Failed to save journal entry', true);
      throw err;
    }
  };

  const handleDeleteJournalEntry = async (id) => {
    try {
      await api.delete(`/journal/${id}`);
      setJournalEntries(journalEntries.filter(entry => entry._id !== id));
      showToast('Entry removed');
    } catch (err) {
      showToast('Failed to delete entry', true);
    }
  };

  // when profile first arrives (has an _id) fetch only group request list
  const hasFetchedGroupRequestsRef = useRef(false);
  useEffect(() => {
    if (!profile || !profile._id) return;
    if (hasFetchedGroupRequestsRef.current) return;
    hasFetchedGroupRequestsRef.current = true;
    fetchGroupRequests();
  }, [profile._id]);

  // custom cursor and hover animations (match Login/HomePage behavior)
  // run again when loading finishes so that the cursor elements are in the DOM
  useEffect(() => {
    const cO = document.getElementById('cO');
    const cI = document.getElementById('cI');
    // if elements aren't yet rendered we simply skip; effect will run again
    if (!cO || !cI) return;
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
  }, [loading]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get('/profile/me');
      if (res.data) {
        setProfile({...profile, ...res.data});
      }
    } catch (err) {
      console.log('No profile yet');
    } finally {
      setLoading(false);
    }
  };

  const loadFaceStatus = async () => {
    try {
      const res = await api.get('/auth/face-status');
      setHasFaceId(res.data.enrolled);
    } catch (err) {
      setHasFaceId(false);
    }
  };

  const openFaceEnroll = async () => {
    setFaceEnrollError('');
    setFaceEnrollInfo('Opening camera...');
    setFaceEnrollOpen(true);
  };

  const closeFaceEnroll = () => {
    if (enrollStreamRef.current) {
      enrollStreamRef.current.getTracks().forEach(t => t.stop());
      enrollStreamRef.current = null;
    }
    setFaceEnrollOpen(false);
    setFaceEnrollBusy(false);
    setFaceEnrollError('');
    setFaceEnrollInfo('');
  };

  const enrollFace = async () => {
    setFaceEnrollBusy(true);
    setFaceEnrollError('');
    try {
      const faceapi = await ensureFaceModels();
      const video = enrollVideoRef.current;
      if (!video) throw new Error('Camera is not ready');
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!detection) throw new Error('No face detected. Keep your face centered and try again.');
      const descriptor = Array.from(detection.descriptor).map(v => Number(v.toFixed(8)));
      await api.post('/auth/update-face', { faceDescriptor: descriptor });
      setHasFaceId(true);
      setFaceEnrollInfo('Face ID enrolled successfully! You can now use Smart Login.');
      setTimeout(() => closeFaceEnroll(), 1800);
    } catch (err) {
      setFaceEnrollError(err?.response?.data?.message || err.message || 'Face scan failed');
    } finally {
      setFaceEnrollBusy(false);
    }
  };

  const showToast = (msg, isError=false) => {
    setToast({show:true, msg, isError});
    setTimeout(() => setToast({...toast, show:false}), 3000);
  };

  const updateProfile = async (updates) => {
    try {
      const res = await api.post('/profile', updates);
      setProfile({...profile, ...updates});
      showToast('Changes saved ✓');
      return true;
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving', true);
      return false;
    }
  };

  const toggleEdit = (section) => {
    setEditState({...editState, [section]: !editState[section]});
  };

  const saveFieldValue = (fieldName, value) => {
    updateProfile({[fieldName]: value});
    setEditState({...editState, [fieldName]: false});
  };

  const addTag = (arrayName, value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (trimmed.length > 50) {
      showToast('Entry must be 50 characters or fewer', true);
      return;
    }
    if ((profile[arrayName] || []).some(v => v.toLowerCase() === trimmed.toLowerCase())) {
      showToast('This entry has already been added', true);
      return;
    }
    // when adding strong/weak we require the value already exists in subjects
    if ((arrayName === 'strongSubjects' || arrayName === 'weakSubjects') && !profile.subjects.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Add the subject to current subjects first', true);
      return;
    }
    const updated = [...(profile[arrayName] || []), trimmed];
    let extra = {};
    // adding a subject doesn't need immediate filtering, but ensure subsets remain valid
    if (arrayName === 'subjects') {
      // no-op; strong/weak will be cleaned when subjects are removed later
    }
    setProfile({...profile, [arrayName]: updated, ...extra});
    updateProfile({[arrayName]: updated, ...extra});
  };

  const removeTag = (arrayName, index) => {
    const updated = profile[arrayName].filter((_, i) => i !== index);
    let extra = {};
    if (arrayName === 'subjects') {
      // filter strong/weak lists to keep them as subsets
      extra.strongSubjects = profile.strongSubjects.filter(s => updated.includes(s));
      extra.weakSubjects = profile.weakSubjects.filter(s => updated.includes(s));
    }
    setProfile({...profile, [arrayName]: updated, ...extra});
    updateProfile({[arrayName]: updated, ...extra});
  };

  const selectOption = (optionName, value) => {
    saveFieldValue(optionName, value);
  };

  const toggleAvailability = (day, time) => {
    const key = `${day}-${time}`;
    const updated = {...profile.availability, [key]: !profile.availability[key]};
    setProfile({...profile, availability: updated});
    // persist immediately so student sees database change without needing Save button
    updateProfile({availability: updated});
  };

  const saveAvailability = () => {
    updateProfile({availability: profile.availability});
  };

  const fetchMatches = async (isManual = false) => {
    try {
      const res = await api.get(`/match/${profile._id}/top-matches`);
      const foundMatches = (res.data || []).slice(0, 5);
      setMatches(foundMatches);

      if (isManual) {
        setManualMatchChecked(true);
        if (foundMatches.length === 0) {
          showToast('Sorry, no matched students', true);
        } else {
          showToast(`${foundMatches.length} matched student${foundMatches.length > 1 ? 's' : ''} found`);
        }
      }
    } catch (err) {
      console.log('unable to fetch matches', err.response?.data || err.message);
      if (isManual) {
        setManualMatchChecked(true);
        showToast('Sorry, no matched students', true);
      }
    }
  };

  const fetchGroupRequests = async () => {
    try {
      const res = await api.get('/match/group-requests/me');
      setGroupRequests(res.data || []);
    } catch (err) {
      console.log('unable to fetch group requests', err.response?.data || err.message);
    }
  };

  const toggleTutorAvailability = (day, time) => {
    const key = `${day}-${time}`;
    setTutorQuery((prev) => ({
      ...prev,
      availability: {
        ...prev.availability,
        [key]: !prev.availability[key],
      },
    }));
  };

  const fetchTutorMatches = async () => {
    if (!profile?._id) {
      showToast('Please complete your student profile first', true);
      return;
    }
    const subjectTrimmed = tutorQuery.subject.trim();
    if (!subjectTrimmed) {
      showToast('Please enter the subject you need help with', true);
      return;
    }
    if (subjectTrimmed.length > 60) {
      showToast('Subject name must be 60 characters or fewer', true);
      return;
    }
    const budget = tutorQuery.maxBudget === '' ? NaN : Number(tutorQuery.maxBudget);
    if (isNaN(budget) || budget < 0 || budget > 1000000) {
      showToast('Please enter a valid budget between LKR 0 and 1,000,000', true);
      return;
    }
    if (!tutorQuery.learningStyle.trim()) {
      showToast('Please select your preferred learning style', true);
      return;
    }

    try {
      setFindingTutors(true);
      const res = await api.post(`/match/${profile._id}/top-tutors`, {
        subject: subjectTrimmed,
        maxBudget: budget,
        learningStyle: tutorQuery.learningStyle,
        language: tutorQuery.language,
        availability: tutorQuery.availability,
      });

      setTutorMatches(res.data || []);
      if (!res.data || res.data.length === 0) {
        showToast('No tutors found for your current criteria', true);
      } else {
        showToast(`${res.data.length} tutor match${res.data.length > 1 ? 'es' : ''} found`);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to fetch tutor matches', true);
    } finally {
      setFindingTutors(false);
    }
  };

  const bookTutor = async (matchItem) => {
    const tutorProfileId = matchItem?.tutor?._id;
    if (!tutorProfileId) {
      showToast('Unable to book this tutor right now', true);
      return;
    }

    try {
      setBookingTutorIds((prev) => ({ ...prev, [tutorProfileId]: true }));
      await api.post('/tutor-bookings', {
        studentProfileId: profile._id,
        tutorProfileId,
        subject: tutorQuery.subject,
        maxBudget: Number(tutorQuery.maxBudget),
        learningStyle: tutorQuery.learningStyle,
        language: tutorQuery.language,
        requestedAvailability: tutorQuery.availability,
        matchScore: matchItem.score || 0,
        reasons: matchItem.reasons || [],
      });

      showToast('Tutor booking request sent');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send booking request', true);
      setBookingTutorIds((prev) => ({ ...prev, [tutorProfileId]: false }));
    }
  };

  const toggleMatchSelection = (studentProfileId) => {
    setSelectedMatchIds((prev) => {
      if (prev.includes(studentProfileId)) {
        return prev.filter((id) => id !== studentProfileId);
      }
      if (prev.length >= 4) {
        showToast('You can select maximum 4 members', true);
        return prev;
      }
      return [...prev, studentProfileId];
    });
  };

  const requestGrouping = async () => {
    try {
      if (selectedMatchIds.length < 1) {
        showToast('Select at least one member first', true);
        return;
      }
      await api.post(`/match/${profile._id}/request-group`, { selectedStudentIds: selectedMatchIds });
      setSelectedMatchIds([]);
      fetchGroupRequests();
      showToast('Group request sent');
    } catch (err) {
      console.error('grouping error', err.response?.data || err.message);
      showToast(err.response?.data?.message || 'Failed to request grouping', true);
    }
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteError('');
    setDeletePassword('');
    setDeleteMethod('password');
    setFaceDeleteOpen(false);
    setFaceDeleteError('');
    setFaceDeleteBusy(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Start enroll camera after modal mounts (avoids videoRef race condition)
  useEffect(() => {
    if (!faceEnrollOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        enrollStreamRef.current = stream;
        if (enrollVideoRef.current) {
          enrollVideoRef.current.srcObject = stream;
          await enrollVideoRef.current.play();
        }
        setFaceEnrollInfo('Camera ready. Keep your face centered and click Scan Face.');
      } catch (err) {
        if (!cancelled) setFaceEnrollError('Could not access camera. Please allow camera permission.');
      }
    })();
    return () => { cancelled = true; };
  }, [faceEnrollOpen]);

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
      throw new Error('Face API unavailable');
    }

    await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL);

    faceApiRef.current = faceapi;
    modelsLoadedRef.current = true;
    return faceapi;
  };

  const deleteWithPassword = async () => {
    if (!deletePassword.trim()) {
      setDeleteError('Please enter your password');
      return;
    }

    try {
      setDeleteBusy(true);
      setDeleteError('');
      await api.post('/profile/delete-secure', { password: deletePassword });
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth-changed'));
      showToast('Profile deleted');
      closeDeleteModal();
      navigate('/login');
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete profile');
    } finally {
      setDeleteBusy(false);
    }
  };

  const openFaceDelete = async () => {
    try {
      setFaceDeleteError('');
      setFaceDeleteOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setFaceDeleteError('Could not access camera. Please allow camera permission.');
    }
  };

  const deleteWithFaceId = async () => {
    try {
      setFaceDeleteBusy(true);
      setFaceDeleteError('');
      const faceapi = await ensureFaceModels();
      const video = videoRef.current;
      if (!video) {
        throw new Error('Camera is not ready');
      }

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error('No face detected. Please keep your face centered.');
      }

      const descriptor = Array.from(detection.descriptor).map(v => Number(v.toFixed(8)));
      await api.post('/profile/delete-secure', { faceDescriptor: descriptor });
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth-changed'));
      showToast('Profile deleted');
      closeDeleteModal();
      navigate('/login');
    } catch (err) {
      setFaceDeleteError(err.response?.data?.message || err.message || 'Face verification failed');
    } finally {
      setFaceDeleteBusy(false);
    }
  };

  const respondToRequest = async (requestId, action) => {
    try {
      await api.patch(`/match/group-requests/${requestId}/respond`, { action });
      fetchGroupRequests();
      showToast(action === 'accept' ? 'Request accepted' : 'Request rejected');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update request', true);
    }
  };

  const deleteGroupRequest = async (requestId) => {
    try {
      await api.delete(`/match/group-requests/${requestId}`);
      fetchGroupRequests();
      showToast('Request deleted');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete request', true);
    }
  };

  const updateCompletion = () => {
    const fields = [
      {key:'university'}, {key:'degreeProgram'}, {key:'year'},
      {key:'subjects'}, {key:'skills'}, {key:'studyGoals'},
      {key:'learningStyle'}, {key:'studyMode'}, {key:'interests'}
    ];
    let done = 0;
    fields.forEach(f => {
      const val = profile[f.key];
      const filled = Array.isArray(val) ? val.length > 0 : !!val;
      if (filled) done++;
    });
    return Math.round((done / fields.length) * 100);
  };

  const getMatchScore = () => {
    const dims = [
      Math.min(profile.subjects.length * 12, 100),
      Math.min((profile.studyGoals.length + profile.careerGoals.length) * 12, 100),
      profile.learningStyle ? 100 : 0,
      Math.min(Object.values(profile.availability).filter(Boolean).length * 5, 100),
      Math.min(profile.interests.length * 12, 100)
    ];
    return Math.round(dims.reduce((a, b) => a + b) / dims.length);
  };

  const isDk = theme !== 'light';
  const pal = {
    text:           isDk ? '#FFFFFF'                   : '#0d1b3e',
    textMuted:      isDk ? 'rgba(255,255,255,.45)'     : '#5a6a8a',
    textSemi:       isDk ? 'rgba(255,255,255,.65)'     : '#3a4669',
    textDim:        isDk ? 'rgba(255,255,255,.25)'     : '#7a86a8',
    textFaint:      isDk ? 'rgba(255,255,255,.15)'     : '#a0abc4',
    cardBg:         isDk ? 'rgba(255,255,255,.05)'     : 'rgba(255,255,255,0.88)',
    cardBgHeavy:    isDk ? 'rgba(255,255,255,.09)'     : 'rgba(255,255,255,0.96)',
    cardBorder:     isDk ? 'rgba(255,255,255,.09)'     : 'rgba(26,107,255,.14)',
    cardBorderHvy:  isDk ? 'rgba(255,255,255,.16)'     : 'rgba(26,107,255,.28)',
    sidebarBg:      isDk ? 'rgba(13,23,48,.6)'         : 'rgba(240,244,255,.97)',
    sidebarBorder:  isDk ? 'rgba(255,255,255,.09)'     : 'rgba(26,107,255,.15)',
    inputBg:        isDk ? 'rgba(255,255,255,.04)'     : '#f0f4ff',
    inputBorder:    isDk ? 'rgba(255,255,255,.09)'     : 'rgba(26,107,255,.2)',
    surfaceBg:      isDk ? 'rgba(255,255,255,.03)'     : 'rgba(240,244,255,.5)',
    sectionKey:     isDk ? 'rgba(255,255,255,.85)'     : '#0d1b3e',
    sectionInactive:isDk ? 'rgba(255,255,255,.55)'     : '#5a6a8a',
    dot:            isDk ? 'rgba(255,255,255,.15)'     : 'rgba(26,107,255,.25)',
    progressBg:     isDk ? 'rgba(255,255,255,.06)'     : 'rgba(26,107,255,.08)',
    orbColor1:      isDk ? 'rgba(26,107,255,.16)'      : 'rgba(26,107,255,.06)',
    orbColor2:      isDk ? 'rgba(0,229,195,.1)'        : 'rgba(0,229,195,.04)',
    avatarBorder:   isDk ? '#0A0E1A'                   : '#f0f4ff',
  };

  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const times = ['08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00'];

  const completion = updateCompletion();
  const matchScore = getMatchScore();

  if (loading) return <div style={{padding:'6rem 2rem', textAlign:'center'}}>Loading...</div>;

  return (
    <>
      <style>{getStyles(theme)}</style>
      
      <div className="cur" id="cO" style={{position:'fixed',top:0,left:0,zIndex:9999,pointerEvents:'none'}}>
        <div className="cur-ring" style={{width:'34px',height:'34px',border:'1.5px solid #1A6BFF',borderRadius:'50%',transform:'translate(-50%,-50%)',opacity:0.65,transition:'all 0.25s'}}></div>
      </div>
      <div className="cur" id="cI" style={{position:'fixed',top:0,left:0,zIndex:9999,pointerEvents:'none'}}>
        <div className="cur-dot" style={{width:'8px',height:'8px',borderRadius:'50%',background:'#00E5C3',transform:'translate(-50%,-50%)'}}></div>
      </div>

      <div className="orb o1" style={{position:'fixed',width:'600px',height:'600px',background:`radial-gradient(circle,${pal.orbColor1},transparent 70%)`,top:'-200px',right:'-100px',filter:'blur(120px)',pointerEvents:'none',zIndex:0,borderRadius:'50%',animation:'d1 14s ease-in-out infinite alternate'}}></div>
      <div className="orb o2" style={{position:'fixed',width:'400px',height:'400px',background:`radial-gradient(circle,${pal.orbColor2},transparent 70%)`,bottom:0,left:'-80px',filter:'blur(120px)',pointerEvents:'none',zIndex:0,borderRadius:'50%',animation:'d2 18s ease-in-out infinite alternate'}}></div>


      <div style={{position:'relative',zIndex:1,display:'grid',gridTemplateColumns:'280px 1fr',gap:0,height:'calc(100vh - 72px)'}}>
        {/* SIDEBAR */}
        <aside style={{position:'sticky',top:0,height:'100%',overflowY:'auto',padding:'2rem 1.5rem',background:pal.sidebarBg,borderRight:`1px solid ${pal.sidebarBorder}`,backdropFilter:'blur(20px)',display:'flex',flexDirection:'column',gap:'0.3rem'}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'0.7rem',padding:'1.5rem 1rem',background:pal.cardBg,border:`1px solid ${pal.cardBorder}`,borderRadius:'16px',marginBottom:'1.2rem',textAlign:'center'}}>
            <div style={{position:'relative',width:'80px',height:'80px',borderRadius:'50%',background:'linear-gradient(135deg,#1A6BFF,#00E5C3)',display:'grid',placeItems:'center',fontSize:'2rem',cursor:'pointer',overflow:'hidden'}} onClick={() => navigate('/profile')}>
              {userAvatar
                ? <img src={userAvatar} alt="avatar" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} />
                : <span>{avatarEmoji}</span>
              }
              <div style={{position:'absolute',bottom:0,right:0,width:'24px',height:'24px',borderRadius:'50%',background:'#1A6BFF',border:`2px solid ${pal.avatarBorder}`,display:'grid',placeItems:'center',fontSize:'0.65rem',zIndex:1}}>✏</div>
            </div>
            <div>
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:'0.95rem',letterSpacing:'-0.02em',color:pal.text}}>{profile.displayName || profile.name || 'Student'}</div>
              <div style={{fontSize:'0.72rem',letterSpacing:'0.06em',textTransform:'uppercase',color:'#00E5C3',background:'rgba(0,229,195,.1)',border:'1px solid rgba(0,229,195,.2)',padding:'0.2rem 0.7rem',borderRadius:'99px',marginTop:'0.3rem'}}>Student</div>
              <div style={{marginTop:'0.6rem'}}>
                <div style={{fontSize:'0.7rem',color:pal.textMuted,marginBottom:'0.3rem'}}>Profile {completion}% complete</div>
                <div style={{width:'100%',background:pal.progressBg,borderRadius:'99px',height:'4px',marginTop:'0.3rem'}}><div style={{height:'100%',borderRadius:'99px',background:'linear-gradient(90deg,#1A6BFF,#00E5C3)',width:`${completion}%`,transition:'width 0.6s cubic-bezier(.16,1,.3,1)'}}></div></div>
              </div>
            </div>
          </div>

          <div style={{fontSize:'0.68rem',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:pal.textDim,padding:'0.8rem 0.5rem 0.3rem'}}>Profile Sections</div>
          {['overview','academic','subjects','goals','learning','interests','availability','bookTutor','wellness', 'mood-journal'].map(s => (
            <div key={s} onClick={() => setCurrentSection(s)} style={{display:'flex',alignItems:'center',gap:'0.7rem',padding:'0.65rem 0.8rem',borderRadius:'10px',fontSize:'0.85rem',color:currentSection===s?pal.sectionKey:pal.sectionInactive,cursor:'pointer',transition:'all 0.2s',background:currentSection===s?'rgba(26,107,255,.12)':'transparent',border:currentSection===s?'1px solid rgba(26,107,255,.2)':'1px solid transparent'}}>
              <span style={{width:'6px',height:'6px',borderRadius:'50%',background:currentSection===s?'#1A6BFF':pal.dot,flexShrink:0,transition:'all 0.2s'}}></span>
              <span style={{fontSize:'1rem',width:'20px',textAlign:'center',flexShrink:0}}>{getIcon(s)}</span>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
          ))}
          
          <div style={{fontSize:'0.68rem',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:pal.textDim,padding:'0.8rem 0.5rem 0.3rem',marginTop:'0.5rem'}}>Activity</div>
          <div onClick={() => setCurrentSection('matching')} style={{display:'flex',alignItems:'center',gap:'0.7rem',padding:'0.65rem 0.8rem',borderRadius:'10px',fontSize:'0.85rem',color:currentSection==='matching'?pal.sectionKey:pal.sectionInactive,cursor:'pointer',transition:'all 0.2s',background:currentSection==='matching'?'rgba(26,107,255,.12)':'transparent',border:currentSection==='matching'?'1px solid rgba(26,107,255,.2)':'1px solid transparent'}}>
            <span style={{width:'6px',height:'6px',borderRadius:'50%',background:currentSection==='matching'?'#1A6BFF':pal.dot,flexShrink:0}}></span>
            <span style={{fontSize:'1rem',width:'20px',textAlign:'center'}}>🔗</span>
            Match Preview
            <span style={{marginLeft:'auto',fontSize:'0.65rem',fontWeight:600,padding:'0.1rem 0.5rem',borderRadius:'99px',background:'rgba(26,107,255,.15)',color:'#38BFFF'}}>New</span>
          </div>

          <div style={{marginTop:'auto',paddingTop:'1rem'}}>
            <button
              onClick={() => setDeleteModalOpen(true)}
              style={{width:'100%',padding:'0.6rem 0.8rem',borderRadius:'10px',border:'1px solid rgba(255,82,114,.35)',background:'rgba(255,82,114,.12)',color:'#ff98ad',cursor:'pointer',fontSize:'0.82rem',fontWeight:700}}
            >
              Delete Profile
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{padding:'2.5rem 3rem',height:'calc(100vh - 68px)',overflowY:'auto'}}>
          {currentSection === 'overview' && renderOverview()}
          {currentSection === 'academic' && renderAcademic()}
          {currentSection === 'subjects' && renderSubjects()}
          {currentSection === 'goals' && renderGoals()}
          {currentSection === 'learning' && renderLearning()}
          {currentSection === 'interests' && renderInterests()}
          {currentSection === 'availability' && renderAvailability()}
          {currentSection === 'bookTutor' && renderBookTutor()}
          {currentSection === 'matching' && renderMatching()}
          {currentSection === 'wellness' && renderWellness()}
          {currentSection === 'mood-journal' && (
            <div className="journal-outer-container">
              <div className="journal-header">
                <h2>The Mood Journal</h2>
                <p>A secure space for your private reflections and intelligent stress insights.</p>
              </div>

              <div className="journal-main-grid">
                <aside className="journal-sidebar">
                  <CalendarFilter 
                    selectedDate={viewDate} 
                    mode={filterMode} 
                    onDateChange={setViewDate} 
                    onModeChange={setFilterMode} 
                  />
                  <JournalSummary 
                    entries={journalEntries.filter(entry => {
                      const d = new Date(entry.createdAt);
                      if (filterMode === 'day') return isSameDay(d, viewDate);
                      if (filterMode === 'month') return isSameMonth(d, viewDate);
                      if (filterMode === 'week') {
                        return isWithinInterval(d, {
                          start: startOfWeek(viewDate, { weekStartsOn: 1 }),
                          end: endOfWeek(viewDate, { weekStartsOn: 1 })
                        });
                      }
                      return true;
                    })}
                    mode={filterMode}
                    selectedDate={viewDate}
                  />
                </aside>

                <div className="journal-content-area">
                  <JournalForm onEntryAdded={handleAddJournalEntry} />
                  <div className="journal-list-section">
                    <JournalList 
                      entries={journalEntries.filter(entry => {
                        const d = new Date(entry.createdAt);
                        if (filterMode === 'day') return isSameDay(d, viewDate);
                        if (filterMode === 'month') return isSameMonth(d, viewDate);
                        if (filterMode === 'week') {
                          return isWithinInterval(d, {
                            start: startOfWeek(viewDate, { weekStartsOn: 1 }),
                            end: endOfWeek(viewDate, { weekStartsOn: 1 })
                          });
                        }
                        return true;
                      })} 
                      loading={journalLoading} 
                      onDelete={handleDeleteJournalEntry} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {toast.show && (
        <div style={{position:'fixed',bottom:'2rem',right:'2rem',zIndex:999,padding:'0.85rem 1.4rem',borderRadius:'12px',background:toast.isError?'rgba(255,82,114,.1)':'rgba(0,229,195,.12)',border:toast.isError?'1px solid rgba(255,82,114,.25)':'1px solid rgba(0,229,195,.25)',color:toast.isError?'#FF5272':'#00E5C3',fontSize:'0.85rem',fontWeight:500,display:'flex',alignItems:'center',gap:'0.6rem'}}>
          ✓ {toast.msg}
        </div>
      )}

      {detailsPopup.show && (
        <div style={{position:'fixed',inset:0,background:'rgba(3,8,16,.72)',zIndex:1200,display:'grid',placeItems:'center',padding:'1rem'}} onClick={() => setDetailsPopup({ show: false, invitee: null, request: null })}>
          <div style={{width:'min(560px, 92vw)',background:isDk?'#0e1a33':'#f0f4ff',border:`1px solid ${pal.cardBorderHvy}`,borderRadius:'14px',padding:'1rem 1.1rem'}} onClick={(e) => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.8rem'}}>
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:'1rem',color:pal.text}}>Match Details</div>
              <button onClick={() => setDetailsPopup({ show: false, invitee: null, request: null })} style={{background:'transparent',border:'none',color:pal.textMuted,cursor:'pointer'}}>✕</button>
            </div>
            <div style={{fontSize:'0.84rem',color:pal.textSemi,marginBottom:'0.65rem'}}>
              Member: <strong>{detailsPopup.invitee?.user?.name || 'Unknown'}</strong>
            </div>
            <div style={{fontSize:'0.82rem',color:'#38BFFF',marginBottom:'0.65rem'}}>
              Matching Score: {Math.round((detailsPopup.invitee?.matchScore || 0) * 100)}%
            </div>
            <div style={{fontSize:'0.78rem',color:pal.textMuted,marginBottom:'0.4rem'}}>Why this match:</div>
            <ul style={{margin:'0 0 0.8rem 1rem',padding:0,color:pal.text,fontSize:'0.82rem',lineHeight:1.5}}>
              {(detailsPopup.invitee?.reasons || []).length ? detailsPopup.invitee.reasons.map((r, i) => <li key={`${r}-${i}`}>{r}</li>) : <li>No detailed reasons available</li>}
            </ul>
            <div style={{fontSize:'0.76rem',color:pal.textDim}}>Request status: {detailsPopup.request?.status || 'pending'} | Invitee status: {detailsPopup.invitee?.status || 'pending'}</div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div style={{position:'fixed',inset:0,background:'rgba(3,8,16,.72)',zIndex:1300,display:'grid',placeItems:'center',padding:'1rem'}} onClick={closeDeleteModal}>
          <div style={{width:'min(560px, 94vw)',background:isDk?'#0e1a33':'#f0f4ff',border:`1px solid ${pal.cardBorderHvy}`,borderRadius:'14px',padding:'1rem 1.1rem'}} onClick={(e) => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.8rem'}}>
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:'1rem',color:pal.text}}>Delete Profile</div>
              <button onClick={closeDeleteModal} style={{background:'transparent',border:'none',color:pal.textMuted,cursor:'pointer'}}>✕</button>
            </div>

            <div style={{fontSize:'0.82rem',color:pal.textSemi,marginBottom:'0.8rem'}}>
              Verify your identity with password or Face ID before deletion.
            </div>

            <div style={{display:'flex',gap:'0.55rem',marginBottom:'0.8rem'}}>
              <button onClick={() => setDeleteMethod('password')} style={{padding:'0.45rem 0.75rem',borderRadius:'9px',border:`1px solid ${pal.cardBorder}`,background:deleteMethod==='password'?'rgba(26,107,255,.2)':pal.inputBg,color:pal.text,cursor:'pointer'}}>Password</button>
              <button onClick={() => setDeleteMethod('face')} style={{padding:'0.45rem 0.75rem',borderRadius:'9px',border:`1px solid ${pal.cardBorder}`,background:deleteMethod==='face'?'rgba(26,107,255,.2)':pal.inputBg,color:pal.text,cursor:'pointer'}}>Face ID</button>
            </div>

            {deleteMethod === 'password' ? (
              <div>
                <input
                  type='password'
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder='Enter your password'
                  style={{width:'100%',padding:'0.65rem 0.75rem',borderRadius:'10px',border:`1px solid ${pal.inputBorder}`,background:pal.inputBg,color:pal.text}}
                />
                <button onClick={deleteWithPassword} disabled={deleteBusy} style={{marginTop:'0.8rem',padding:'0.6rem 0.95rem',borderRadius:'10px',border:'1px solid rgba(255,82,114,.35)',background:'rgba(255,82,114,.18)',color:'#ffb3c1',cursor:'pointer',fontWeight:700}}>
                  {deleteBusy ? 'Deleting...' : 'Delete Profile'}
                </button>
              </div>
            ) : (
              <div>
                {!faceDeleteOpen ? (
                  <button onClick={openFaceDelete} style={{padding:'0.6rem 0.95rem',borderRadius:'10px',border:'1px solid rgba(26,107,255,.35)',background:'rgba(26,107,255,.2)',color:'#cfe3ff',cursor:'pointer',fontWeight:600}}>
                    Open Camera for Face ID
                  </button>
                ) : (
                  <div>
                    <video ref={videoRef} autoPlay muted playsInline style={{width:'100%',maxHeight:'260px',borderRadius:'10px',background:'#02070f',border:'1px solid rgba(255,255,255,.12)'}} />
                    <div style={{display:'flex',gap:'0.55rem',marginTop:'0.7rem'}}>
                      <button onClick={deleteWithFaceId} disabled={faceDeleteBusy} style={{padding:'0.55rem 0.85rem',borderRadius:'10px',border:'1px solid rgba(0,229,195,.35)',background:'rgba(0,229,195,.18)',color:'#9ff5e7',cursor:'pointer',fontWeight:700}}>
                        {faceDeleteBusy ? 'Verifying...' : 'Verify Face and Delete'}
                      </button>
                      <button onClick={closeDeleteModal} style={{padding:'0.55rem 0.85rem',borderRadius:'10px',border:'1px solid rgba(255,255,255,.18)',background:'rgba(255,255,255,.05)',color:'#fff',cursor:'pointer'}}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(deleteError || faceDeleteError) && (
              <div style={{marginTop:'0.7rem',fontSize:'0.8rem',color:'#ff8aa2'}}>{deleteError || faceDeleteError}</div>
            )}
          </div>
        </div>
      )}

      {faceEnrollOpen && (
        <div style={{position:'fixed',inset:0,background:'rgba(3,8,16,.78)',zIndex:1300,display:'grid',placeItems:'center',padding:'1rem'}} onClick={closeFaceEnroll}>
          <div style={{width:'min(520px, 96vw)',background:isDk?'#0e1a33':'#f0f4ff',border:`1px solid ${pal.cardBorderHvy}`,borderRadius:'14px',padding:'1.2rem 1.3rem'}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.9rem'}}>
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:'1rem',color:pal.text}}>
                {hasFaceId ? 'Update Face ID' : 'Enroll Face ID'}
              </div>
              <button onClick={closeFaceEnroll} style={{background:'transparent',border:'none',color:pal.textMuted,cursor:'pointer',fontSize:'1.1rem'}}>✕</button>
            </div>
            <video ref={enrollVideoRef} autoPlay muted playsInline style={{width:'100%',maxHeight:'280px',borderRadius:'10px',background:'#02070f',border:'1px solid rgba(255,255,255,.12)',marginBottom:'0.8rem'}} />
            {faceEnrollInfo && <div style={{fontSize:'0.82rem',color:'#9ff5e7',marginBottom:'0.6rem'}}>{faceEnrollInfo}</div>}
            {faceEnrollError && <div style={{fontSize:'0.82rem',color:'#ff8aa2',marginBottom:'0.6rem'}}>{faceEnrollError}</div>}
            <div style={{display:'flex',gap:'0.55rem'}}>
              <button onClick={enrollFace} disabled={faceEnrollBusy} style={{padding:'0.55rem 0.95rem',borderRadius:'10px',border:'1px solid rgba(0,229,195,.35)',background:'rgba(0,229,195,.18)',color:'#9ff5e7',cursor:'pointer',fontWeight:700,fontSize:'0.85rem'}}>
                {faceEnrollBusy ? 'Scanning...' : 'Scan Face'}
              </button>
              <button onClick={closeFaceEnroll} style={{padding:'0.55rem 0.85rem',borderRadius:'10px',border:`1px solid ${pal.cardBorder}`,background:'transparent',color:pal.textMuted,cursor:'pointer',fontSize:'0.85rem'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  function renderOverview() {
    return (
      <div style={{animation:'fadeIn 0.4s cubic-bezier(.16,1,.3,1)'}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'2rem',gap:'1rem',flexWrap:'wrap'}}>
          <div>
            <div style={{fontFamily:'Syne',fontWeight:800,fontSize:'clamp(1.6rem,2.5vw,2.2rem)',letterSpacing:'-0.04em',marginBottom:'0.3rem'}}>Profile Overview</div>
            <div style={{fontSize:'0.875rem',color:'rgba(255,255,255,.45)',fontWeight:300}}>Your academic identity on UniConnect</div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.8rem',marginBottom:'1.5rem'}}>
          <StatCard label="Year of Study" value={profile.year||'—'} />
          <StatCard label="Subjects" value={profile.subjects?.length || 0} />
          <StatCard label="Skills" value={profile.skills?.length || 0} />
          <StatCard label="Goals Set" value={(profile.studyGoals?.length || 0) + (profile.careerGoals?.length || 0) + (profile.examGoals?.length || 0)} />
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
          <Card title="🎓 Academic Info">
            <Field label="University" value={profile.university || '—'} />
            <Field label="Degree Program" value={profile.degreeProgram || '—'} />
            <Field label="Personality Type" value={profile.personalityType || '—'} />
          </Card>
          <Card title="🧠 Learning Profile">
            <Field label="Learning Style" value={profile.learningStyle || '—'} />
            <Field label="Study Mode" value={profile.studyMode || '—'} />
            <Field label="Productivity Time" value={profile.productivityTime || '—'} />
          </Card>
        </div>


      </div>
    );
  }

  function renderAcademic() {
    const isEdit = editState.acad;
    return (
      <Section title="Academic Information" subtitle="Your university and degree details" onEdit={() => toggleEdit('acad')} isEdit={isEdit}>
        <Card title="🎓 University Details">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <FieldDisplay label="University" isEdit={isEdit} value={profile.university} onChange={(v) => setProfile({...profile, university: v})} onSave={() => {
              const v = (profile.university || '').trim();
              if (v.length > 100) { showToast('University name must be 100 characters or fewer', true); return; }
              saveFieldValue('university', v);
            }} placeholder="e.g. University of Melbourne" />
            <FieldDisplay label="Degree Program" isEdit={isEdit} value={profile.degreeProgram} onChange={(v) => setProfile({...profile, degreeProgram: v})} onSave={() => {
              const v = (profile.degreeProgram || '').trim();
              if (v.length > 100) { showToast('Degree program must be 100 characters or fewer', true); return; }
              saveFieldValue('degreeProgram', v);
            }} placeholder="e.g. Bachelor of Computer Science" />
            <FieldDisplay label="Year of Study" isEdit={isEdit} value={profile.year} onChange={(v) => setProfile({...profile, year: v})} onSave={() => saveFieldValue('year', profile.year)} isSelect range={['1','2','3','4','5','6']} />
            <FieldDisplay label="Personality Type" isEdit={isEdit} value={profile.personalityType} onChange={(v) => setProfile({...profile, personalityType: v})} onSave={() => {
              const v = (profile.personalityType || '').trim();
              if (v && v.length > 10) { showToast('Personality type must be 10 characters or fewer (e.g. INTJ)', true); return; }
              saveFieldValue('personalityType', v);
            }} placeholder="e.g. INTJ" />
          </div>
        </Card>
      </Section>
    );
  }

  function renderSubjects() {
    const isEdit = editState.subj;
    // subjects available for the dropdowns — only those already in the current list
    const subjectOptions = (profile.subjects || []).filter(Boolean);

    const SubjectDropdown = ({ fieldName, colorClass, placeholder }) => {
      const current = profile[fieldName] || [];
      // available = subjects not yet added to this list
      const available = subjectOptions.filter(s => !current.includes(s));
      if (!isEdit) return null;
      return (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <select
            defaultValue=""
            style={{
              flex: 1,
              padding: '0.6rem 0.85rem',
              background: 'var(--sd-input-bg)',
              border: '1.5px solid var(--sd-input-border)',
              borderRadius: '9px',
              color: available.length ? 'var(--sd-text)' : 'var(--sd-faint)',
              fontFamily: 'DM Sans',
              fontSize: '0.87rem',
              outline: 'none',
              cursor: available.length ? 'pointer' : 'not-allowed',
            }}
            onChange={e => {
              const val = e.target.value;
              if (val) addTag(fieldName, val);
              e.target.value = '';
            }}
          >
            <option value="" disabled>
              {available.length ? placeholder : 'All subjects added'}
            </option>
            {available.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      );
    };

    return (
      <Section title="Subjects & Skills" subtitle="What you study and what you're good at" onEdit={() => toggleEdit('subj')} isEdit={isEdit}>
        <Card title="📘 Current Subjects">
          <TagList items={profile.subjects} onRemove={(i) => removeTag('subjects', i)} />
          {isEdit && <TagInput onAdd={(val) => { addTag('subjects', val); }} />}
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Card title="💪 Strong Subjects">
            <TagList items={profile.strongSubjects} colorClass="green" onRemove={(i) => removeTag('strongSubjects', i)} />
            {subjectOptions.length > 0
              ? <SubjectDropdown fieldName="strongSubjects" colorClass="green" placeholder="Select a strong subject…" />
              : isEdit && <div style={{ fontSize: '0.78rem', color: 'var(--sd-faint)', marginTop: '0.5rem' }}>Add current subjects first</div>
            }
          </Card>
          <Card title="⚠️ Weak Subjects">
            <TagList items={profile.weakSubjects} colorClass="rose" onRemove={(i) => removeTag('weakSubjects', i)} />
            {subjectOptions.length > 0
              ? <SubjectDropdown fieldName="weakSubjects" colorClass="rose" placeholder="Select a weak subject…" />
              : isEdit && <div style={{ fontSize: '0.78rem', color: 'var(--sd-faint)', marginTop: '0.5rem' }}>Add current subjects first</div>
            }
          </Card>
        </div>

        <Card title="⚡ Skills">
          <TagList items={profile.skills} colorClass="purple" onRemove={(i) => removeTag('skills', i)} />
          {isEdit && <TagInput onAdd={(val) => addTag('skills', val)} />}
        </Card>
      </Section>
    );
  }

  function renderGoals() {
    const isEdit = editState.goals;
    return (
      <Section title="Goals" subtitle="What you're working towards" onEdit={() => toggleEdit('goals')} isEdit={isEdit}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
          <Card title="📖 Study Goals">
            <TagList items={profile.studyGoals} onRemove={(i) => removeTag('studyGoals', i)} />
            {isEdit && <TagInput onAdd={(val) => addTag('studyGoals', val)} />}
          </Card>
          <Card title="🚀 Career Goals">
            <TagList items={profile.careerGoals} colorClass="amber" onRemove={(i) => removeTag('careerGoals', i)} />
            {isEdit && <TagInput onAdd={(val) => addTag('careerGoals', val)} />}
          </Card>
        </div>
        <Card title="📝 Exam Goals">
          <TagList items={profile.examGoals} colorClass="green" onRemove={(i) => removeTag('examGoals', i)} />
          {isEdit && <TagInput onAdd={(val) => addTag('examGoals', val)} />}
        </Card>
      </Section>
    );
  }

  function renderLearning() {
    const isEdit = editState.learn;
    const styles = {
      opts: {display:'flex',flexWrap:'wrap',gap:'0.4rem',padding:'0.2rem 0'}
    };
    return (
      <Section title="Learning Style" subtitle="How you study best" onEdit={() => toggleEdit('learn')} isEdit={isEdit}>
        <Card title="🎯 Learning Style">
          {!isEdit ? (
            <div style={{fontSize:'0.9rem',color:profile.learningStyle?pal.text:pal.textFaint,padding:'0.5rem 0',minHeight:'2rem'}}>{profile.learningStyle || 'Not set'}</div>
          ) : (
            <OptionGrid options={['👁 Visual','👂 Auditory','✋ Kinaesthetic','📖 Reading/Writing','🤝 Social','🔇 Solitary']} selected={profile.learningStyle} onChange={(val) => selectOption('learningStyle', cleanEmoji(val))} />
          )}
        </Card>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
          <Card title="⏰ Productivity Time">
            {!isEdit ? (
              <div style={{fontSize:'0.9rem',color:profile.productivityTime?pal.text:pal.textFaint,padding:'0.5rem 0',minHeight:'2rem'}}>{profile.productivityTime || 'Not set'}</div>
            ) : (
              <OptionGrid options={['🌅 Early Morning','☀️ Morning','🌤 Afternoon','🌇 Evening','🌙 Night Owl']} selected={profile.productivityTime} onChange={(val) => selectOption('productivityTime', cleanEmoji(val))} />
            )}
          </Card>
          <Card title="🏠 Study Mode">
            {!isEdit ? (
              <div style={{fontSize:'0.9rem',color:profile.studyMode?pal.text:pal.textFaint,padding:'0.5rem 0',minHeight:'2rem'}}>{profile.studyMode || 'Not set'}</div>
            ) : (
              <OptionGrid options={['🤝 Group','👤 Solo','🔀 Mixed','💻 Online','🏛 In-person']} selected={profile.studyMode} onChange={(val) => selectOption('studyMode', cleanEmoji(val))} />
            )}
          </Card>
        </div>
      </Section>
    );
  }

  function renderInterests() {
    const isEdit = editState.interest;
    return (
      <Section title="Interests & Tags" subtitle="Helps surface compatible peers" onEdit={() => toggleEdit('interest')} isEdit={isEdit}>
        <Card title="❤️ Interests">
          <TagList items={profile.interests} colorClass="rose" onRemove={(i) => removeTag('interests', i)} />
          {isEdit && <TagInput onAdd={(val) => addTag('interests', val)} />}
        </Card>
        <Card title="🏷 Tags">
          <TagList items={profile.tags} colorClass="amber" onRemove={(i) => removeTag('tags', i)} />
          {isEdit && <TagInput onAdd={(val) => addTag('tags', val)} />}
        </Card>
      </Section>
    );
  }

  function renderAvailability() {
    return (
      <Section title="Availability" subtitle="When are you free to collaborate?" onSave={saveAvailability}>
        <Card title="📅 Weekly Schedule">
          <div style={{overflowX:'auto',minWidth:'480px'}}>
            <div style={{display:'grid',gridTemplateColumns:'50px repeat(7,1fr)',gap:'4px'}}>
              <div></div>
              {days.map(d => <div key={d} style={{fontSize:'0.7rem',color:pal.textMuted,textAlign:'center',padding:'0.2rem',fontWeight:600,letterSpacing:'0.04em'}}>{d}</div>)}
              {times.map(t => (
                <React.Fragment key={t}>
                  <div style={{fontSize:'0.62rem',color:pal.textMuted,textAlign:'center',padding:'0.2rem',fontWeight:600}}>{t}</div>
                  {days.map(d => {
                    const key = `${d}-${t}`;
                    const isOn = profile.availability[key];
                    return (
                      <div 
                        key={key} 
                        onClick={() => toggleAvailability(d, t)}
                        style={{height:'32px',borderRadius:'6px',background:isOn?'rgba(0,229,195,.12)':pal.inputBg,border:isOn?'1px solid rgba(0,229,195,.3)':`1px solid ${pal.inputBorder}`,display:'grid',placeItems:'center',fontSize:'0.65rem',color:isOn?'#00E5C3':pal.textFaint,cursor:'pointer',transition:'all 0.2s'}}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
          <p style={{fontSize:'0.75rem',color:pal.textDim,marginTop:'1rem'}}>Teal slots = available. Times shown in your local timezone.</p>
        </Card>
      </Section>
    );
  }

  function renderBookTutor() {
    return (
      <Section title="Book a Tutor" subtitle="Enter your learning requirements to find the best-fit tutors">
        <Card title="📝 Your Tutor Requirements">
          <div style={{display:'grid',gridTemplateColumns:'repeat(2, minmax(240px, 1fr))',gap:'1rem'}}>
            <FieldDisplay
              label="Subject Needed"
              isEdit
              value={tutorQuery.subject}
              onChange={(v) => setTutorQuery((prev) => ({ ...prev, subject: v }))}
              onSave={() => {}}
              placeholder="e.g. Data Structures"
            />
            <FieldDisplay
              label="Max Budget per Hour (LKR)"
              isEdit
              value={tutorQuery.maxBudget}
              onChange={(v) => setTutorQuery((prev) => ({ ...prev, maxBudget: v }))}
              onSave={() => {}}
              placeholder="Use 0 for free tutors"
            />
            <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
              <label style={{fontSize:'0.75rem',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase',color:pal.textMuted}}>Preferred Learning Style</label>
              <OptionGrid
                options={['Theory-based','Practical/Hands-on','Exam-oriented','Visual','Auditory','Kinaesthetic','Reading/Writing']}
                selected={tutorQuery.learningStyle}
                onChange={(val) => setTutorQuery((prev) => ({ ...prev, learningStyle: cleanEmoji(val) }))}
              />
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
              <label style={{fontSize:'0.75rem',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase',color:pal.textMuted}}>Preferred Language</label>
              <select
                style={{width:'100%',padding:'0.72rem 1rem',background:pal.inputBg,border:`1.5px solid ${pal.inputBorder}`,borderRadius:'9px',color:pal.text,fontFamily:'DM Sans',fontSize:'0.87rem',outline:'none'}}
                value={tutorQuery.language}
                onChange={(e) => setTutorQuery((prev) => ({ ...prev, language: e.target.value }))}
              >
                {['English', 'Sinhala', 'Singlish', 'Tamil'].map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{marginTop:'1rem'}}>
            <div style={{fontSize:'0.75rem',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase',color:pal.textMuted,marginBottom:'0.6rem'}}>Your Available Time Slots</div>
            <div style={{overflowX:'auto',minWidth:'480px'}}>
              <div style={{display:'grid',gridTemplateColumns:'50px repeat(7,1fr)',gap:'4px'}}>
                <div></div>
                {days.map(d => <div key={d} style={{fontSize:'0.7rem',color:pal.textMuted,textAlign:'center',padding:'0.2rem',fontWeight:600,letterSpacing:'0.04em'}}>{d}</div>)}
                {times.map(t => (
                  <React.Fragment key={t}>
                    <div style={{fontSize:'0.62rem',color:pal.textMuted,textAlign:'center',padding:'0.2rem',fontWeight:600}}>{t}</div>
                    {days.map(d => {
                      const key = `${d}-${t}`;
                      const isOn = tutorQuery.availability[key];
                      return (
                        <div
                          key={key}
                          onClick={() => toggleTutorAvailability(d, t)}
                          style={{height:'32px',borderRadius:'6px',background:isOn?'rgba(0,229,195,.12)':pal.inputBg,border:isOn?'1px solid rgba(0,229,195,.3)':`1px solid ${pal.inputBorder}`,display:'grid',placeItems:'center',fontSize:'0.65rem',color:isOn?'#00E5C3':pal.textFaint,cursor:'pointer',transition:'all 0.2s'}}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={fetchTutorMatches}
            disabled={findingTutors}
            style={{marginTop:'1rem',padding:'0.7rem 1.4rem',borderRadius:'10px',background:'#1A6BFF',border:'none',color:'white',cursor:'pointer',fontWeight:600}}
          >
            {findingTutors ? 'Finding Tutors...' : 'Find Tutors'}
          </button>
        </Card>

        <Card title="🎓 Top Tutor Matches">
          {tutorMatches.length === 0 ? (
            <div style={{fontSize:'0.9rem',color:pal.textMuted}}>
              Enter your requirements and click Find Tutors to see matches.
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'0.7rem'}}>
              {tutorMatches.map((item, idx) => {
                const tutor = item.tutor || {};
                const tutorName = tutor.user?.name || `${tutor.firstName || ''} ${tutor.lastName || ''}`.trim() || 'Tutor';
                const priceText = tutor.isFree ? 'Free' : `LKR ${Number(tutor.hourlyRate || 0).toFixed(2)}/hr`;
                const isBooked = Boolean(bookingTutorIds[tutor._id]);
                return (
                  <div key={`${tutor._id || idx}`} style={{padding:'0.9rem',background:pal.cardBg,borderRadius:'10px',border:`1px solid ${pal.cardBorder}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',gap:'0.8rem',alignItems:'center',marginBottom:'0.45rem',flexWrap:'wrap'}}>
                      <div style={{fontWeight:700,fontSize:'0.92rem',color:pal.text}}>{tutorName}</div>
                      <div style={{fontSize:'0.8rem',color:'#00E5C3'}}>Match: {Math.round((item.score || 0) * 100)}%</div>
                    </div>
                    <div style={{fontSize:'0.8rem',color:pal.textSemi,marginBottom:'0.45rem'}}>
                      {priceText} • Style: {tutor.teachingStyle || 'N/A'} • Language: {tutor.language || 'N/A'} • Experience: {tutor.yearsOfExperience || 0} years
                    </div>
                    <ul style={{margin:'0 0 0 1rem',padding:0,fontSize:'0.8rem',color:pal.text,lineHeight:1.4}}>
                      {(item.reasons || []).length ? item.reasons.map((reason, i) => <li key={`${reason}-${i}`}>{reason}</li>) : <li>No reasons available</li>}
                    </ul>
                    <button
                      type="button"
                      disabled={isBooked}
                      onClick={() => bookTutor(item)}
                      style={{marginTop:'0.65rem',padding:'0.55rem 1rem',borderRadius:'8px',border:'none',background:isBooked?'rgba(0,229,195,.2)':'#1A6BFF',color:isBooked?'#9af3e4':'#fff',cursor:isBooked?'default':'pointer',fontWeight:700,fontSize:'0.8rem'}}
                    >
                      {isBooked ? 'Request Sent' : 'Book Tutor'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </Section>
    );
  }

  function renderMatching() {
    const dims = [
      {label:'Academic Match', pct: Math.min(profile.subjects.length * 12, 100)},
      {label:'Goals Alignment', pct: Math.min((profile.studyGoals.length + profile.careerGoals.length) * 12, 100)},
      {label:'Learning Style', pct: profile.learningStyle ? 100 : 0},
      {label:'Schedule Fit', pct: Math.min(Object.values(profile.availability).filter(Boolean).length * 5, 100)},
      {label:'Interests', pct: Math.min(profile.interests.length * 12, 100)}
    ];

    const suggestions = [
      !profile.university && {icon:'🏛',text:'Add your university to match with same-campus peers'},
      profile.subjects.length < 2 && {icon:'📚',text:'Add at least 2 subjects to improve academic matching'},
      !profile.learningStyle && {icon:'🧠',text:'Set your learning style to find compatible study partners'},
      profile.interests.length < 2 && {icon:'❤️',text:'Add interests — shared hobbies boost compatibility'},
      !Object.values(profile.availability).some(v=>v) && {icon:'📅',text:'Mark your availability so peers can see when you\'re free'}
    ].filter(Boolean);

    return (
      <div>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'2rem',gap:'1rem',flexWrap:'wrap'}}>
          <div>
            <div style={{fontFamily:'Syne',fontWeight:800,fontSize:'clamp(1.6rem,2.5vw,2.2rem)',letterSpacing:'-0.04em',marginBottom:'0.3rem'}}>Match Preview</div>
            <div style={{fontSize:'0.875rem',color:pal.textMuted,fontWeight:300}}>How your profile scores against potential peers</div>
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'1.2rem 1.5rem',background:'linear-gradient(135deg,rgba(26,107,255,.08),rgba(0,229,195,.04))',border:'1px solid rgba(26,107,255,.15)',borderRadius:'12px',marginBottom:'1rem'}}>
          <div>
            <div style={{fontSize:'0.75rem',color:pal.textMuted,marginBottom:'0.2rem'}}>Overall Match Score</div>
            <div style={{fontFamily:'Syne',fontSize:'2rem',fontWeight:800,background:'linear-gradient(90deg,#1A6BFF,#00E5C3)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>{matchScore}%</div>
            <div style={{fontSize:'0.75rem',color:pal.textDim,marginTop:'0.1rem'}}>Based on profile completeness</div>
          </div>
          <div style={{fontSize:'3rem'}}>🔗</div>
        </div>

        <Card title="📊 Matching Dimensions">
          {dims.map((d, i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:'0.8rem',marginBottom:'0.8rem'}}>
              <div style={{fontSize:'0.82rem',color:pal.textMuted,width:'130px',flexShrink:0}}>{d.label}</div>
              <div style={{flex:1,height:'5px',background:pal.progressBg,borderRadius:'99px',overflow:'hidden'}}><div style={{height:'100%',borderRadius:'99px',background:'linear-gradient(90deg,#1A6BFF,#00E5C3)',width:`${d.pct}%`,transition:'width 0.8s cubic-bezier(.16,1,.3,1)'}}></div></div>
              <div style={{fontSize:'0.75rem',color:pal.textMuted,width:'30px',textAlign:'right',flexShrink:0}}>{Math.round(d.pct)}%</div>
            </div>
          ))}
        </Card>

        <Card title="💡 Tips to Improve Your Score">
          <div style={{display:'flex',flexDirection:'column',gap:'0.7rem'}}>
            {suggestions.slice(0, 4).map((s, i) => (
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'0.8rem',padding:'0.8rem 0',borderBottom:`1px solid ${pal.cardBorder}`}}>
                <span style={{fontSize:'1.1rem'}}>{s.icon}</span>
                <span style={{fontSize:'0.85rem',color:pal.textSemi,lineHeight:1.5}}>{s.text}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* --- Need a Group section --- */}
        <Card title="🔗 Need a Group" id="group">
          {matches.length > 0 ? (
            <div style={{display:'flex',flexDirection:'column',gap:'0.6rem',fontSize:'0.9rem'}}>
              {matches.slice(0, 5).map((m,i) => {
                const matchId = m.student?._id;
                const selected = selectedMatchIds.includes(matchId);
                return (
                <div key={m.student?._id||i} style={{padding:'0.5rem',background:pal.cardBg,borderRadius:'8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:600,color:pal.text}}>{m.student?.name || 'Unknown'}</div>
                    <div style={{fontSize:'0.8rem',color:pal.textMuted}}>
                      Score: {Math.round((m.score||0)*100)}%
                      {m.student?.university && ` • ${m.student.university}`}
                      {m.student?.degreeProgram && ` – ${m.student.degreeProgram}`}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleMatchSelection(matchId)}
                    style={{padding:'0.4rem 0.8rem',borderRadius:'8px',background:selected?'#00E5C3':isDk?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)',border:isDk?'1px solid rgba(255,255,255,.15)':'1px solid rgba(0,0,0,.18)',color:selected?'#000':pal.text,cursor:'pointer',fontSize:'0.8rem'}}
                  >
                    {selected ? 'Selected' : 'Select'}
                  </button>
                </div>
              );
              })}
            </div>
          ) : (
            <div style={{fontSize:'0.9rem',color:pal.textMuted}}>
              {manualMatchChecked
                ? 'Sorry, no matched students.'
                : 'No group matches yet. Complete more profile sections (subjects, availability, interests) to generate matches.'}
            </div>
          )}
          <div style={{fontSize:'0.78rem',color:pal.textMuted,marginTop:'0.7rem'}}>
            Selected: {selectedMatchIds.length}/4 members (maximum)
          </div>
          <button onClick={() => fetchMatches(true)} style={{marginTop:'1rem',padding:'0.7rem 1.4rem',borderRadius:'10px',background:'#1A6BFF',border:'none',color:'white',cursor:'pointer',fontWeight:500}}>Find Matching Members</button>
          <button onClick={() => requestGrouping()} style={{marginTop:'0.6rem',padding:'0.7rem 1.4rem',borderRadius:'10px',background:'#00E5C3',border:'none',color:'#03121f',cursor:'pointer',fontWeight:700}}>Send Group Request</button>
        </Card>

        <Card title="📨 Group Requests">
          {groupRequests.length === 0 ? (
            <div style={{fontSize:'0.9rem',color:pal.textMuted}}>No group requests yet.</div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'0.7rem'}}>
              {groupRequests.map((req) => {
                const mine = String(req.requestedBy?._id || req.requestedBy) === String(profile.user?._id || profile.user);
                const myInvite = (req.invitees || []).find((i) => String(i.user?._id || i.user) === String(profile.user?._id || profile.user));
                const pendingForMe = !mine && req.status === 'pending' && myInvite?.status === 'pending';
                const iAccepted = myInvite?.status === 'accepted';
                const allAccepted = (req.invitees || []).every((i) => i.status === 'accepted');
                const acceptedCount = (req.invitees || []).filter((i) => i.status === 'accepted').length;
                const totalInvitees = (req.invitees || []).length;
                return (
                  <div key={req._id} style={{padding:'0.8rem',background:pal.cardBg,borderRadius:'10px',border:`1px solid ${pal.cardBorder}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'0.5rem',marginBottom:'0.35rem'}}>
                      <div style={{fontWeight:600,fontSize:'0.9rem',color:pal.text}}>
                        {mine ? 'Request sent by you' : `Request from ${req.requestedBy?.name || 'member'}`}
                      </div>
                      <span style={{fontSize:'0.72rem',padding:'0.2rem 0.55rem',borderRadius:'99px',background:req.status==='grouped'?'rgba(0,229,195,.18)':'rgba(255,184,0,.15)',color:req.status==='grouped'?'#00E5C3':'#ffd369'}}>{req.status}</span>
                    </div>

                    {/* Acceptance progress */}
                    {req.status === 'pending' && (
                      <div style={{fontSize:'0.78rem',color:pal.textMuted,marginBottom:'0.5rem'}}>
                        ✅ {acceptedCount}/{totalInvitees} members accepted — all must accept to form group
                      </div>
                    )}

                    {/* Members with their acceptance status */}
                    <div style={{fontSize:'0.78rem',color:pal.textMuted,marginBottom:'0.15rem',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em'}}>Members</div>
                    <div style={{display:'flex',flexDirection:'column',gap:'0.3rem',marginBottom:'0.5rem'}}>
                      {/* Requester (always accepted) */}
                      <div style={{display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.35rem 0.6rem',borderRadius:'8px',background:pal.surfaceBg}}>
                        <span style={{fontSize:'0.82rem',flex:1}}>{mine ? 'You (requester)' : (req.requestedBy?.name || 'Requester')}</span>
                        <span style={{fontSize:'0.68rem',padding:'0.15rem 0.45rem',borderRadius:'99px',background:'rgba(0,229,195,.15)',color:'#00E5C3'}}>✓ creator</span>
                      </div>
                      {/* Invitees with status */}
                      {(req.invitees || []).map((invitee) => {
                        const isMe = String(invitee.user?._id || invitee.user) === String(profile.user?._id || profile.user);
                        return (
                          <div key={invitee.user?._id || invitee.user} style={{display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.35rem 0.6rem',borderRadius:'8px',background:'rgba(255,255,255,.03)'}}>
                            <span style={{fontSize:'0.82rem',flex:1}}>{isMe ? 'You' : (invitee.user?.name || 'Member')}</span>
                            <span style={{fontSize:'0.68rem',padding:'0.15rem 0.45rem',borderRadius:'99px',background:invitee.status==='accepted'?'rgba(0,229,195,.15)':'rgba(255,184,0,.12)',color:invitee.status==='accepted'?'#00E5C3':'#ffd369'}}>
                              {invitee.status === 'accepted' ? '✓ accepted' : '⏳ pending'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setDetailsPopup({ show: true, invitee, request: req })}
                              style={{padding:'0.2rem 0.5rem',borderRadius:'6px',border:`1px solid ${pal.cardBorderHvy}`,background:pal.surfaceBg,color:pal.textMuted,cursor:'pointer',fontSize:'0.68rem'}}
                            >
                              Details
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Accept / Reject for my pending invite */}
                    {pendingForMe && (
                      <div style={{display:'flex',gap:'0.6rem',marginTop:'0.5rem',padding:'0.6rem',background:'rgba(26,107,255,.06)',borderRadius:'10px',border:'1px solid rgba(26,107,255,.15)'}}>
                        <div style={{flex:1,fontSize:'0.82rem',color:pal.textSemi,display:'flex',alignItems:'center'}}>You have been invited to this group</div>
                        <button type="button" onClick={() => respondToRequest(req._id, 'accept')} style={{padding:'0.5rem 1rem',borderRadius:'8px',background:'#00E5C3',border:'none',color:'#03121f',cursor:'pointer',fontWeight:700,fontSize:'0.82rem'}}>✓ Accept</button>
                        <button type="button" onClick={() => respondToRequest(req._id, 'reject')} style={{padding:'0.5rem 1rem',borderRadius:'8px',background:'rgba(255,82,114,.15)',border:'1px solid rgba(255,82,114,.35)',color:'#ff8aa2',cursor:'pointer',fontWeight:600,fontSize:'0.82rem'}}>✕ Reject</button>
                      </div>
                    )}

                    {/* Show "you accepted" badge for accepted invitees when still pending overall */}
                    {!mine && iAccepted && req.status === 'pending' && (
                      <div style={{marginTop:'0.5rem',fontSize:'0.82rem',color:'#00E5C3'}}>
                        ✓ You accepted — waiting for others to accept
                      </div>
                    )}

                    {/* Delete button — any member can delete */}
                    {req.status === 'pending' && (
                      <div style={{display:'flex',gap:'0.6rem',marginTop:'0.7rem'}}>
                        <button
                          type="button"
                          onClick={() => deleteGroupRequest(req._id)}
                          style={{padding:'0.45rem 0.85rem',borderRadius:'8px',background:'rgba(255,82,114,.15)',border:'1px solid rgba(255,82,114,.35)',color:'#ff8aa2',cursor:'pointer',fontWeight:600}}
                        >
                          🗑 Delete Request
                        </button>
                      </div>
                    )}

                    {req.status === 'grouped' && (
                      <div style={{display:'flex',gap:'0.6rem',marginTop:'0.7rem'}}>
                        <button
                          type="button"
                          onClick={() => navigate('/study-room')}
                          style={{padding:'0.45rem 0.85rem',borderRadius:'8px',background:'linear-gradient(135deg,#1A6BFF,#00E5C3)',border:'none',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:'0.82rem'}}
                        >
                          📚 Open Study Room
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteGroupRequest(req._id)}
                          style={{padding:'0.45rem 0.85rem',borderRadius:'8px',background:'rgba(255,82,114,.15)',border:'1px solid rgba(255,82,114,.35)',color:'#ff8aa2',cursor:'pointer',fontWeight:600}}
                        >
                          🗑 Leave & Delete Group
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    );
  }

  function renderWellness() {
    // Feature order matches StressLevelDataset.csv exactly (same as training)
    const QUESTIONS = [
      { id: 0,  text: 'How anxious have you been feeling lately?',                          type: 'slider', min: 0, max: 21, lo: 'Not at all', hi: 'Extremely' },
      { id: 1,  text: 'How would you rate your self-esteem?',                               type: 'slider', min: 0, max: 30, lo: 'Very low', hi: 'Very high' },
      { id: 2,  text: 'Do you have a history of mental health issues?',                     type: 'binary' },
      { id: 3,  text: 'How depressed or hopeless have you been feeling lately?',            type: 'slider', min: 0, max: 27, lo: 'Not at all', hi: 'Severely' },
      { id: 4,  text: 'How frequently do you experience headaches?',                        type: 'scale',  min: 0, max: 5,  lo: 'Never', hi: 'Daily' },
      { id: 5,  text: 'What is your blood pressure level?',                                 type: 'choice', options: [{val:1,label:'Normal'},{val:2,label:'High (Stage 1)'},{val:3,label:'High (Stage 2)'}] },
      { id: 6,  text: 'How would you rate your sleep quality?',                             type: 'scale',  min: 0, max: 5,  lo: 'Very poor', hi: 'Excellent' },
      { id: 7,  text: 'How often do you experience breathing problems or chest tightness?', type: 'scale',  min: 0, max: 5,  lo: 'Never', hi: 'Very often' },
      { id: 8,  text: 'How noisy is your study or living environment?',                     type: 'scale',  min: 0, max: 5,  lo: 'Very quiet', hi: 'Extremely noisy' },
      { id: 9,  text: 'How would you rate your overall living conditions?',                 type: 'scale',  min: 0, max: 5,  lo: 'Very poor', hi: 'Excellent' },
      { id: 10, text: 'How safe do you feel in your physical environment?',                 type: 'scale',  min: 0, max: 5,  lo: 'Very unsafe', hi: 'Very safe' },
      { id: 11, text: 'Are your basic needs (food, shelter, transport) being met?',         type: 'scale',  min: 0, max: 5,  lo: 'Not at all', hi: 'Fully met' },
      { id: 12, text: 'How well are you performing academically right now?',                type: 'scale',  min: 0, max: 5,  lo: 'Very poorly', hi: 'Excellently' },
      { id: 13, text: 'How heavy is your current study load or workload?',                  type: 'scale',  min: 0, max: 5,  lo: 'Very light', hi: 'Extremely heavy' },
      { id: 14, text: 'How well do you get along with your teachers or professors?',        type: 'scale',  min: 0, max: 5,  lo: 'Very poorly', hi: 'Very well' },
      { id: 15, text: 'How concerned are you about your future career prospects?',          type: 'scale',  min: 0, max: 5,  lo: 'Not at all', hi: 'Extremely' },
      { id: 16, text: 'How strong is your social support network (friends/family)?',        type: 'choice', options: [{val:0,label:'None'},{val:1,label:'Low'},{val:2,label:'Medium'},{val:3,label:'High'}] },
      { id: 17, text: 'How much peer pressure do you feel from those around you?',          type: 'scale',  min: 0, max: 5,  lo: 'None', hi: 'Extreme' },
      { id: 18, text: 'How involved are you in extracurricular activities?',                type: 'scale',  min: 0, max: 5,  lo: 'Not at all', hi: 'Very involved' },
      { id: 19, text: 'How often do you face bullying or harassment?',                      type: 'scale',  min: 0, max: 5,  lo: 'Never', hi: 'Very often' },
    ];

    const handleAnswerChange = (idx, val) => {
      const next = [...wellnessAnswers];
      next[idx] = Number(val);
      setWellnessAnswers(next);
    };

    const handleSubmit = async () => {
      setStressLoading(true);
      setStressResult(null);
      try {
        const res = await api.post('/stress/predict', { answers: wellnessAnswers });
        setStressResult(res.data);
        // Prepend new record to local history so graph updates instantly
        if (res.data && res.data.stress_label) {
          const today = new Date().toISOString().slice(0, 10);
          const newRecord = {
            date:  today,
            score: res.data.score ?? 0,
            level: res.data.stress_label,
          };
          setStressHistory(prev => [newRecord, ...prev]);
        }
      } catch (err) {
        setStressResult({ error: err.response?.data?.error || err.response?.data?.message || 'Assessment failed. Please try again.' });
      } finally {
        setStressLoading(false);
      }
    };

    const levelColor  = { Low: '#00E5C3',              Medium: '#F59E0B',              High: '#FF5272' };
    const levelBg     = { Low: 'rgba(0,229,195,.10)',   Medium: 'rgba(245,158,11,.10)', High: 'rgba(255,82,114,.10)' };
    const levelBorder = { Low: 'rgba(0,229,195,.25)',   Medium: 'rgba(245,158,11,.25)', High: 'rgba(255,82,114,.25)' };
    const levelEmoji  = { Low: '😊', Medium: '😐', High: '😰' };
    const levelRecs   = {
      Low:    ['Keep up your healthy habits!', 'Continue regular exercise and a good sleep routine.', 'Practice mindfulness to maintain balance.'],
      Medium: ['Break large tasks into smaller steps to reduce overwhelm.', 'Ensure you get 7–9 hours of sleep each night.', 'Reach out to peers or a counsellor if pressure builds.', 'Short daily walks or light stretching can help reset focus.'],
      High:   ['Please consider speaking with your university counsellor.', 'Prioritise self-care: sleep, nutrition, and light exercise.', 'Avoid overloading your schedule — it is okay to say no.', 'Connect with your support network: friends, family, or peers.'],
    };

    return (
      <div style={{animation:'fadeIn 0.4s ease-out'}}>

        {/* ── Section header ── */}
        <h2 style={{fontFamily:'Syne',fontSize:'1.6rem',fontWeight:800,letterSpacing:'-0.04em',background:'linear-gradient(120deg,#1A6BFF,#38BFFF)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',marginBottom:'1.6rem'}}>
          Wellness
        </h2>

        {/* ── Sub-nav tabs ── */}
        <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap',marginBottom:'2rem',borderBottom:`1px solid ${pal.cardBorder}`,paddingBottom:'0'}}>
          {[
            { key:'wellness',   icon:'🩺', label:'Wellness Check' },
            { key:'relaxation', icon:'🧘', label:'Relaxation Tools' },
            { key:'history',    icon:'📊', label:'History' },
          ].map(t => (
            <button key={t.key} onClick={() => setWellnessTab(t.key)} style={{
              display:'flex',alignItems:'center',gap:'0.45rem',
              padding:'0.55rem 1.2rem',borderRadius:'10px 10px 0 0',
              fontSize:'0.85rem',fontWeight:600,cursor:'pointer',border:'none',
              transition:'all 0.2s',
              background: wellnessTab === t.key ? (isDk ? 'rgba(26,107,255,.18)' : 'rgba(26,107,255,.1)') : 'transparent',
              borderBottom: wellnessTab === t.key ? '2px solid #1A6BFF' : '2px solid transparent',
              color: wellnessTab === t.key ? '#38BFFF' : pal.textMuted,
            }}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════
            TAB: Wellness Check (questionnaire)
        ══════════════════════════════════════ */}
        {wellnessTab === 'wellness' && (<>
          <p style={{color:pal.textMuted,fontSize:'0.88rem',marginBottom:'2rem'}}>
            Answer honestly — this AI model estimates your stress level and recommends actions.
          </p>
        <h2 style={{fontFamily:'Syne',fontSize:'1.6rem',fontWeight:800,letterSpacing:'-0.04em',background:'linear-gradient(120deg,#1A6BFF,#38BFFF)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',marginBottom:'0.4rem'}}>
          Wellness Check
        </h2>
        <p style={{color:pal.textMuted,fontSize:'0.88rem',marginBottom:'2rem'}}>
          Answer honestly — this AI model estimates your stress level and recommends actions.
        </p>

        {QUESTIONS.map((q) => (
          <div key={q.id} style={{marginBottom:'1rem',padding:'1.2rem 1.4rem',background:pal.inputBg,border:`1px solid ${pal.cardBorder}`,borderRadius:'14px'}}>
            <div style={{fontSize:'0.87rem',color:pal.textSemi,marginBottom:'0.8rem',fontWeight:500}}>
              <span style={{color:pal.textDim,marginRight:'0.5rem',fontSize:'0.72rem'}}>Q{q.id + 1}</span>
              {q.text}
            </div>

            {q.type === 'slider' && (
              <div>
                <input type="range" min={q.min} max={q.max} step={1} value={wellnessAnswers[q.id]}
                  onChange={e => handleAnswerChange(q.id, e.target.value)}
                  style={{width:'100%',accentColor:'#1A6BFF',marginBottom:'0.4rem'}} />
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.7rem',color:pal.textDim}}>
                  <span>{q.lo} ({q.min})</span>
                  <span style={{color:'#38BFFF',fontWeight:700,fontSize:'0.85rem'}}>{wellnessAnswers[q.id]}</span>
                  <span>{q.hi} ({q.max})</span>
                </div>
              </div>
            )}

            {q.type === 'binary' && (
              <div style={{display:'flex',gap:'0.8rem'}}>
                {[['No', 0], ['Yes', 1]].map(([label, val]) => (
                  <button key={label} type="button" onClick={() => handleAnswerChange(q.id, val)}
                    style={{padding:'0.45rem 1.4rem',borderRadius:'8px',fontSize:'0.82rem',fontWeight:600,cursor:'pointer',transition:'all 0.15s',
                      background: wellnessAnswers[q.id] === val ? 'rgba(26,107,255,.15)' : pal.inputBg,
                      border:     wellnessAnswers[q.id] === val ? '1.5px solid #1A6BFF' : `1.5px solid ${pal.inputBorder}`,
                      color:      wellnessAnswers[q.id] === val ? pal.text : pal.textMuted}}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {q.type === 'scale' && (
              <div>
                <div style={{display:'flex',gap:'0.4rem'}}>
                  {Array.from({length: q.max - q.min + 1}, (_, i) => q.min + i).map(n => (
                    <button key={n} type="button" onClick={() => handleAnswerChange(q.id, n)}
                      style={{flex:1,padding:'0.5rem 0.1rem',borderRadius:'8px',fontSize:'0.8rem',fontWeight:600,cursor:'pointer',transition:'all 0.15s',textAlign:'center',
                        background: wellnessAnswers[q.id] === n ? 'rgba(26,107,255,.15)' : pal.inputBg,
                        border:     wellnessAnswers[q.id] === n ? '1.5px solid #1A6BFF' : `1.5px solid ${pal.inputBorder}`,
                        color:      wellnessAnswers[q.id] === n ? pal.text : pal.textMuted}}>
                      {n}
                    </button>
                  ))}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.68rem',color:pal.textDim,marginTop:'0.3rem'}}>
                  <span>← {q.lo}</span><span>{q.hi} →</span>
                </div>
              </div>
            )}

            {q.type === 'choice' && (
              <div style={{display:'flex',flexWrap:'wrap',gap:'0.5rem'}}>
                {q.options.map(opt => (
                  <button key={opt.val} type="button" onClick={() => handleAnswerChange(q.id, opt.val)}
                    style={{padding:'0.45rem 1rem',borderRadius:'8px',fontSize:'0.82rem',fontWeight:600,cursor:'pointer',transition:'all 0.15s',
                      background: wellnessAnswers[q.id] === opt.val ? 'rgba(26,107,255,.15)' : pal.inputBg,
                      border:     wellnessAnswers[q.id] === opt.val ? '1.5px solid #1A6BFF' : `1.5px solid ${pal.inputBorder}`,
                      color:      wellnessAnswers[q.id] === opt.val ? pal.text : pal.textMuted}}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        <button onClick={handleSubmit} disabled={stressLoading}
          style={{display:'block',width:'100%',padding:'0.9rem',borderRadius:'12px',marginTop:'1rem',
            background: stressLoading ? 'rgba(26,107,255,.2)' : 'linear-gradient(135deg,#1A6BFF,#00E5C3)',
            border:'none',color:'#fff',fontSize:'0.95rem',fontWeight:700,
            cursor: stressLoading ? 'not-allowed' : 'pointer',opacity: stressLoading ? 0.6 : 1}}>
          {stressLoading ? 'Analysing…' : 'Get My Stress Assessment'}
        </button>

        {stressResult && !stressResult.error && (

          /* ── Result Popup Modal ── */
          <div
            onClick={() => setStressResult(null)}
            style={{
              position:'fixed',inset:0,zIndex:9000,
              display:'flex',alignItems:'center',justifyContent:'center',
              background:'rgba(10,14,26,0.75)',backdropFilter:'blur(6px)',
              padding:'1rem',
              animation:'fadeIn 0.25s ease-out',
            }}>
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position:'relative',width:'100%',maxWidth:460,
                background: isDk ? 'rgba(13,23,48,0.97)' : '#fff',
                border:`1.5px solid ${levelBorder[stressResult.stress_label]}`,
                borderRadius:20,padding:'2rem',
                boxShadow:`0 24px 80px ${levelColor[stressResult.stress_label]}22`,
                animation:'slideUp 0.3s cubic-bezier(.16,1,.3,1)',
              }}>

              {/* Close button */}
              <button
                onClick={() => setStressResult(null)}
                style={{
                  position:'absolute',top:'1rem',right:'1rem',
                  width:32,height:32,borderRadius:'50%',
                  background:pal.inputBg,border:`1px solid ${pal.cardBorder}`,
                  color:pal.textMuted,fontSize:'1rem',lineHeight:1,
                  cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                }}>
                ✕
              </button>

              {/* Header */}
              <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1.4rem'}}>
                <span style={{fontSize:'3rem',lineHeight:1}}>{levelEmoji[stressResult.stress_label]}</span>
                <div>
                  <div style={{fontSize:'0.7rem',letterSpacing:'0.12em',textTransform:'uppercase',color:pal.textMuted,marginBottom:'0.25rem'}}>AI Assessment Result</div>
                  <div style={{fontFamily:'Syne',fontSize:'1.9rem',fontWeight:800,letterSpacing:'-0.03em',color:levelColor[stressResult.stress_label]}}>
                    {stressResult.stress_label} Stress
                  </div>
                  {stressResult.score !== undefined && (
                    <div style={{fontSize:'0.8rem',color:pal.textDim,marginTop:'0.15rem'}}>
                      Score: <strong style={{color:levelColor[stressResult.stress_label]}}>{stressResult.score}/100</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Score bar */}
              {stressResult.score !== undefined && (
                <div style={{marginBottom:'1.4rem'}}>
                  <div style={{height:8,borderRadius:4,background:pal.progressBg,overflow:'hidden'}}>
                    <div style={{
                      height:'100%',width:`${stressResult.score}%`,borderRadius:4,
                      background:`linear-gradient(90deg,${levelColor[stressResult.stress_label]},${levelColor[stressResult.stress_label]}88)`,
                      transition:'width 0.8s ease',
                    }}/>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.65rem',color:pal.textDim,marginTop:'0.3rem'}}>
                    <span>0 – Low</span><span>31 – Medium</span><span>71 – High</span>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:pal.textMuted,marginBottom:'0.7rem'}}>Recommendations</div>
              <ul style={{margin:'0 0 1.4rem',paddingLeft:'1.1rem'}}>
                {levelRecs[stressResult.stress_label].map((rec, i) => (
                  <li key={i} style={{color:pal.textSemi,fontSize:'0.86rem',marginBottom:'0.45rem',lineHeight:1.6}}>{rec}</li>
                ))}
              </ul>

              {/* Quick-access relaxation tools */}
              <div style={{paddingTop:'1rem',borderTop:`1px solid ${levelBorder[stressResult.stress_label]}`}}>
                <div style={{fontSize:'0.7rem',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:pal.textMuted,marginBottom:'0.7rem'}}>Try a Relaxation Exercise</div>
                <div style={{display:'flex',gap:'0.6rem',flexWrap:'wrap'}}>
                  <button onClick={() => { setStressResult(null); setWellnessTab('relaxation'); setRelaxView('breathing-exercise'); window.scrollTo({top:0,behavior:'smooth'}); }}
                    style={{flex:'1 1 auto',padding:'0.6rem 1rem',borderRadius:'9px',fontSize:'0.83rem',fontWeight:700,cursor:'pointer',border:'none',
                      background:'linear-gradient(135deg,#1A6BFF,#38BFFF)',color:'#fff',
                      boxShadow:'0 4px 14px rgba(26,107,255,.3)'}}>
                    🌬️ Breathing Exercise
                  </button>
                  <button onClick={() => { setStressResult(null); setWellnessTab('relaxation'); setRelaxView('meditation-timer'); window.scrollTo({top:0,behavior:'smooth'}); }}
                    style={{flex:'1 1 auto',padding:'0.6rem 1rem',borderRadius:'9px',fontSize:'0.83rem',fontWeight:700,cursor:'pointer',border:'none',
                      background:'linear-gradient(135deg,#00E5C3,#38BFFF)',color:'#fff',
                      boxShadow:'0 4px 14px rgba(0,229,195,.25)'}}>
                    ⏱ Meditation Timer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {stressResult?.error && (
          <div style={{marginTop:'1.5rem',padding:'1rem 1.4rem',borderRadius:'12px',
            background:'rgba(255,82,114,.08)',border:'1px solid rgba(255,82,114,.2)',
            color:'#ff98ad',fontSize:'0.85rem'}}>
            ⚠ {stressResult.error}
          </div>
        )}
        </>)}
        {/* ── End Tab: Wellness ── */}

        {/* ══════════════════════════════════════
            TAB: Relaxation Tools
        ══════════════════════════════════════ */}
        {wellnessTab === 'relaxation' && (() => {
          const isBr = relaxView.startsWith('breathing');
          const contentBorder = isBr ? '1.5px solid #38BFFF44' : '1.5px solid #00E5C344';
          const contentShadow = isBr ? '0 8px 32px rgba(56,191,255,.1)' : '0 8px 32px rgba(0,229,195,.1)';
          return (
          <div style={{animation:'fadeIn 0.3s ease-out'}}>

            {/* ── Row: 2 selector cards ── */}
            <div style={{display:'flex',gap:'1rem',flexWrap:'wrap',marginBottom:'1.2rem'}}>

              {/* Selector: Breathing Exercise */}
              <div style={{
                flex:'1 1 220px',padding:'1.1rem 1.2rem',borderRadius:16,
                border: relaxView.startsWith('breathing') ? '1.5px solid #38BFFF88' : `1.5px solid ${pal.cardBorder}`,
                background: relaxView.startsWith('breathing')
                  ? (isDk ? 'rgba(56,191,255,.07)' : 'rgba(56,191,255,.06)')
                  : (isDk ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.7)'),
                boxShadow: relaxView.startsWith('breathing') ? '0 4px 20px rgba(56,191,255,.1)' : 'none',
                transition:'all 0.25s',
              }}>
                {/* Icon + title */}
                <div style={{display:'flex',alignItems:'center',gap:'0.65rem',marginBottom:'1rem'}}>
                  <div style={{
                    width:40,height:40,borderRadius:10,flexShrink:0,
                    background:'linear-gradient(135deg,rgba(56,191,255,.2),rgba(26,107,255,.1))',
                    border:'1.5px solid rgba(56,191,255,.35)',
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',
                  }}>🌬️</div>
                  <div>
                    <div style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'0.93rem',color:pal.text}}>Breathing Exercise</div>
                    <div style={{fontSize:'0.71rem',color:pal.textDim,marginTop:'0.1rem'}}>4 – 4 – 4 box breathing technique</div>
                  </div>
                </div>
                {/* Buttons */}
                <div style={{display:'flex',gap:'0.45rem',flexWrap:'wrap'}}>
                  <button
                    onClick={() => setRelaxView('breathing-video')}
                    style={{
                      flex:'1 1 auto',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.35rem',
                      padding:'0.45rem 0.8rem',borderRadius:8,fontSize:'0.78rem',fontWeight:600,cursor:'pointer',transition:'all 0.2s',
                      background: relaxView === 'breathing-video' ? 'rgba(56,191,255,.18)' : pal.inputBg,
                      border: relaxView === 'breathing-video' ? '1.5px solid #38BFFF' : `1.5px solid ${pal.inputBorder}`,
                      color: relaxView === 'breathing-video' ? '#38BFFF' : pal.textMuted,
                    }}>
                    📹 Video Guide
                  </button>
                  <button
                    onClick={() => setRelaxView('breathing-exercise')}
                    style={{
                      flex:'1 1 auto',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.35rem',
                      padding:'0.45rem 0.8rem',borderRadius:8,fontSize:'0.78rem',fontWeight:600,cursor:'pointer',transition:'all 0.2s',
                      background: relaxView === 'breathing-exercise' ? 'rgba(56,191,255,.18)' : pal.inputBg,
                      border: relaxView === 'breathing-exercise' ? '1.5px solid #38BFFF' : `1.5px solid ${pal.inputBorder}`,
                      color: relaxView === 'breathing-exercise' ? '#38BFFF' : pal.textMuted,
                    }}>
                    🌬️ Start Exercise
                  </button>
                </div>
              </div>

              {/* Selector: Meditation Timer */}
              <div style={{
                flex:'1 1 220px',padding:'1.1rem 1.2rem',borderRadius:16,
                border: relaxView.startsWith('meditation') ? '1.5px solid #00E5C388' : `1.5px solid ${pal.cardBorder}`,
                background: relaxView.startsWith('meditation')
                  ? (isDk ? 'rgba(0,229,195,.07)' : 'rgba(0,229,195,.05)')
                  : (isDk ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.7)'),
                boxShadow: relaxView.startsWith('meditation') ? '0 4px 20px rgba(0,229,195,.1)' : 'none',
                transition:'all 0.25s',
              }}>
                {/* Icon + title */}
                <div style={{display:'flex',alignItems:'center',gap:'0.65rem',marginBottom:'1rem'}}>
                  <div style={{
                    width:40,height:40,borderRadius:10,flexShrink:0,
                    background:'linear-gradient(135deg,rgba(0,229,195,.2),rgba(56,191,255,.1))',
                    border:'1.5px solid rgba(0,229,195,.35)',
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',
                  }}>⏱</div>
                  <div>
                    <div style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'0.93rem',color:pal.text}}>Meditation Timer</div>
                    <div style={{fontSize:'0.71rem',color:pal.textDim,marginTop:'0.1rem'}}>Timed guided meditation session</div>
                  </div>
                </div>
                {/* Buttons */}
                <div style={{display:'flex',gap:'0.45rem',flexWrap:'wrap'}}>
                  <button
                    onClick={() => setRelaxView('meditation-video')}
                    style={{
                      flex:'1 1 auto',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.35rem',
                      padding:'0.45rem 0.8rem',borderRadius:8,fontSize:'0.78rem',fontWeight:600,cursor:'pointer',transition:'all 0.2s',
                      background: relaxView === 'meditation-video' ? 'rgba(0,229,195,.18)' : pal.inputBg,
                      border: relaxView === 'meditation-video' ? '1.5px solid #00E5C3' : `1.5px solid ${pal.inputBorder}`,
                      color: relaxView === 'meditation-video' ? '#00E5C3' : pal.textMuted,
                    }}>
                    📹 Video Guide
                  </button>
                  <button
                    onClick={() => setRelaxView('meditation-timer')}
                    style={{
                      flex:'1 1 auto',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.35rem',
                      padding:'0.45rem 0.8rem',borderRadius:8,fontSize:'0.78rem',fontWeight:600,cursor:'pointer',transition:'all 0.2s',
                      background: relaxView === 'meditation-timer' ? 'rgba(0,229,195,.18)' : pal.inputBg,
                      border: relaxView === 'meditation-timer' ? '1.5px solid #00E5C3' : `1.5px solid ${pal.inputBorder}`,
                      color: relaxView === 'meditation-timer' ? '#00E5C3' : pal.textMuted,
                    }}>
                    ⏱ Start Timer
                  </button>
                </div>
              </div>
            </div>

            {/* ── Single content card ── */}
            <div key={relaxView} style={{
              border: contentBorder,
              borderRadius:18,overflow:'hidden',
              background: isDk ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.9)',
              boxShadow: contentShadow,
              animation:'fadeIn 0.3s ease-out',
              padding:'1.4rem 1.6rem',
            }}>
              {relaxView === 'breathing-exercise' && <BreathingExercise pal={pal} />}
              {relaxView === 'breathing-video' && (
                <div style={{position:'relative',paddingBottom:'56.25%',height:0,borderRadius:12,overflow:'hidden',background:'#000'}}>
                  <iframe
                    title="Breathing Exercise Guide"
                    src="https://www.youtube.com/embed/tybOi4hjZFQ"
                    style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',border:'none',borderRadius:12}}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              {relaxView === 'meditation-timer' && <MeditationTimer pal={pal} />}
              {relaxView === 'meditation-video' && (
                <div style={{position:'relative',paddingBottom:'56.25%',height:0,borderRadius:12,overflow:'hidden',background:'#000'}}>
                  <iframe
                    title="Meditation Guide"
                    src="https://www.youtube.com/embed/aIIEI33EUqI"
                    style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',border:'none',borderRadius:12}}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          </div>
          );
        })()}
        {/* ── End Tab: Relaxation Tools ── */}

        {/* ══════════════════════════════════════
            TAB: History
        ══════════════════════════════════════ */}
        {wellnessTab === 'history' && (
          <div style={{animation:'fadeIn 0.3s ease-out'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'0.5rem',marginBottom:'0.5rem'}}>
              <p style={{color:pal.textMuted,fontSize:'0.88rem',lineHeight:1.6,margin:0}}>
                Your stress level over time — line chart, history list, and level distribution.
              </p>
              {historyLoading && <span style={{fontSize:'0.75rem',color:pal.textDim}}>Loading…</span>}
            </div>
            <div style={{marginTop:'1.2rem'}}>
              <StressHistoryChart
                records={stressHistory}
                pal={pal}
                onClearHistory={async () => {
                  try {
                    await api.delete('/stress/history');
                    setStressHistory([]);
                  } catch (_) {}
                }}
              />
            </div>
          </div>
        )}
        {/* ── End Tab: History ── */}

      </div>
    );
  }
}

// Helper Components
const Card = ({title, children}) => (
  <div style={{background:'var(--sd-card-bg)',border:'1px solid var(--sd-border)',borderRadius:'16px',padding:'1.8rem',marginBottom:'1.2rem',backdropFilter:'blur(10px)',transition:'border-color 0.3s, background 0.3s'}}>
    {title && <div style={{fontFamily:'Syne',fontWeight:700,fontSize:'0.95rem',letterSpacing:'-0.01em',marginBottom:'1.2rem',display:'flex',alignItems:'center',gap:'0.6rem',color:'var(--sd-text)'}}>{title}</div>}
    {children}
  </div>
);

const Section = ({title, subtitle, children, onEdit, isEdit, onSave}) => (
  <div style={{animation:'fadeIn 0.4s cubic-bezier(.16,1,.3,1)'}}>
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'2rem',gap:'1rem',flexWrap:'wrap'}}>
      <div>
        <div style={{fontFamily:'Syne',fontWeight:800,fontSize:'clamp(1.6rem,2.5vw,2.2rem)',letterSpacing:'-0.04em',marginBottom:'0.3rem'}}>{title}</div>
        <div style={{fontSize:'0.875rem',color:'var(--sd-muted)',fontWeight:300}}>{subtitle}</div>
      </div>
      {onEdit && <button type="button" onClick={onEdit} style={{padding:'0.6rem 1.3rem',borderRadius:'10px',fontSize:'0.85rem',fontWeight:500,background:isEdit?'linear-gradient(135deg,#1A6BFF,#3a8bff)':'var(--sd-card-bg)',border:isEdit?'none':'1px solid var(--sd-border)',color:'var(--sd-text)',cursor:'pointer',transition:'all 0.25s'}}>{isEdit?'💾 Save':'✏ Edit'}</button>}
      {onSave && <button type="button" onClick={onSave} style={{padding:'0.6rem 1.3rem',borderRadius:'10px',fontSize:'0.85rem',fontWeight:500,background:'linear-gradient(135deg,#1A6BFF,#3a8bff)',border:'none',color:'white',cursor:'pointer',boxShadow:'0 6px 24px rgba(26,107,255,.3)',transition:'all 0.25s'}}>💾 Save</button>}
    </div>
    {children}
  </div>
);

const Field = ({label, value}) => (
  <div style={{display:'flex',flexDirection:'column',gap:'0.4rem',marginBottom:'0.8rem'}}>
    <label style={{fontSize:'0.75rem',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase',color:'var(--sd-muted)'}}>{label}</label>
    <div style={{fontSize:'0.9rem',color:'var(--sd-text)',padding:'0.5rem 0',borderBottom:'1px solid transparent',minHeight:'2rem',lineHeight:1.5}} className={value && value !== '—' ? '' : 'empty'}>{value || '—'}</div>
  </div>
);

const FieldDisplay = ({label, isEdit, value, onChange, onSave, placeholder, isSelect, range}) => (
  <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
    <label style={{fontSize:'0.75rem',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase',color:'var(--sd-muted)'}}>{label}</label>
    {!isEdit ? (
      <div style={{fontSize:'0.9rem',color:'var(--sd-text)',padding:'0.5rem 0',borderBottom:'1px solid transparent',minHeight:'2rem',lineHeight:1.5}}>{value || '—'}</div>
    ) : isSelect ? (
      <select style={{width:'100%',padding:'0.72rem 1rem',background:'var(--sd-input-bg)',border:'1.5px solid var(--sd-input-border)',borderRadius:'9px',color:'var(--sd-text)',fontFamily:'DM Sans',fontSize:'0.87rem',outline:'none'}} value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={onSave}>
        <option value="">Select...</option>
        {range && range.map(r => <option key={r}>{r}</option>)}
      </select>
    ) : (
      <input style={{width:'100%',padding:'0.72rem 1rem',background:'var(--sd-input-bg)',border:'1.5px solid var(--sd-input-border)',borderRadius:'9px',color:'var(--sd-text)',fontFamily:'DM Sans',fontSize:'0.87rem',outline:'none'}} type="text" placeholder={placeholder} value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={onSave} />
    )}
  </div>
);

const TagList = ({items, colorClass, onRemove}) => (
  <div style={{display:'flex',flexWrap:'wrap',gap:'0.4rem',padding:'0.3rem 0'}}>
    {(items && items.length > 0) ? items.map((t, i) => <TagDisplay key={i} text={t} colorClass={colorClass} onRemove={() => onRemove(i)} />) : <span style={{fontSize:'0.82rem',fontStyle:'italic',color:'var(--sd-faint)'}}>None added</span>}
  </div>
);

const TagDisplay = ({text, colorClass='', onRemove}) => {
  const colors = {green:'rgba(0,229,195,.08)', amber:'rgba(255,184,0,.08)', rose:'rgba(255,82,114,.08)', purple:'rgba(138,80,255,.08)'};
  const borderColors = {green:'rgba(0,229,195,.2)', amber:'rgba(255,184,0,.2)', rose:'rgba(255,82,114,.2)', purple:'rgba(138,80,255,.2)'};
  const textColors = {green:'#00E5C3', amber:'#FFB800', rose:'#FF5272', purple:'#b98bff'};
  return (
    <span style={{padding:'0.25rem 0.75rem',borderRadius:'99px',fontSize:'0.76rem',fontWeight:500,background:colors[colorClass]||'rgba(26,107,255,.1)',border:`1px solid ${borderColors[colorClass]||'rgba(26,107,255,.2)'}`,color:textColors[colorClass]||'#38BFFF',display:'inline-flex',alignItems:'center',gap:'0.4rem'}}>
      {text}
      <button type="button" onClick={onRemove} style={{cursor:'pointer',opacity:0.5,fontSize:'0.75rem',transition:'opacity 0.2s',lineHeight:1,background:'none',border:'none',color:'inherit'}}>✕</button>
    </span>
  );
};

const TagInput = ({onAdd}) => {
  const [val, setVal] = React.useState('');
  return (
    <div style={{display:'flex',gap:'0.5rem',marginTop:'0.5rem'}}>
      <input style={{flex:1,padding:'0.72rem 1rem',background:'var(--sd-input-bg)',border:'1.5px solid var(--sd-input-border)',borderRadius:'9px',color:'var(--sd-text)',fontFamily:'DM Sans',fontSize:'0.87rem',outline:'none'}} type="text" placeholder="Add..." value={val} onChange={e=>setVal(e.target.value)} onKeyPress={(e)=>{if(e.key==='Enter'){e.preventDefault();onAdd(val);setVal('');}}} />
      <button type="button" onClick={()=>{onAdd(val);setVal('');}} style={{padding:'0.6rem 0.9rem',borderRadius:'8px',fontSize:'0.8rem',background:'#1A6BFF',border:'none',color:'white',cursor:'pointer',fontWeight:500,whiteSpace:'nowrap'}}>+ Add</button>
    </div>
  );
};

const OptionGrid = ({options, selected, onChange}) => (
  <div style={{display:'flex',flexWrap:'wrap',gap:'0.4rem',padding:'0.2rem 0'}}>
    {options.map((opt, i) => (
      <button 
        type="button"
        key={i}
        onClick={() => onChange(opt)}
        style={{padding:'0.4rem 0.9rem',borderRadius:'8px',fontSize:'0.8rem',fontWeight:500,background:cleanEmoji(opt)===selected?'rgba(26,107,255,.12)':'var(--sd-opt-bg)',border:cleanEmoji(opt)===selected?'1.5px solid #1A6BFF':'1.5px solid var(--sd-opt-border)',color:cleanEmoji(opt)===selected?'var(--sd-text)':'var(--sd-opt-color)',cursor:'pointer',transition:'all 0.2s'}}
      >
        {opt}
      </button>
    ))}
  </div>
);

const StatCard = ({label, value}) => (
  <div style={{padding:'1.2rem',background:'var(--sd-card-bg)',border:'1px solid var(--sd-border)',borderRadius:'12px',textAlign:'center'}}>
    <div style={{fontFamily:'Syne',fontSize:'1.6rem',fontWeight:800,letterSpacing:'-0.04em',background:'linear-gradient(120deg,#1A6BFF,#38BFFF)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>{value}</div>
    <div style={{fontSize:'0.7rem',color:'var(--sd-dim)',marginTop:'0.15rem',letterSpacing:'0.03em'}}>{label}</div>
  </div>
);

function getIcon(section) {
  const icons = {overview:'🏠', academic:'🎓', subjects:'📚', goals:'🎯', learning:'🧠', interests:'⭐', availability:'📅', bookTutor:'👨‍🏫', wellness:'💆', 'mood-journal': '📒'};
  return icons[section] || '⚙';
}

function cleanEmoji(str) {
  return str.replace(/^[\p{Emoji}\s]+/u,'').trim();
}

function getStyles(theme) {
  const isDk = theme !== 'light';
  return `
    :root {
      --ink: ${isDk ? '#0A0E1A' : '#f0f4ff'};
      --azure: #1A6BFF;
      --aqua: #00E5C3;
      --muted: ${isDk ? 'rgba(255,255,255,.45)' : '#5a6a8a'};
      --glass: ${isDk ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,0.88)'};
      --border: ${isDk ? 'rgba(255,255,255,.09)' : 'rgba(26,107,255,.14)'};
      --white: ${isDk ? '#FFFFFF' : '#0d1b3e'};
      --sd-text: ${isDk ? '#FFFFFF' : '#0d1b3e'};
      --sd-muted: ${isDk ? 'rgba(255,255,255,.45)' : '#5a6a8a'};
      --sd-dim: ${isDk ? 'rgba(255,255,255,.25)' : '#7a86a8'};
      --sd-faint: ${isDk ? 'rgba(255,255,255,.15)' : '#a0abc4'};
      --sd-card-bg: ${isDk ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,0.88)'};
      --sd-border: ${isDk ? 'rgba(255,255,255,.09)' : 'rgba(26,107,255,.14)'};
      --sd-border-hvy: ${isDk ? 'rgba(255,255,255,.16)' : 'rgba(26,107,255,.28)'};
      --sd-input-bg: ${isDk ? 'rgba(255,255,255,.04)' : '#f0f4ff'};
      --sd-input-border: ${isDk ? 'rgba(255,255,255,.09)' : 'rgba(26,107,255,.2)'};
      --sd-opt-bg: ${isDk ? 'rgba(255,255,255,.04)' : '#f0f4ff'};
      --sd-opt-border: ${isDk ? 'rgba(255,255,255,.09)' : 'rgba(26,107,255,.15)'};
      --sd-opt-color: ${isDk ? 'rgba(255,255,255,.55)' : '#3a4669'};
      --sd-surface: ${isDk ? 'rgba(255,255,255,.03)' : 'rgba(240,244,255,.5)'};
    }
    * { box-sizing: border-box; }
    body { background: var(--ink); color: var(--sd-text); margin: 0; padding: 0; }
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      z-index: 0;
      background-image:
        linear-gradient(${isDk ? 'rgba(26,107,255,.04)' : 'rgba(26,107,255,.03)'} 1px, transparent 1px),
        linear-gradient(90deg, ${isDk ? 'rgba(26,107,255,.04)' : 'rgba(26,107,255,.03)'} 1px, transparent 1px);
      background-size: 60px 60px;
      pointer-events: none;
    }
    .orb { position: fixed; border-radius: 50%; filter: blur(120px); pointer-events: none; z-index: 0; }
    @keyframes d1 { to { transform: translate(40px, 60px); } }
    @keyframes d2 { to { transform: translate(-30px, -40px); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .empty { color: var(--sd-muted) !important; font-style: italic; }
    input:focus, select:focus { border-color: var(--azure) !important; background: rgba(26,107,255,.06) !important; }
    select option { background: ${isDk ? '#0D1730' : '#f0f4ff'}; color: ${isDk ? 'white' : '#0d1b3e'}; }
  `;
}
