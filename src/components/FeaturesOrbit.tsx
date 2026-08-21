import React, { useEffect, useRef, useState } from 'react';
import { Flame, BarChart3, CheckCircle2, Target, Sparkles, TrendingUp, Check } from 'lucide-react';
import './FeaturesOrbit.css';

interface OrbitFeature {
  id: string;
  accent: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  visual: React.ReactNode;
}

// Green and blue are the page's real palette (they also anchor the hero
// and the background blobs); the other four accents used to be full-
// saturation pink/gold/purple/teal, each competing for the same attention
// as the brand color — muted ~45% toward gray here so they still tell the
// six cards apart without reading as six different brand colors.
const FEATURES: OrbitFeature[] = [
  {
    id: 'streak', accent: '#00FF9C', icon: <Flame size={16} />, title: 'Streak chains',
    desc: 'Every day you show up links onto the last. Miss one and you feel it.',
    visual: (
      <div className="orbit-visual-streak">
        <div className="orbit-visual-num"><strong>12</strong><span>days running</span></div>
        <div className="orbit-mini-bars">{Array.from({ length: 10 }).map((_, i) => <span key={i} className={i < 8 ? 'on' : ''} />)}</div>
      </div>
    ),
  },
  {
    id: 'checkins', accent: '#D9809D', icon: <CheckCircle2 size={16} />, title: 'One-tap check-ins',
    desc: 'Logging a habit takes one tap. No forms, no friction.',
    visual: (
      <div className="orbit-visual-checkins">
        {['Workout', 'Read', 'Meditate'].map(l => (
          <div key={l} className="orbit-check-row"><div className="orbit-check-box"><Check size={10} strokeWidth={3} /></div><span>{l}</span></div>
        ))}
      </div>
    ),
  },
  {
    id: 'heatmap', accent: '#00D1FF', icon: <BarChart3 size={16} />, title: 'Visual heatmaps',
    desc: 'A contribution grid per habit — consistency, visible at a glance.',
    visual: (
      <div className="orbit-visual-heat">{Array.from({ length: 24 }).map((_, i) => <span key={i} className={`lvl${(i * 7) % 4}`} />)}</div>
    ),
  },
  {
    id: 'goals', accent: '#D9B24D', icon: <Target size={16} />, title: 'Goals & milestones',
    desc: 'Set a target once — progress tracks itself as you check in.',
    visual: (
      <div className="orbit-visual-goal">
        <div className="orbit-goal-row"><strong>Run 100km</strong><span>24%</span></div>
        <div className="orbit-goal-track"><div className="orbit-goal-fill" /></div>
      </div>
    ),
  },
  {
    id: 'wrapped', accent: '#AF97D9', icon: <Sparkles size={16} />, title: 'Your month, wrapped',
    desc: 'A shareable recap of the month — your top habit, your best day, and the archetype you earned.',
    visual: (
      <div className="orbit-visual-wrapped">
        <div className="orbit-wrapped-badge">The Weekday Warrior</div>
        <div className="orbit-wrapped-stat">34%<span>more consistent on weekdays</span></div>
      </div>
    ),
  },
  {
    id: 'reports', accent: '#65C1B6', icon: <TrendingUp size={16} />, title: 'Monthly reports',
    desc: 'Every month rolls up into one report — check-ins, consistency, and your longest streak.',
    visual: (
      <div className="orbit-visual-report">
        <div className="orbit-report-row"><span>Check-ins</span><strong>83</strong></div>
        <div className="orbit-report-row"><span>Avg consistency</span><strong>74%</strong></div>
        <div className="orbit-report-row"><span>Best streak</span><strong>12d</strong></div>
      </div>
    ),
  },
];

const N = FEATURES.length;

