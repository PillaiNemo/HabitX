import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Target, CheckCircle2, Rocket, Calendar, Check, Lock, Flame, Zap } from 'lucide-react';
import { HeatmapField, HeatmapFieldHandle } from '../components/HeatmapField';
import { StatCard } from '../components/StatCard';
import { FeaturesOrbit } from '../components/FeaturesOrbit';
import { CalendarProgress } from '../components/CalendarProgress';
import { HABIT_ICONS } from '../constants';
import { signUpWithEmail, signInWithEmail, signInWithGoogle } from '../lib/auth';
import './Landing.css';

const GSvg = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path fill="#EA4335" d="M5.27 9.77A7.1 7.1 0 0 1 12 4.9c1.69 0 3.22.6 4.41 1.59l3.3-3.3A11.9 11.9 0 0 0 12 1C7.31 1 3.26 3.81 1.28 7.82l3.99 1.95z"/>
    <path fill="#34A853" d="M16.04 18.01A7.07 7.07 0 0 1 12 19.1c-2.89 0-5.38-1.73-6.6-4.25l-3.97 1.98A11.9 11.9 0 0 0 12 23c2.97 0 5.73-1.06 7.83-2.82l-3.79-2.17z"/>
    <path fill="#FBBC05" d="M19.83 20.18A11.9 11.9 0 0 0 23 12c0-.68-.07-1.35-.18-2H12v4.5h6.19a5.37 5.37 0 0 1-2.15 3.51l3.79 2.17z"/>
    <path fill="#4285F4" d="M1.28 7.82A11.9 11.9 0 0 0 1 12c0 1.45.26 2.84.73 4.13l3.97-1.98A7.1 7.1 0 0 1 4.9 12c0-.77.13-1.52.36-2.23L1.28 7.82z"/>
  </svg>
);

// Splits a phrase into per-word spans carrying a --i stagger index, so each
// word rises into place a beat after the last instead of the whole line
// arriving as one static block. startIndex lets a second line continue the
// same stagger sequence rather than resetting to 0.
function AnimatedWords({ text, startIndex = 0 }: { text: string; startIndex?: number }) {
  const words = text.split(' ');
  return (
    <>
      {words.map((w, i) => (
        <React.Fragment key={i}>
          <span className="cal-word" style={{ ['--i' as any]: startIndex + i }}>{w}</span>
          {i < words.length - 1 ? ' ' : ''}
        </React.Fragment>
      ))}
    </>
  );
}

const SAMPLE_HABITS = [
  { id: 'workout', name: 'Workout', icon: 'dumbbell', color: '#FF0055' },
  { id: 'read', name: 'Read', icon: 'read', color: '#00D1FF' },
  { id: 'meditate', name: 'Meditate', icon: 'meditate', color: '#B026FF' },
  { id: 'code', name: 'Code', icon: 'coding', color: '#FFB800' },
];

const SAMPLE_GOALS = [
  { name: 'Run 100km', icon: 'run', color: '#00FF9C', current: 62, target: 100, unit: 'km' },
  { name: 'Read 12 books', icon: 'read', color: '#00D1FF', current: 7, target: 12, unit: 'books' },
];

const SAMPLE_ROWS: { date: string; day: string; done: boolean[]; progress: number; status: 'PEAK' | 'STABLE' | 'IDLE'; locked: boolean }[] = [
  { date: 'Jul 13', day: 'MON', done: [true, true, false, true], progress: 75, status: 'STABLE', locked: false },
  { date: 'Jul 12', day: 'SUN', done: [true, true, true, true], progress: 100, status: 'PEAK', locked: true },
  { date: 'Jul 11', day: 'SAT', done: [true, false, true, false], progress: 50, status: 'IDLE', locked: true },
  { date: 'Jul 10', day: 'FRI', done: [true, true, true, true], progress: 100, status: 'PEAK', locked: true },
];

const SAMPLE_STABILITY = [
  { ...SAMPLE_HABITS[0], consistency: 88 },
  { ...SAMPLE_HABITS[3], consistency: 74 },
  { ...SAMPLE_HABITS[1], consistency: 66 },
  { ...SAMPLE_HABITS[2], consistency: 52 },
];

