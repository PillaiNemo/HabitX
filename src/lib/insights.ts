import { Habit, DailyLog } from '../types';

export interface Insight {
  id: string;
  text: string;
  tone: 'up' | 'down' | 'neutral';
  /** How strong/notable the underlying signal was (roughly 0-1) — used to rank insights by significance rather than the order they were found in. */
  magnitude?: number;
}

// Below this many "yes" or "no" days in a condition, a lift/delta is just
// noise — not enough samples to call it a pattern.
const MIN_SAMPLE = 4;
const LIFT_THRESHOLD = 0.3;
const TREND_THRESHOLD = 0.3;
const WEEKEND_THRESHOLD = 15;

// logs[0] is always today, descending — see lib/db.ts fetchLogs/buildEmptyLogs.
export function computeInsights(habits: Habit[], logs: DailyLog[]): Insight[] {
  const insights: Insight[] = [];
  if (habits.length < 2 || logs.length < 14) return insights;

  // 1. Cross-habit correlation: does doing A make B meaningfully more (or
  // less) likely on the same day, vs. days A didn't happen?
  for (let i = 0; i < habits.length; i++) {
    for (let j = i + 1; j < habits.length; j++) {
      const a = habits[i];
      const b = habits[j];
      let aYesBYes = 0, aYesBNo = 0, aNoBYes = 0, aNoBNo = 0;
      logs.forEach(l => {
        const ad = !!l.completions[a.id];
        const bd = !!l.completions[b.id];
        if (ad && bd) aYesBYes++;
        else if (ad) aYesBNo++;
        else if (bd) aNoBYes++;
        else aNoBNo++;
      });
      const aYesTotal = aYesBYes + aYesBNo;
      const aNoTotal = aNoBYes + aNoBNo;
      if (aYesTotal < MIN_SAMPLE || aNoTotal < MIN_SAMPLE) continue;
      const lift = aYesBYes / aYesTotal - aNoBYes / aNoTotal;
      if (lift >= LIFT_THRESHOLD) {
        insights.push({ id: `corr-${a.id}-${b.id}`, tone: 'up', text: `You're ${Math.round(lift * 100)}% more likely to do ${b.name} on days you do ${a.name}.`, magnitude: Math.min(1, lift) });
      } else if (lift <= -LIFT_THRESHOLD) {
        insights.push({ id: `corr-${a.id}-${b.id}`, tone: 'down', text: `${a.name} and ${b.name} rarely land on the same day — doing one makes the other ${Math.round(-lift * 100)}% less likely.`, magnitude: Math.min(1, -lift) });
      }
    }
  }

  // 2. Trend: this week vs. the week before, per habit.
  const recent = logs.slice(0, 7);
  const prior = logs.slice(7, 14);
  habits.forEach(h => {
    const recentRate = recent.filter(l => l.completions[h.id]).length / recent.length;
    const priorRate = prior.filter(l => l.completions[h.id]).length / prior.length;
    const delta = recentRate - priorRate;
    if (delta >= TREND_THRESHOLD) {
      insights.push({ id: `trend-up-${h.id}`, tone: 'up', text: `${h.name} is climbing — up ${Math.round(delta * 100)} points from last week.`, magnitude: Math.min(1, delta) });
    } else if (delta <= -TREND_THRESHOLD) {
      insights.push({ id: `trend-down-${h.id}`, tone: 'down', text: `${h.name} has slipped ${Math.round(-delta * 100)} points from last week — worth a nudge.`, magnitude: Math.min(1, -delta) });
    }
  });

  // 3. Weekday vs. weekend split, across all habits combined.
  const weekdayLogs = logs.filter(l => l.day !== 'SAT' && l.day !== 'SUN');
  const weekendLogs = logs.filter(l => l.day === 'SAT' || l.day === 'SUN');
  if (weekdayLogs.length >= MIN_SAMPLE + 1 && weekendLogs.length >= 2) {
    const wdAvg = weekdayLogs.reduce((s, l) => s + l.progress, 0) / weekdayLogs.length;
    const weAvg = weekendLogs.reduce((s, l) => s + l.progress, 0) / weekendLogs.length;
    const diff = wdAvg - weAvg;
    if (diff >= WEEKEND_THRESHOLD) {
      insights.push({ id: 'weekday-pattern', tone: 'neutral', text: `You're ${Math.round(diff)} points more consistent on weekdays than weekends.`, magnitude: Math.min(1, diff / 100) });
    } else if (diff <= -WEEKEND_THRESHOLD) {
      insights.push({ id: 'weekend-pattern', tone: 'neutral', text: `Weekends are actually your strongest stretch — ${Math.round(-diff)} points above your weekday average.`, magnitude: Math.min(1, -diff / 100) });
    }
  }

  return insights.slice(0, 4);
}
