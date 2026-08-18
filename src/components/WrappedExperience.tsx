import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Trophy, Moon } from 'lucide-react';
import { Habit, Goal, DailyLog } from '../types';
import {
  computeWrappedStats, computeArchetype, computeMilestone, buildWrappedSlides,
  WrappedStats, Archetype, Milestone, WrappedSlideKind,
} from '../lib/wrapped';
import { saveShareCardAsPng, shareCardNative } from '../lib/shareCard';
import './Wrapped.css';

const SLIDE_MS = 5500;
const TRANSITION_MS = 450;

function useCountUp(target: number, durationMs = 800, active = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // rAF is throttled or fully suspended in backgrounded/hidden tabs — this
    // guarantees the number still lands on the right value even if the
    // animation itself never gets to run.
    const fallback = setTimeout(() => setValue(target), durationMs + 100);
    return () => { cancelAnimationFrame(raf); clearTimeout(fallback); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, active]);
  return value;
}

const monthLabel = () => new Date().toLocaleDateString('en-US', { month: 'long' });

function TitleSlide() {
  return (
    <div className="wrapped-center tone-green">
      <span className="wrapped-eyebrow">HabitX Wrapped</span>
      <h1 className="wrapped-title-big">Your <span className="wrapped-accent">{monthLabel()}</span><br />recap</h1>
      <p className="wrapped-sub">A few things stood out this month.</p>
    </div>
  );
}

function ArchetypeSlide({ archetype }: { archetype: Archetype }) {
  return (
    <div className="wrapped-center tone-purple">
      <div className="wrapped-archetype-badge"><Moon size={28} /></div>
      <span className="wrapped-eyebrow">Your habit type</span>
      <h2 className="wrapped-title-mid">{archetype.name}</h2>
      <p className="wrapped-sub">{archetype.sentence}</p>
      <span className="wrapped-pill">shared by {archetype.sharePercent}% of users</span>
    </div>
  );
}

function MilestoneSlide({ milestone }: { milestone: Milestone }) {
  return (
    <div className="wrapped-center tone-amber">
      <div className="wrapped-milestone-card">
        <div className="wrapped-milestone-shine" />
        <span className="wrapped-milestone-badge">MILESTONE UNLOCKED</span>
        <div className="wrapped-milestone-icon"><Trophy size={26} /></div>
        <h2>{milestone.name}</h2>
        <span className="wrapped-milestone-date">{milestone.date}</span>
      </div>
      <p className="wrapped-sub" style={{ marginTop: 16 }}>You crossed the finish line.</p>
    </div>
  );
}

function ComparisonSlide({ stats }: { stats: WrappedStats }) {
  const up = stats.trendDelta >= 0;
  const n = useCountUp(Math.abs(stats.trendDelta), 700);
  const prevPct = Math.max(4, Math.round(stats.priorAvg));
  const currPct = Math.max(4, Math.round(stats.recentAvg));
  return (
    <div className="wrapped-center tone-blue">
      <span className="wrapped-eyebrow">Then vs. now</span>
      <div className="wrapped-bars">
        <div className="wrapped-bar-col">
          <div className="wrapped-bar-track"><div className="wrapped-bar prev" style={{ height: `${prevPct}%` }} /></div>
          <span>Last month</span>
        </div>
        <div className="wrapped-bar-col">
          <div className="wrapped-bar-track"><div className="wrapped-bar curr" style={{ height: `${currPct}%` }} /></div>
          <span>This month</span>
        </div>
      </div>
      <h2 className="wrapped-title-mid">{up ? '+' : '-'}{n}% {up ? 'more' : 'less'} consistent</h2>
      <p className="wrapped-sub">than last month</p>
    </div>
  );
}

