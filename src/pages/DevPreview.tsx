import React, { useMemo } from 'react';
import App from '../App';
import { Habit, Goal, DailyLog } from '../types';

// Dev-only route (see Router.tsx: /preview) that seeds the real dashboard
// with synthetic history instead of a Supabase session — lets us see
// features like AnalysisSidebar's insights without logging in. Not linked
// from anywhere in the product; safe to delete once no longer needed.

const HABITS: Habit[] = [
  { id: 'workout', name: 'Workout', icon: 'dumbbell', color: '#FF0055', consistency: 0 },
  { id: 'read', name: 'Read', icon: 'read', color: '#00D1FF', consistency: 0 },
  { id: 'meditate', name: 'Meditate', icon: 'meditate', color: '#B026FF', consistency: 0 },
  { id: 'code', name: 'Code', icon: 'coding', color: '#FFB800', consistency: 0 },
];

const GOALS: Goal[] = [
  { id: 'g1', name: 'Run 100km', icon: 'run', color: '#00FF9C', current: 100, target: 100, unit: 'km' },
  { id: 'g2', name: 'Read 12 books', icon: 'read', color: '#00D1FF', current: 7, target: 12, unit: 'books' },
];

// Deterministic PRNG (mulberry32) so the demo looks the same on every load
// instead of reshuffling — makes it easy to point at a specific insight.
function seededRandom(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// `days` extends past the dashboard's normal 30-day window so the Wrapped
// month deck (which needs real calendar-month history) has something to
// show — the first 30 entries are unchanged from the original seed so the
// live dashboard/Story numbers already verified against this data don't shift.
function buildSeededLogs(habits: Habit[], days: number): DailyLog[] {
  const rand = seededRandom(42);
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const today = new Date();

  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const day = dayNames[d.getDay()];
    const isWeekend = day === 'SAT' || day === 'SUN';
    const era = Math.floor(i / 30); // 0 = this month, 1 = last month, 2+ = older

    let workout: boolean, read: boolean, meditate: boolean, code: boolean;
    if (era === 0) {
      // Workout and Read are strongly correlated (do one, usually do the other).
      workout = rand() < (isWeekend ? 0.25 : 0.75);
      read = workout ? rand() < 0.85 : rand() < 0.15;
      // Meditate is a fresh habit that's picked up sharply in the last week.
      meditate = i < 7 ? rand() < 0.85 : rand() < 0.15;
      // Code skews heavily toward weekdays.
      code = rand() < (isWeekend ? 0.1 : 0.65);
    } else if (era === 1) {
      // A Read-led month, so the deck's top habit/theming actually varies.
      read = rand() < (isWeekend ? 0.35 : 0.8);
      workout = read ? rand() < 0.5 : rand() < 0.2;
      meditate = rand() < 0.15;
      code = rand() < (isWeekend ? 0.1 : 0.35);
    } else {
      // A quieter, lower-consistency month further back.
      workout = rand() < 0.35;
      read = rand() < 0.3;
      meditate = rand() < 0.1;
      code = rand() < (isWeekend ? 0.05 : 0.3);
    }

    const completions: Record<string, boolean> = { workout, read, meditate, code };
    const cnt = Object.values(completions).filter(Boolean).length;
    const progress = Math.round((cnt / habits.length) * 100);

    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      day,
      progress,
      completions,
      status: progress === 100 ? 'PEAK' : progress >= 60 ? 'STABLE' : 'IDLE',
      dateStr: d.toISOString().split('T')[0],
    } as DailyLog;
  });
}

export default function DevPreview() {
  const allLogs = useMemo(() => buildSeededLogs(HABITS, 100), []);
  const logs = useMemo(() => allLogs.slice(0, 30), [allLogs]);
  return (
    <App
      userId="preview-user"
      initialHabits={HABITS}
      initialGoals={GOALS}
      initialLogs={logs}
      mockWrappedLogs={allLogs}
      isNewUser={false}
      onLogout={() => {}}
    />
  );
}
