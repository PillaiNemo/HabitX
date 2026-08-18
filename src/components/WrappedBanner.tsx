import React, { useMemo, useState } from 'react';
import { Habit, Goal, DailyLog } from '../types';
import { computeWrappedStats, computeArchetype, computeMilestone } from '../lib/wrapped';
import './WrappedBanner.css';

interface WrappedBannerProps {
  habits: Habit[];
  goals: Goal[];
  logs: DailyLog[];
  onOpen: () => void;
}

const DISMISS_PREFIX = 'habitx-wrapped-dismissed-';

export const WrappedBanner: React.FC<WrappedBannerProps> = ({ habits, goals, logs, onOpen }) => {
  const stats = useMemo(() => computeWrappedStats(habits, logs), [habits, logs]);
  const archetype = useMemo(() => computeArchetype(stats, logs), [stats, logs]);
  const milestone = useMemo(() => computeMilestone(goals), [goals]);
  const highlightCount = [archetype, milestone, !stats.isThin && Math.abs(stats.trendDelta) >= 5].filter(Boolean).length;

  const monthKey = new Date().toISOString().slice(0, 7);
  const storageKey = `${DISMISS_PREFIX}${monthKey}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
  });

  if (dismissed || stats.isThin || highlightCount === 0) return null;

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try { localStorage.setItem(storageKey, '1'); } catch { /* storage unavailable — dismiss just won't persist */ }
    setDismissed(true);
  };

  return (
    <button className="wbanner" onClick={onOpen}>
      <div className="wbanner-icon">✦</div>
      <div className="wbanner-text">
        <span className="wbanner-title">Your {monthName} insights are ready</span>
        <span className="wbanner-sub">{highlightCount} thing{highlightCount === 1 ? '' : 's'} stood out this month</span>
      </div>
      <span className="wbanner-cta">View →</span>
      <span className="wbanner-close" onClick={handleDismiss} role="button" aria-label="Dismiss">×</span>
    </button>
  );
};