// Every card is always mounted; its position is a continuous function of
// scroll, not a set of discrete CSS classes — so motion tracks the scroll
// input 1:1 instead of playing out on its own timer. ANCHORS describe the
// fan at integer "slots away from center" (0 = centered/hero, 3 = the
// invisible seam a card passes through while wrapping around); anchorAt()
// linearly interpolates between them for any fractional distance, and the
// signed distance itself wraps continuously (see the render loop), which
// is what makes N cards read as an endless conveyor with only N features.
//
// Only hero (0) and near (1) ever reach visible opacity — in the old
// full-viewport-wide layout there was room for a dim "far" card too, but
// in this narrower shared-column stage a card that size at that offset
// runs past the stage's own edge and gets cut off by its overflow:hidden
// before it ever reads as intentional. Far/seam opacity is pinned to 0 so
// the fade-out finishes well before a card would reach that edge.
const ANCHORS = [
  { x: 0, scale: 1.35, opacity: 1 },
  { x: 0.35, scale: 0.86, opacity: 0.95 },
  { x: 0.55, scale: 0.66, opacity: 0 },
  { x: 0.75, scale: 0.56, opacity: 0 },
];

function anchorAt(absDist: number) {
  const clamped = Math.min(absDist, 3);
  const lo = Math.floor(clamped);
  const hi = Math.min(lo + 1, 3);
  const frac = clamped - lo;
  const a = ANCHORS[lo];
  const b = ANCHORS[hi];
  return {
    x: a.x + (b.x - a.x) * frac,
    scale: a.scale + (b.scale - a.scale) * frac,
    opacity: a.opacity + (b.opacity - a.opacity) * frac,
  };
}

// vh of scroll per feature-to-feature step, plus a flat hold at each end.
const STEP_VH = 60;
const HOLD_VH = 80;

const HEAD_LINE_1 = 'One feature at a time,';
const HEAD_LINE_2 = 'fully in focus';
const HEAD_FULL_LEN = HEAD_LINE_1.length + HEAD_LINE_2.length;

