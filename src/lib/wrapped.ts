import { Habit, Goal, DailyLog } from '../types';

export interface WrappedStats {
  totalCheckins: number;
  activeDays: number;
  longestStreak: number;
  topHabit: { habit: Habit; consistency: number; count: number } | null;
  bestDay: { date: string; day: string; progress: number } | null;
  avgComplete: number;
  trendDelta: number; // percentage points, recent 15 days vs. the 15 before
  recentAvg: number;
  priorAvg: number;
  isThin: boolean; // too little history this period for the full recap
}

export interface Archetype {
  name: string;
  sentence: string;
  sharePercent: number;
}

export interface Milestone {
  name: string;
  date: string;
  icon: string;
  color: string;
}

const MIN_ACTIVE_DAYS_FOR_FULL = 6;

export type MonthlyAggregate = Omit<WrappedStats, 'trendDelta' | 'recentAvg' | 'priorAvg'>;

// Everything about a log window except the recent-vs-prior trend, which
// depends on how the caller wants to split/compare the window (a trailing
// 15-vs-15 split for the live dashboard, a calendar-month-vs-calendar-month
// split for a specific past month). Shared by computeWrappedStats and
// computeMonthlyStats below so the two don't duplicate this calculation.
export function computeMonthlyAggregate(habits: Habit[], logs: DailyLog[]): MonthlyAggregate {
  const totalCheckins = logs.reduce((s, l) => s + Object.values(l.completions).filter(Boolean).length, 0);
  const activeDays = logs.filter(l => l.progress > 0).length;

  const chrono = [...logs].reverse();
  let longestStreak = 0;
  let run = 0;
  chrono.forEach(l => {
    if (l.progress > 0) { run += 1; longestStreak = Math.max(longestStreak, run); }
    else run = 0;
  });

  const topHabitRaw = habits
    .map(h => {
      const count = logs.filter(l => l.completions[h.id]).length;
      return { habit: h, count, consistency: logs.length > 0 ? Math.round((count / logs.length) * 100) : 0 };
    })
    .sort((a, b) => b.count - a.count)[0];
  const topHabit = topHabitRaw && topHabitRaw.count > 0 ? topHabitRaw : null;

  let bestDay: WrappedStats['bestDay'] = null;
  logs.forEach(l => {
    if (!bestDay || l.progress > bestDay.progress) bestDay = { date: l.date, day: l.day, progress: l.progress };
  });
  if (bestDay && bestDay.progress <= 0) bestDay = null;

  const avgComplete = logs.length ? Math.round(logs.reduce((s, l) => s + l.progress, 0) / logs.length) : 0;

  return {
    totalCheckins,
    activeDays,
    longestStreak,
    topHabit,
    bestDay,
    avgComplete,
    isThin: activeDays < MIN_ACTIVE_DAYS_FOR_FULL,
  };
}

// logs[0] is today, descending — see lib/db.ts. Wrapped covers the trailing
// 30-day window that's actually fetched, not a strict calendar month.
export function computeWrappedStats(habits: Habit[], logs: DailyLog[]): WrappedStats {
  const aggregate = computeMonthlyAggregate(habits, logs);

  const recent = logs.slice(0, 15);
  const prior = logs.slice(15, 30);
  const recentAvg = recent.length ? recent.reduce((s, l) => s + l.progress, 0) / recent.length : 0;
  const priorAvg = prior.length ? prior.reduce((s, l) => s + l.progress, 0) / prior.length : 0;
  const trendDelta = Math.round(recentAvg - priorAvg);

  return { ...aggregate, trendDelta, recentAvg, priorAvg };
}

export type MonthlyWrappedStats = WrappedStats;

// Calendar-month-vs-calendar-month variant for the month deck/report, where
// "recent" and "prior" are whole distinct months rather than a 15/15 split
// within one trailing 30-day window.
export function computeMonthlyStats(habits: Habit[], monthLogs: DailyLog[], prevMonthLogs: DailyLog[] | null): MonthlyWrappedStats {
  const aggregate = computeMonthlyAggregate(habits, monthLogs);
  const recentAvg = monthLogs.length ? monthLogs.reduce((s, l) => s + l.progress, 0) / monthLogs.length : 0;
  const priorAvg = prevMonthLogs && prevMonthLogs.length ? prevMonthLogs.reduce((s, l) => s + l.progress, 0) / prevMonthLogs.length : 0;
  const trendDelta = prevMonthLogs && prevMonthLogs.length ? Math.round(recentAvg - priorAvg) : 0;
  return { ...aggregate, trendDelta, recentAvg, priorAvg };
}

// A fun behavioral label rather than a raw stat — grounded in real data we
// actually have (weekday/weekend split, top habit), not check-in timestamps
// we don't collect. "Shared by X%" is presentational flavor, not a real
// cross-user stat — there's no backend aggregation to draw it from.
export function computeArchetype(stats: WrappedStats, logs: DailyLog[]): Archetype | null {
  if (stats.isThin) return null;

  const weekdayLogs = logs.filter(l => l.day !== 'SAT' && l.day !== 'SUN');
  const weekendLogs = logs.filter(l => l.day === 'SAT' || l.day === 'SUN');
  if (weekdayLogs.length >= 5 && weekendLogs.length >= 2) {
    const wdAvg = weekdayLogs.reduce((s, l) => s + l.progress, 0) / weekdayLogs.length;
    const weAvg = weekendLogs.reduce((s, l) => s + l.progress, 0) / weekendLogs.length;
    const diff = wdAvg - weAvg;
    if (diff >= 15) {
      return { name: 'The Weekday Warrior', sentence: `${Math.round(diff)}% more consistent on weekdays than weekends.`, sharePercent: 34 };
    }
    if (diff <= -15) {
      return { name: 'The Weekend Warrior', sentence: `Weekends are where you actually show up — ${Math.round(-diff)}% stronger than weekdays.`, sharePercent: 21 };
    }
  }

  if (stats.topHabit) {
    return {
      name: `The ${stats.topHabit.habit.name} Regular`,
      sentence: `${stats.topHabit.consistency}% consistency on ${stats.topHabit.habit.name} this month — your most dependable habit.`,
      sharePercent: 28,
    };
  }

  return null;
}

// Only surfaces a goal actually completed (current >= target) — we don't
// track a completion timestamp, so this can't say precisely "hit this
// month," just "hit, and here's today's date" for the reveal.
export function computeMilestone(goals: Goal[]): Milestone | null {
  const hit = goals.find(g => g.target > 0 && g.current >= g.target);
  if (!hit) return null;
  return {
    name: hit.name,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    icon: hit.icon,
    color: hit.color,
  };
}

export type WrappedSlideKind = 'title' | 'archetype' | 'milestone' | 'comparison' | 'share';

// Only include a slide if there's something real to say — a sparse first
// month should get a short, gentle recap, not empty/awkward slides.
export function buildWrappedSlides(stats: WrappedStats, archetype: Archetype | null, milestone: Milestone | null): WrappedSlideKind[] {
  const slides: WrappedSlideKind[] = ['title'];
  if (archetype) slides.push('archetype');
  if (milestone) slides.push('milestone');
  if (!stats.isThin && Math.abs(stats.trendDelta) >= 5) slides.push('comparison');
  slides.push('share');
  return slides;
}
