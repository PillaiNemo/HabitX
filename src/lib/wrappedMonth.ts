import { Archetype, Milestone, MonthlyWrappedStats } from './wrapped';
import { Insight } from './insights';

// "YYYY-MM", derived the same way DailyLog.dateStr is (toISOString-based)
// so month math never introduces a second, differently-skewed date
// convention alongside lib/db.ts's existing one.
export function monthId(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function currentMonthId(): string {
  return monthId(new Date());
}

export function monthIdFromDateStr(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function monthLabel(id: string): string {
  const [y, m] = id.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function monthShortLabel(id: string): string {
  const [y, m] = id.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

export function shiftMonthId(id: string, delta: number): string {
  const [y, m] = id.split('-').map(Number);
  return monthId(new Date(Date.UTC(y, m - 1 + delta, 1)));
}

// Ascending, inclusive. Assumes fromId <= toId (both "YYYY-MM", which sorts
// correctly as a plain string since the month is always zero-padded).
export function monthIdRange(fromId: string, toId: string): string[] {
  const range: string[] = [];
  let cur = fromId;
  let guard = 0;
  while (cur <= toId && guard < 600) {
    range.push(cur);
    cur = shiftMonthId(cur, 1);
    guard++;
  }
  return range;
}

export function isCurrentMonth(id: string): boolean {
  return id === currentMonthId();
}

export type InsightTone = 'positive' | 'attention' | 'milestone' | 'timing' | 'streak';

export interface InsightItem {
  id: string;
  tone: InsightTone;
  conclusion: string;
  support: string;
  weight: number; // higher = more significant; sort order, not shown to the user
  habitId?: string;
}

const STREAK_NOTABLE_THRESHOLD = 5;
const TREND_SIGNIFICANT_THRESHOLD = 5;

// Merges every source of "something worth saying about this month" into one
// ordered list — biggest win first, then attention items, then supporting/
// neutral observations. Never chronological or alphabetical.
export function buildMonthInsights(params: {
  stats: MonthlyWrappedStats;
  archetype: Archetype | null;
  milestone: Milestone | null;
  habitInsights: Insight[];
}): InsightItem[] {
  const { stats, milestone, habitInsights } = params;
  const items: InsightItem[] = [];

  if (milestone) {
    items.push({
      id: 'milestone',
      tone: 'milestone',
      conclusion: `You hit your ${milestone.name} milestone`,
      support: `Completed ${milestone.date}`,
      weight: 100,
    });
  }

  if (!stats.isThin && Math.abs(stats.trendDelta) >= TREND_SIGNIFICANT_THRESHOLD) {
    const up = stats.trendDelta >= 0;
    items.push({
      id: 'trend',
      tone: up ? 'positive' : 'attention',
      conclusion: up
        ? `You're ${stats.trendDelta}% more consistent than last month`
        : `You're ${Math.abs(stats.trendDelta)}% less consistent than last month`,
      support: up
        ? (stats.topHabit ? `${stats.topHabit.habit.name} led the way` : 'Keep the momentum going')
        : "Let's build it back next month",
      weight: 60 + Math.min(40, Math.abs(stats.trendDelta)),
    });
  }

  habitInsights.forEach(hi => {
    const tone: InsightTone = hi.tone === 'up' ? 'positive' : hi.tone === 'down' ? 'attention' : 'timing';
    const trendMatch = hi.id.match(/^trend-(?:up|down)-(.+)$/);
    items.push({
      id: hi.id,
      tone,
      conclusion: hi.text,
      support: hi.id.startsWith('corr-') ? 'A pattern across your habits'
        : hi.id.startsWith('trend-') ? 'This week vs. last week'
        : "Based on this month's check-ins",
      weight: 20 + Math.min(35, (hi.magnitude ?? 0.3) * 35),
      habitId: trendMatch ? trendMatch[1] : undefined,
    });
  });

  if (stats.longestStreak >= STREAK_NOTABLE_THRESHOLD) {
    items.push({
      id: 'streak',
      tone: 'streak',
      conclusion: `${stats.longestStreak}-day streak this month`,
      support: stats.topHabit ? `Your longest run with ${stats.topHabit.habit.name}` : 'Your longest run this month',
      weight: 15 + Math.min(30, stats.longestStreak),
    });
  }

  return items.sort((a, b) => b.weight - a.weight);
}