const FACES = [
  { id: 'checkins', label: 'Check-ins', icon: <CheckCircle2 size={11} /> },
  { id: 'analysis', label: 'Analysis', icon: <BarChart3 size={11} /> },
  { id: 'habits', label: 'Habits', icon: <Target size={11} /> },
];

// Shortest signed step count (in face-units) from `current` to `target`
// around an N-sided ring, so the cube always spins the short way.
function shortestDelta(current: number, target: number, n: number) {
  let d = (target - current) % n;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

const HERO_TITLE_PARTS: { text: string; neon?: boolean }[] = [
  { text: 'Turn daily actions into ' },
  { text: 'unbreakable streaks.', neon: true },
];

// Types the hero headline out on load, character by character. Driven off
// elapsed time (not tick count) so it can't fall behind under timer throttling.
function useTypewriter(parts: { text: string; neon?: boolean }[], charDuration = 30, startDelay = 400, start = true) {
  const full = useMemo(() => parts.map(p => p.text).join(''), [parts]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;
    let raf = 0;
    let startTs: number | null = null;
    const t = setTimeout(() => {
      const step = (ts: number) => {
        if (startTs === null) startTs = ts;
        const c = Math.min(full.length, Math.floor((ts - startTs) / charDuration));
        setCount(c);
        if (c < full.length) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, startDelay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [full, charDuration, startDelay, start]);

  return { count, done: count >= full.length };
}

function renderTyped(parts: { text: string; neon?: boolean }[], count: number) {
  let consumed = 0;
  return parts.map((part, i) => {
    const start = consumed;
    consumed += part.text.length;
    const visible = Math.max(0, Math.min(part.text.length, count - start));
    if (visible <= 0) return null;
    return <span key={i} className={part.neon ? 'neon' : undefined}>{part.text.slice(0, visible)}</span>;
  });
}

// Counts a stat up from 0 to its target value once `start` flips true.
function useCountUp(target: number, duration = 1200, delay = 0, start = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    let startTs: number | null = null;
    const t = setTimeout(() => {
      const step = (ts: number) => {
        if (startTs === null) startTs = ts;
        const p = Math.min((ts - startTs) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(target * eased);
        if (p < 1) raf = requestAnimationFrame(step);
        else setValue(target);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [target, duration, delay, start]);
  return value;
}

// Thin progress bar fixed to the top of the page, filling 0→100% across the
// full scroll range — a constant, low-effort signal that the page responds
// to scroll, on top of the section-level parallax. Reads scroll position
// from the given scrollable element (the slide container) rather than the
// window, since the page itself no longer scrolls.
function useScrollProgress(containerRef: React.RefObject<HTMLDivElement>) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const apply = () => {
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0);
      raf = 0;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    el.addEventListener('scroll', onScroll, { passive: true });
    apply();
    return () => { el.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [containerRef]);
  return progress;
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('in-view');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function Landing() {
  const navigate = useNavigate();
  const heatmapRef = useRef<HeatmapFieldHandle>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const snapScrollRef = useRef<HTMLDivElement>(null);

  const [modal, setModal] = useState<'signup' | 'login' | null>(null);
  const [isSu, setIsSu] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // face + rotation move together as one atomic update — keeping them in a
  // single state avoids the "call setState inside another's updater" trap,
  // which React's dev-mode double-invoke will desync.
  const [cube, setCube] = useState({ face: 0, rotation: 0 });
  const [cubePaused, setCubePaused] = useState(false);
  const [cubeRadius, setCubeRadius] = useState(260);

  useReveal();
  const scrollProgress = useScrollProgress(snapScrollRef);

  // Nav picks up a stronger blur/shadow once the page has scrolled a bit.
  useEffect(() => {
    const el = snapScrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 8);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Mouse-tracked tilt on the dashboard mock — small perspective rotation
  // that follows the cursor so the hero isn't a flat, static screenshot.
  const handleTiltMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(1400px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg)`;
  };
  const handleTiltLeave = () => {
    const el = tiltRef.current;
    if (el) el.style.transform = 'perspective(1400px) rotateX(0deg) rotateY(0deg)';
  };

  // Radius the cube's faces sit at so a 3-sided ring encloses the scene's
  // measured width — recomputed whenever the mock resizes.
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const update = () => setCubeRadius(el.offsetWidth / (2 * Math.tan(Math.PI / FACES.length)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const goToFace = (target: number) => {
    setCube(({ face, rotation }) => {
      const delta = shortestDelta(face, target, FACES.length);
      return { face: target, rotation: rotation - delta * (360 / FACES.length) };
    });
  };

  // The interval below has no visibility check of its own, so without this
  // it keeps firing every 2s forever — including long after the user has
  // scrolled past the hero and can't see it. Tracked continuously (not a
  // one-shot observer like the reveal-once ones elsewhere) so it re-pauses
  // every time the hero scrolls back out of view, not just the first time.
  const [heroVisible, setHeroVisible] = useState(true);
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Auto-advances one face at a time; re-arms on every rotation so the dwell
  // time is consistent, and pauses while the cursor is over the mock or the
  // hero is scrolled out of view.
  useEffect(() => {
    if (cubePaused || !heroVisible) return;
    const t = setInterval(() => goToFace((cube.face + 1) % FACES.length), 2000);
    return () => clearInterval(t);
  }, [cubePaused, heroVisible, cube.face]);

  const { count: typedCount, done: typedDone } = useTypewriter(HERO_TITLE_PARTS);
  const [showCursor, setShowCursor] = useState(true);
  useEffect(() => {
    if (typedDone) {
      const t = setTimeout(() => setShowCursor(false), 900);
      return () => clearTimeout(t);
    }
  }, [typedDone]);

  const streakVal = useCountUp(47, 1300, 500);
  const consistencyVal = useCountUp(92, 1300, 650);
  const topHabitVal = useCountUp(88, 900, 800);

  // The hero's count-up values above finish long before anyone scrolls
  // down to the final CTA, so its stats bar would just show the same
  // numbers sitting static — give it its own count-up, gated on that
  // section actually coming into view, so it plays for real.
  const ctaStatsRef = useRef<HTMLDivElement>(null);
  const [ctaStatsVisible, setCtaStatsVisible] = useState(false);
  useEffect(() => {
    const el = ctaStatsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setCtaStatsVisible(true); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const ctaStreakVal = useCountUp(47, 1300, 150, ctaStatsVisible);
  const ctaConsistencyVal = useCountUp(92, 1300, 300, ctaStatsVisible);

  // Flips true shortly after mount so the dashboard mock's bars, checkmarks,
  // and rows can transition in from zero instead of appearing pre-filled.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 550);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => heatmapRef.current?.setProgress(1), 700);
    return () => clearTimeout(t);
  }, []);

  const openSignup = () => { setIsSu(true); setModal('signup'); };
  const openLogin = () => { setIsSu(false); setModal('login'); };

  // This modal is the app's one real sign-in surface — it calls Supabase
  // directly so a session already exists by the time we land on /app,
  // instead of bouncing the user to Onboarding's own (duplicate) auth step.
  const handleGoogleAuth = async () => {
    setAuthError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || 'Google sign-in failed.');
    }
  };

  const handleEmailAuth = async () => {
    if (!authEmail || !authPassword) { setAuthError('Please fill in all fields.'); return; }
    setAuthLoading(true);
    setAuthError('');
    try {
      const data = isSu ? await signUpWithEmail(authEmail, authPassword) : await signInWithEmail(authEmail, authPassword);
      if (data.session) {
        setModal(null);
        setAuthEmail('');
        setAuthPassword('');
        navigate('/app');
      } else if (isSu) {
        setAuthError('Check your email to confirm your account, then sign in.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };
  const scrollToFeatures = () => featuresRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="lp-root">
      {/* Pinned to the viewport for the whole page — content scrolls up and
          over this rather than the backdrop scrolling away with each section. */}
      <div className="lp-backdrop">
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
        <div className="bg-blob bg-blob-4" />
        <div className="bg-blob bg-blob-5" />
        <div className="bg-grid" />
      </div>

      <div className="scroll-progress-bar" style={{ transform: `scaleX(${scrollProgress})` }} />
      <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-logo">
          <div className="nlm">
            <Rocket size={15} color="#04040a" />
          </div>
          <span className="nlt">HabitX</span>
        </div>
        <div className="nav-right">
          <button className="btn-g" onClick={openLogin}>Sign in</button>
          <button className="btn-n" onClick={openSignup}>Get started</button>
        </div>
      </nav>

      <div className="lp-snap-scroll" ref={snapScrollRef}>
      <section className="hero" ref={heroRef}>
        <div className="hero-copy hero-copy-center">
          <span className="eyebrow">HABIT TRACKING, SIMPLIFIED</span>
          <h1 className="hero-title">
            {renderTyped(HERO_TITLE_PARTS, typedCount)}
            {showCursor && <span className="type-cursor">|</span>}
          </h1>
          <p className="hero-sub">
            HabitX tracks every habit, chain, and check-in in one clean dashboard — so
            consistency becomes visible, and visible becomes automatic.
          </p>
          <div className="hero-actions">
            <button className="btn-hero" onClick={openSignup}>Get started free →</button>
            <button className="btn-hero-ghost" onClick={scrollToFeatures}>See features</button>
          </div>
        </div>

        <div className="hero-visual-full" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave}>
          <div className="visual-glow" />

          <div className="mac-window" ref={tiltRef}>
            <div className="mac-titlebar">
              <div className="mac-dots"><span className="dot red" /><span className="dot yellow" /><span className="dot green" /></div>
              <span className="mac-titlebar-title">habitx.app — Dashboard</span>
            </div>

            <div className="dash">
              <header className="dash-header">
                <div className="dash-header-col">
                  <span className="dash-label">Date</span>
                  <span className="dash-value">Monday, Jul 13</span>
                </div>
                <div className="dash-brand">
                  <div className="dash-brand-icon"><Rocket size={12} color="#04040a" /></div>
                  <span>HabitX</span>
                </div>
                <div className="dash-header-col dash-header-col-right">
                  <span className="dash-label">Clock</span>
                  <span className="dash-value dash-mono">09:41 am</span>
                </div>
              </header>

              <div className="dash-stats">
                <StatCard label="STREAK" value={`${Math.round(streakVal)}d`} subValue="Daily streak" icon="fire" iconColor="#FF0055" />
                <StatCard label="7-DAY AVG" value={`${Math.round(consistencyVal)}%`} subValue="vs prev: +12%" icon="chart" iconColor="#B026FF" trend={{ value: 12, isUp: true }} />
                <StatCard label="PEAK DATE" value="Jul 10" subValue="Best day this cycle" icon="calendar" iconColor="#00FF9C" />
                <StatCard label="TOP HABIT" value="Workout" subValue={`${Math.round(topHabitVal)}% stability`} icon="award" iconColor="#00FF9C" />
              </div>

              <div className="cube-tabbar">
                {FACES.map((f, i) => (
                  <button key={f.id} className={`cube-tab ${cube.face === i ? 'active' : ''}`} onClick={() => goToFace(i)}>
                    {f.icon}<span>{f.label}</span>
                  </button>
                ))}
              </div>
              <div className="cube-progress">
                <div key={cube.face} className={`cube-progress-fill ${cubePaused ? 'paused' : ''}`} />
              </div>

              <div className="dash-cube-scene" ref={sceneRef} onMouseEnter={() => setCubePaused(true)} onMouseLeave={() => setCubePaused(false)}>
                <div className="dash-cube" style={{ transform: `translateZ(-${cubeRadius}px) rotateY(${cube.rotation}deg)` }}>
                  <div className="dash-face" style={{ transform: `rotateY(0deg) translateZ(${cubeRadius}px)` }}>
                    <div className="dash-table-wrap">
                      <table className="dash-table">
                        <thead>
                          <tr>
                            <th className="dash-th-left">Date</th>
                            <th>Progress</th>
                            {SAMPLE_HABITS.map(h => (
                              <th key={h.id}><div style={{ color: h.color }} className="dash-th-icon">{HABIT_ICONS[h.icon]}</div></th>
                            ))}
                            <th className="dash-th-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {SAMPLE_ROWS.map((row, i) => (
                            <tr className={`dash-row ${loaded ? 'in' : ''} ${row.locked ? 'locked' : ''}`} key={row.date} style={{ transitionDelay: `${i * 60}ms` }}>
                              <td>
                                <div className="dash-date-cell">
                                  <span>{row.date}{row.locked && <Lock size={8} />}</span>
                                  <span className="dash-day">{row.day}</span>
                                </div>
                              </td>
                              <td>
                                <div className="dash-progress-cell">
                                  <span>{row.progress}% SYNC</span>
                                  <div className="dash-progress-bar"><div className="dash-progress-fill" style={{ width: loaded ? `${row.progress}%` : '0%' }} /></div>
                                </div>
                              </td>
                              {row.done.map((d, j) => (
                                <td key={j}>
                                  <div
                                    className={`dash-check ${d ? 'done' : ''}`}
                                    style={d ? { color: SAMPLE_HABITS[j].color, background: `${SAMPLE_HABITS[j].color}1f`, borderColor: `${SAMPLE_HABITS[j].color}40` } : undefined}
                                  >
                                    {d && <Check size={11} strokeWidth={3} />}
                                  </div>
                                </td>
                              ))}
                              <td className="dash-status-cell">
                                <span className={`dash-status ${row.status.toLowerCase()}`}>{row.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="dash-face" style={{ transform: `rotateY(${360 / FACES.length}deg) translateZ(${cubeRadius}px)` }}>
                    <div className="dash-analysis-split">
                      <div className="dash-analysis-card dash-heatmap-card">
                        <div className="dash-analysis-head"><span><Calendar size={11} /> Heatmap</span></div>
                        <HeatmapField ref={heatmapRef} cols={18} rows={7} />
                      </div>
                      <div className="dash-analysis-card dash-stability-card">
                        <div className="dash-analysis-head">
                          <span><BarChart3 size={12} /> Analysis</span>
                          <span className="dash-analysis-badge">30-Day</span>
                        </div>
                        <div className="dash-analysis-mini">
                          <div><span>Best Day</span><strong>Monday</strong></div>
                          <div><span>Avg Complete</span><strong>81%</strong></div>
                        </div>
                        <span className="dash-analysis-sublabel">Stability Index</span>
                        <div className="dash-stability-list">
                          {SAMPLE_STABILITY.map(h => (
                            <div className="dash-stability-row" key={h.id}>
                              <div style={{ color: h.color }} className="dash-habit-icon">{HABIT_ICONS[h.icon]}</div>
                              <div className="dash-stability-bar-wrap">
                                <span>{h.name}</span>
                                <div className="dash-stability-bar"><div className="dash-stability-fill" style={{ width: loaded ? `${h.consistency}%` : '0%', background: h.color }} /></div>
                              </div>
                              <span className="dash-stability-pct">{h.consistency}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="dash-face" style={{ transform: `rotateY(${(360 / FACES.length) * 2}deg) translateZ(${cubeRadius}px)` }}>
                    <div className="dash-face-habits">
                      <div className="dash-habits-col">
                        <span className="dash-sidebar-label">Active Habits</span>
                        <div className="dash-habit-chip-row">
                          {SAMPLE_HABITS.map(h => (
                            <div className="dash-habit-chip" key={h.id} style={{ borderColor: `${h.color}40` }}>
                              <div style={{ color: h.color }} className="dash-habit-icon">{HABIT_ICONS[h.icon]}</div>
                              <span>{h.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="dash-goals-col">
                        <span className="dash-sidebar-label">Milestones</span>
                        <div className="dash-goal-grid">
                          {SAMPLE_GOALS.map(g => {
                            const pct = Math.round((g.current / g.target) * 100);
                            return (
                              <div className="dash-goal-card" key={g.name}>
                                <div className="dash-goal-top">
                                  <div style={{ color: g.color }} className="dash-habit-icon">{HABIT_ICONS[g.icon]}</div>
                                  <span className="dash-goal-name">{g.name}</span>
                                </div>
                                <div className="dash-goal-meta">
                                  <span>{g.current}/{g.target} {g.unit}</span>
                                  <span>{pct}%</span>
                                </div>
                                <div className="dash-goal-bar">
                                  <div className="dash-goal-bar-fill" style={{ width: loaded ? `${pct}%` : '0%', background: g.color }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={featuresRef} className="features-section">
        <FeaturesOrbit />
      </section>

      <section className="cal-cta reveal">
        <div className="cal-cta-inner">
          <div className="cal-copy">
            <h2>
              <AnimatedWords text="One day today." />
              <br />
              <span className="neon"><AnimatedWords text="A better tomorrow." startIndex={3} /></span>
            </h2>
            <div className="cal-copy-rest">
              <p>Start your habit journeys now. It only takes a tap.</p>
              <button className="btn-hero btn-hero-pulse" onClick={openSignup}>Get started free →</button>
              <span className="cal-caption">No credit card required.</span>
            </div>
          </div>
          <div className="cal-visual">
            <CalendarProgress />
          </div>
        </div>

        <div className="cal-stats-bar" ref={ctaStatsRef}>
          <div className="cal-stat"><Flame size={20} /><strong>{Math.round(ctaStreakVal)}</strong><span>Day streaks</span></div>
          <div className="cal-stat-divider" />
          <div className="cal-stat"><BarChart3 size={20} /><strong>{Math.round(ctaConsistencyVal)}%</strong><span>Weekly consistency</span></div>
          <div className="cal-stat-divider" />
          <div className="cal-stat"><Zap size={20} /><strong>1</strong><span>Tap to check in</span></div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="nav-logo">
          <div className="nlm">
            <svg viewBox="0 0 13 13" fill="none" width="13" height="13">
              <rect x="1" y="1" width="4.5" height="4.5" rx="1" fill="#04040a"/>
              <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" fill="#04040a"/>
              <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" fill="#04040a"/>
              <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" fill="#04040a"/>
            </svg>
          </div>
          <span className="nlt">HabitX</span>
        </div>
        <span className="footer-copy">© 2026 HabitX. Built for people who show up.</span>
      </footer>
      </div>

      {modal && (
        <div className="modal-bg open" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-card">
            <div className="modal-top">
              <span className="modal-title">{isSu ? 'Create your account' : 'Welcome back'}</span>
              <button className="modal-x" onClick={() => setModal(null)}>✕</button>
            </div>
            <button className="g-btn" onClick={handleGoogleAuth} disabled={authLoading}><GSvg/> Continue with Google</button>
            <div className="m-div"><div className="m-div-line"/><span className="m-div-txt">or</span><div className="m-div-line"/></div>
            <div className="m-field"><label>Email</label><input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com"/></div>
            <div className="m-field">
              <label>Password</label>
              <input
                type="password"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
                placeholder={isSu ? 'Create a password' : 'Your password'}
              />
            </div>
            {authError && <div className="m-error">{authError}</div>}
            <button className="m-submit" onClick={handleEmailAuth} disabled={authLoading}>
              {authLoading ? 'Please wait…' : isSu ? 'Create account →' : 'Sign in →'}
            </button>
            <div className="m-note">{isSu
              ? <span>Already have an account? <span className="m-sw" onClick={() => { setIsSu(false); setAuthError(''); }}>Sign in</span></span>
              : <span>Don't have an account? <span className="m-sw" onClick={() => { setIsSu(true); setAuthError(''); }}>Sign up</span></span>
            }</div>
          </div>
        </div>
      )}
    </div>
  );
}