function ShareSlide({ stats, monthName, topHabitName, onClose }: { stats: WrappedStats; monthName: string; topHabitName: string; onClose: () => void }) {
  const [status, setStatus] = useState<'idle' | 'saved' | 'shared' | 'copied'>('idle');
  const filename = `habitx-wrapped-${monthName.toLowerCase()}.png`;

  const handleSave = () => {
    saveShareCardAsPng(stats, monthName, topHabitName, filename);
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 2000);
  };

  const handleShare = async () => {
    const shared = await shareCardNative(stats, monthName, topHabitName, filename);
    if (shared) {
      setStatus('shared');
    } else {
      const summary = `My HabitX Wrapped: ${stats.totalCheckins} check-ins, ${topHabitName || 'consistency'} led the way.`;
      await navigator.clipboard?.writeText(summary);
      setStatus('copied');
    }
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <div className="wrapped-center tone-green">
      <span className="wrapped-eyebrow">That's a wrap</span>
      <div className="wrapped-share-card">
        <div className="wrapped-share-header">
          <div className="wrapped-share-logo" />
          <div className="wrapped-share-title">
            <strong>HabitX</strong>
            <span>{monthName.toUpperCase()} WRAPPED</span>
          </div>
        </div>
        <div className="wrapped-share-grid">
          {[
            { label: 'Top habit', value: topHabitName || '—' },
            { label: 'Check-ins', value: stats.totalCheckins },
            { label: 'Best day', value: stats.bestDay?.date ?? '—' },
            { label: 'Avg complete', value: `${stats.avgComplete}%` },
          ].map((t, i) => (
            <div key={t.label} className="wrapped-share-tile" style={{ animationDelay: `${i * 100}ms` }}>
              <span>{t.label}</span>
              <strong>{t.value}</strong>
            </div>
          ))}
        </div>
        <div className="wrapped-share-watermark">habitx.app</div>
      </div>
      <div className="wrapped-share-actions">
        <button className="wrapped-btn-primary" onClick={handleSave}>{status === 'saved' ? 'Saved!' : 'Save image'}</button>
        <button className="wrapped-btn-primary" onClick={handleShare} style={{ background: '#00D1FF' }}>
          {status === 'shared' ? 'Shared!' : status === 'copied' ? 'Copied summary!' : 'Share'}
        </button>
        <button className="wrapped-btn-ghost" onClick={onClose}>Back to dashboard</button>
      </div>
    </div>
  );
}

function renderSlide(kind: WrappedSlideKind, stats: WrappedStats, archetype: Archetype | null, milestone: Milestone | null, monthName: string, topHabitName: string, onClose: () => void) {
  switch (kind) {
    case 'title': return <TitleSlide />;
    case 'archetype': return archetype && <ArchetypeSlide archetype={archetype} />;
    case 'milestone': return milestone && <MilestoneSlide milestone={milestone} />;
    case 'comparison': return <ComparisonSlide stats={stats} />;
    case 'share': return <ShareSlide stats={stats} monthName={monthName} topHabitName={topHabitName} onClose={onClose} />;
  }
}

interface WrappedExperienceProps { habits: Habit[]; goals: Goal[]; logs: DailyLog[]; onClose: () => void; }

export const WrappedExperience: React.FC<WrappedExperienceProps> = ({ habits, goals, logs, onClose }) => {
  const stats = useMemo(() => computeWrappedStats(habits, logs), [habits, logs]);
  const archetype = useMemo(() => computeArchetype(stats, logs), [stats, logs]);
  const milestone = useMemo(() => computeMilestone(goals), [goals]);
  const slides = useMemo(() => buildWrappedSlides(stats, archetype, milestone), [stats, archetype, milestone]);
  const monthName = monthLabel();
  const topHabitName = stats.topHabit?.habit.name ?? '';

  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const isLast = index === slides.length - 1;
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((next: number) => {
    setPrevIndex(i => (i === null ? index : i));
    setIndex(next);
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => setPrevIndex(null), TRANSITION_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const goNext = useCallback(() => {
    const next = Math.min(index + 1, slides.length - 1);
    if (next !== index) goTo(next);
  }, [index, slides.length, goTo]);
  const goPrev = useCallback(() => {
    const prev = Math.max(index - 1, 0);
    if (prev !== index) goTo(prev);
  }, [index, goTo]);

  useEffect(() => {
    if (paused || isLast) return;
    const t = setTimeout(goNext, SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, paused, isLast, goNext]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, onClose]);

  return (
    <div
      className="wrapped-root"
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="wrapped-progress-row">
        {slides.map((_, i) => (
          <div key={i} className="wrapped-progress-track">
            <div
              className={`wrapped-progress-fill ${i < index ? 'done' : i === index && !isLast ? 'active' : i === index ? 'done' : ''}`}
              style={i === index && !isLast ? { animationDuration: `${SLIDE_MS}ms`, animationPlayState: paused ? 'paused' : 'running' } : undefined}
            />
          </div>
        ))}
      </div>
      <button className="wrapped-close" onClick={onClose} aria-label="Close"><X size={16} /></button>

      {index > 0 && <div className="wrapped-tap-zone wrapped-tap-left" onClick={goPrev} />}
      <div className="wrapped-tap-zone wrapped-tap-right" onClick={goNext} />

      <div className="wrapped-slide-stack">
        {prevIndex !== null && prevIndex !== index && (
          <div className="wrapped-slide wrapped-slide-out">
            {renderSlide(slides[prevIndex], stats, archetype, milestone, monthName, topHabitName, onClose)}
          </div>
        )}
        <div className="wrapped-slide wrapped-slide-in" key={index}>
          {renderSlide(slides[index], stats, archetype, milestone, monthName, topHabitName, onClose)}
        </div>
      </div>
    </div>
  );
};