// Types the heading out once the section first scrolls into view, rather
// than on mount (which would finish long before anyone scrolls this far) —
// same mechanic as the hero title, reused here so the two feel like one
// house style rather than two different tricks.
function useTypewriter(length: number, start: boolean, charDuration = 26, startDelay = 250) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    let startTs: number | null = null;
    const t = setTimeout(() => {
      const step = (ts: number) => {
        if (startTs === null) startTs = ts;
        const c = Math.min(length, Math.floor((ts - startTs) / charDuration));
        setCount(c);
        if (c < length) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, startDelay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [length, charDuration, startDelay, start]);
  return { count, done: count >= length };
}

export const FeaturesOrbit: React.FC = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollParentRef = useRef<HTMLElement | Window>(window);
  const lastCenter = useRef(0);
  const [centerIndex, setCenterIndex] = useState(0);
  const [headVisible, setHeadVisible] = useState(false);

  useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setHeadVisible(true); io.disconnect(); }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const { count: typedCount, done: typedDone } = useTypewriter(HEAD_FULL_LEN, headVisible);
  const [showCursor, setShowCursor] = useState(true);
  useEffect(() => {
    if (!typedDone) return;
    const t = setTimeout(() => setShowCursor(false), 900);
    return () => clearTimeout(t);
  }, [typedDone]);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return;

    // this page scrolls inside a custom snap container (.lp-snap-scroll),
    // not the window/document — find whichever ancestor actually scrolls.
    let scrollParent: HTMLElement | Window = window;
    let el = track.parentElement;
    while (el) {
      if (/(auto|scroll)/.test(getComputedStyle(el).overflowY)) { scrollParent = el; break; }
      el = el.parentElement;
    }
    scrollParentRef.current = scrollParent;

    let raf = 0;
    const render = () => {
      raf = 0;
      const rect = track.getBoundingClientRect();
      const viewportH = scrollParent === window ? window.innerHeight : (scrollParent as HTMLElement).clientHeight;
      const total = rect.height - viewportH;
      const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      const t = progress * (N - 1);

      const stageW = stage.getBoundingClientRect().width;
      // widening orbit-head (FeaturesOrbit.css) to fix the heading wrap
      // shrank the stage at common widths (e.g. ~608px at a 1280px
      // viewport) enough that the near cards' gap to the hero card was
      // down to ~11px — technically not overlapping, but visually reads
      // as cramped rather than a deliberate gap. Collapsing to hero-only
      // a bit earlier keeps the fan from ever showing that tight.
      const narrow = stageW < 650;

      FEATURES.forEach((_, i) => {
        const node = cardRefs.current[i];
        if (!node) return;
        let r = i - t;
        r = ((r + N / 2) % N + N) % N - N / 2; // signed distance, wrapped
        const absR = Math.abs(r);
        const { x, scale, opacity: baseOpacity } = anchorAt(absR);
        const opacity = narrow && absR > 0.5 ? 0 : baseOpacity;
        const px = (r < 0 ? -1 : 1) * x * stageW;
        node.style.transform = `translate(calc(-50% + ${px}px), -50%) scale(${scale})`;
        node.style.opacity = String(opacity);
        node.style.zIndex = String(absR < 0.5 ? 3 : absR < 1.5 ? 2 : 1);
        node.style.pointerEvents = opacity < 0.05 ? 'none' : 'auto';
        node.classList.toggle('orbit-card-hero', absR < 0.5);
      });

      const nearest = ((Math.round(t) % N) + N) % N;
      if (nearest !== lastCenter.current) {
        lastCenter.current = nearest;
        setCenterIndex(nearest);
      }
    };

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(render); };
    scrollParent.addEventListener('scroll', onScroll, { passive: true });
    render();
    return () => {
      scrollParent.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const goToIndex = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const sp = scrollParentRef.current;
    const viewportH = sp === window ? window.innerHeight : (sp as HTMLElement).clientHeight;
    const scrollTopNow = sp === window ? window.scrollY : (sp as HTMLElement).scrollTop;
    const trackDocTop = track.getBoundingClientRect().top + scrollTopNow;
    const total = track.offsetHeight - viewportH;
    const target = trackDocTop + (i / (N - 1)) * Math.max(total, 0);
    if (sp === window) window.scrollTo({ top: target, behavior: 'smooth' });
    else (sp as HTMLElement).scrollTo({ top: target, behavior: 'smooth' });
  };

  const trackHeight = `${(N - 1) * STEP_VH + HOLD_VH}vh`;

  return (
    <div className="orbit-scroll" ref={trackRef} style={{ height: trackHeight }}>
      <div className="orbit-wrap">
        <div className="orbit-split">
          <div className="orbit-stage-col">
            <div className="orbit-stage" ref={stageRef}>
              <div className="orbit-ring-glow" />

              {FEATURES.map((f, i) => (
                <div
                  key={f.id}
                  ref={el => { cardRefs.current[i] = el; }}
                  className="orbit-card"
                  style={{ ['--accent' as any]: f.accent }}
                  onClick={() => goToIndex(i)}
                >
                  <div className="orbit-card-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                  {f.visual}
                </div>
              ))}
            </div>

            <div className="orbit-controls">
              <div className="orbit-dots">
                {FEATURES.map((f, i) => (
                  <button
                    key={f.id}
                    className={`orbit-dot ${i === centerIndex ? 'active' : ''}`}
                    onClick={() => goToIndex(i)}
                    style={{ ['--accent' as any]: f.accent }}
                    aria-label={f.title}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="orbit-head" ref={headRef}>
            <div className="orbit-eyebrow"><span className="dot" /> Features</div>
            <h2>
              {HEAD_LINE_1.slice(0, Math.min(HEAD_LINE_1.length, typedCount))}
              <br />
              {HEAD_LINE_2.slice(0, Math.max(0, typedCount - HEAD_LINE_1.length))}
              {showCursor && <span className="type-cursor">|</span>}
            </h2>
            <p>Watch each one flow through the dashboard before the next takes over.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturesOrbit;
