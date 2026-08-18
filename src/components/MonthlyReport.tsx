import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trophy, Lock, X } from 'lucide-react';
import { Habit, Goal, DailyLog } from '../types';
import { HABIT_ICONS } from '../constants';
import { computeMonthlyStats } from '../lib/wrapped';
import { monthLabel, isCurrentMonth } from '../lib/wrappedMonth';
import { StatCard } from './StatCard';
import { MiniHeatmap } from './MiniHeatmap';
import './MonthlyReport.css';

const DAY_NAMES: Record<string, string> = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday' };

interface MonthlyReportProps {
  monthId: string;
  habits: Habit[];
  goals: Goal[];
  logs: DailyLog[];
  prevMonthLogs: DailyLog[] | null;
  earliestMonthId: string | null;
  focusHabitId?: string;
  onNavigateMonth: (delta: 1 | -1) => void;
  onBack: () => void;
  onClose: () => void;
}

function habitDetail(habit: Habit, logs: DailyLog[], prevLogs: DailyLog[] | null) {
  const total = logs.length || 1;
  const count = logs.filter(l => l.completions[habit.id]).length;
  const pct = Math.round((count / total) * 100);

  let prevPct: number | null = null;
  if (prevLogs && prevLogs.length) {
    const prevCount = prevLogs.filter(l => l.completions[habit.id]).length;
    prevPct = Math.round((prevCount / prevLogs.length) * 100);
  }

  const chrono = [...logs].reverse();
  let longestRun = 0, run = 0;
  chrono.forEach(l => { if (l.completions[habit.id]) { run++; longestRun = Math.max(longestRun, run); } else run = 0; });

  const dayCounts: Record<string, number> = {};
  logs.forEach(l => { if (l.completions[habit.id]) dayCounts[l.day] = (dayCounts[l.day] || 0) + 1; });
  let bestDay = '—', max = 0;
  Object.entries(dayCounts).forEach(([day, c]) => { if (c > max) { max = c; bestDay = day; } });

  return { pct, prevPct, longestRun, bestDay: DAY_NAMES[bestDay] || bestDay };
}

export const MonthlyReport: React.FC<MonthlyReportProps> = ({ monthId, habits, goals, logs, prevMonthLogs, earliestMonthId, focusHabitId, onNavigateMonth, onBack, onClose }) => {
  const stats = useMemo(() => computeMonthlyStats(habits, logs, prevMonthLogs), [habits, logs, prevMonthLogs]);
  const useAccordion = habits.length > 4;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(focusHabitId ? [focusHabitId] : []));

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const isFirstMonth = earliestMonthId != null && monthId === earliestMonthId;
  const isLatestMonth = isCurrentMonth(monthId);

  return (
    <div className="report-root">
      <div className="report-header">
        <button className="report-back" onClick={onBack} aria-label="Back to insights"><ChevronLeft size={16} /></button>
        <div className="report-monthnav">
          <button disabled={isFirstMonth} onClick={() => onNavigateMonth(-1)} aria-label="Previous month"><ChevronLeft size={14} /></button>
          <span>{monthLabel(monthId)}</span>
          <button disabled={isLatestMonth} onClick={() => onNavigateMonth(1)} aria-label="Next month"><ChevronRight size={14} /></button>
        </div>
        <button className="report-back" onClick={onClose} aria-label="Close"><X size={16} /></button>
      </div>

      <div className="report-body">
        <div className="report-overview">
          <StatCard label="Check-ins" value={stats.totalCheckins} icon="chart" iconColor="#00D1FF" />
          <StatCard label="Avg Consistency" value={`${stats.avgComplete}%`} icon="target" iconColor="#00FF9C" />
          <StatCard label="Best Streak" value={`${stats.longestStreak}d`} icon="fire" iconColor="#FF9F1C" />
          <StatCard
            label="vs Last Month"
            value={prevMonthLogs && prevMonthLogs.length ? `${stats.trendDelta >= 0 ? '+' : ''}${stats.trendDelta}%` : '—'}
            icon="calendar"
            iconColor="#B026FF"
            trend={prevMonthLogs && prevMonthLogs.length ? { value: Math.abs(stats.trendDelta), isUp: stats.trendDelta >= 0 } : undefined}
          />
        </div>

        <section className="report-section">
          <h3>Habit breakdown</h3>
          <div className="report-habits">
            {habits.map(habit => {
              const d = habitDetail(habit, logs, prevMonthLogs);
              const isOpen = !useAccordion || expanded.has(habit.id);
              return (
                <div key={habit.id} className={`report-habit-row ${focusHabitId === habit.id ? 'focus' : ''}`}>
                  <button className="report-habit-head" onClick={() => useAccordion && toggle(habit.id)}>
                    <div className="report-habit-icon" style={{ color: habit.color }}>{HABIT_ICONS[habit.icon]}</div>
                    <span className="report-habit-name">{habit.name}</span>
                    <span className="report-habit-pct">
                      {d.pct}%
                      {d.prevPct !== null && (
                        <em className={d.pct >= d.prevPct ? 'up' : 'down'}>{d.pct >= d.prevPct ? '↑' : '↓'} from {d.prevPct}%</em>
                      )}
                    </span>
                    {useAccordion && <ChevronRight size={14} className={`report-chevron ${isOpen ? 'open' : ''}`} />}
                  </button>
                  <div className={`report-habit-body ${isOpen ? 'open' : ''}`}>
                    <div className="report-habit-body-inner">
                      <MiniHeatmap logs={logs} habitId={habit.id} color={habit.color} />
                      <span className="report-habit-note">Best day: {d.bestDay} · Longest run: {d.longestRun} day{d.longestRun === 1 ? '' : 's'} straight</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="report-section">
          <h3>Milestones this month</h3>
          {isCurrentMonth(monthId) ? (
            goals.length === 0 ? (
              <span className="report-muted-caption">No goals set yet.</span>
            ) : (
              <div className="report-milestones">
                {goals.map(g => {
                  const hit = g.target > 0 && g.current >= g.target;
                  const pct = Math.min(100, Math.round((g.current / Math.max(g.target, 1)) * 100));
                  return (
                    <div key={g.id} className={`report-milestone-card ${hit ? 'hit' : 'progress'}`}>
                      <div className="report-milestone-icon">{hit ? <Trophy size={16} /> : <Lock size={14} />}</div>
                      <span className="report-milestone-name">{g.name}</span>
                      <span className="report-milestone-tag">{hit ? 'Hit' : `${pct}%`}</span>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <span className="report-muted-caption">Milestone history isn't available for past months.</span>
          )}
        </section>
      </div>
    </div>
  );
};

export default MonthlyReport;
