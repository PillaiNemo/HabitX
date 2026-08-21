import { supabase } from './supabase';
import { Habit, Goal, DailyLog } from '../types';

// ── HABITS ──────────────────────────────────────────────

export async function fetchHabits(userId: string): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id, name: r.name, icon: r.icon, color: r.color, consistency: 0,
  }));
}

export async function createHabit(userId: string, habit: Omit<Habit, 'id' | 'consistency'>, position: number): Promise<Habit> {
  const { data, error } = await supabase
    .from('habits')
    .insert({ user_id: userId, name: habit.name, icon: habit.icon, color: habit.color, position })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, icon: data.icon, color: data.color, consistency: 0 };
}

export async function updateHabit(id: string, updates: Partial<Pick<Habit, 'name' | 'icon' | 'color'>>): Promise<void> {
  const { error } = await supabase.from('habits').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteHabit(id: string): Promise<void> {
  const { error } = await supabase.from('habits').delete().eq('id', id);
  if (error) throw error;
}

// ── GOALS ────────────────────────────────────────────────

export async function fetchGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id, name: r.name, icon: r.icon, color: r.color,
    target: r.target, current: r.current, unit: r.unit,
  }));
}

export async function createGoal(userId: string, goal: Omit<Goal, 'id'>): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .insert({ user_id: userId, name: goal.name, icon: goal.icon, color: goal.color, target: goal.target, current: goal.current, unit: goal.unit })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, icon: data.icon, color: data.color, target: data.target, current: data.current, unit: data.unit };
}

export async function updateGoal(id: string, updates: Partial<Omit<Goal, 'id'>>): Promise<void> {
  const { error } = await supabase.from('goals').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw error;
}

// ── DAILY LOGS ───────────────────────────────────────────

export async function fetchLogs(userId: string, habits: Habit[]): Promise<DailyLog[]> {
  if (habits.length === 0) return buildEmptyLogs(habits);

  // Fetch last 30 days of logs
  const since = new Date();
  since.setDate(since.getDate() - 29);
  const sinceStr = since.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', sinceStr)
    .order('log_date', { ascending: false });
  if (error) throw error;

  const days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const today = new Date();
  const logs: DailyLog[] = [];

  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const completions: Record<string, boolean> = {};

    habits.forEach(h => {
      const row = (data || []).find(r => r.habit_id === h.id && r.log_date === dateStr);
      completions[h.id] = row?.completed ?? false;
    });

    const cnt = Object.values(completions).filter(Boolean).length;
    const progress = Math.round((cnt / habits.length) * 100);

    logs.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      day: days[d.getDay()],
      progress,
      completions,
      status: progress === 100 ? 'PEAK' : progress >= 60 ? 'STABLE' : 'IDLE',
      dateStr,
    });
  }
  return logs;
}

export function buildEmptyLogs(habits: Habit[]): DailyLog[] {
  const days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const today = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const completions: Record<string, boolean> = {};
    habits.forEach(h => { completions[h.id] = false; });
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      day: days[d.getDay()],
      progress: 0,
      completions,
      status: 'IDLE' as const,
      dateStr: d.toISOString().split('T')[0],
    };
  });
}

export async function upsertLog(userId: string, habitId: string, dateStr: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from('daily_logs')
    .upsert({ user_id: userId, habit_id: habitId, log_date: dateStr, completed }, { onConflict: 'user_id,habit_id,log_date' });
  if (error) throw error;
}

// ── WRAPPED: MONTH-SCOPED LOGS ─────────────────────────────

// Same gap-filling shape as fetchLogs, bounded to one calendar month instead
// of a trailing 30-day window. For the current month, stops at today rather
// than filling in not-yet-happened future days.
export async function fetchLogsForMonth(userId: string, habits: Habit[], monthKey: string): Promise<DailyLog[]> {
  if (habits.length === 0) return [];

  const [y, m] = monthKey.split('-').map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const lastOfMonth = new Date(y, m, 0);
  const today = new Date();
  const endDate = lastOfMonth < today ? lastOfMonth : today;

  const sinceStr = firstOfMonth.toISOString().split('T')[0];
  const untilStr = endDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', sinceStr)
    .lte('log_date', untilStr)
    .order('log_date', { ascending: false });
  if (error) throw error;

  const days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const logs: DailyLog[] = [];

  for (
    let d = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    d >= firstOfMonth;
    d.setDate(d.getDate() - 1)
  ) {
    const dateStr = d.toISOString().split('T')[0];
    const completions: Record<string, boolean> = {};

    habits.forEach(h => {
      const row = (data || []).find(r => r.habit_id === h.id && r.log_date === dateStr);
      completions[h.id] = row?.completed ?? false;
    });

    const cnt = Object.values(completions).filter(Boolean).length;
    const progress = Math.round((cnt / habits.length) * 100);

    logs.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      day: days[d.getDay()],
      progress,
      completions,
      status: progress === 100 ? 'PEAK' : progress >= 60 ? 'STABLE' : 'IDLE',
      dateStr,
    });
  }
  return logs;
}

// Earliest month with any tracked history, used to size the month deck.
// Returns null for a brand-new user with no daily_logs rows at all.
export async function fetchEarliestLogMonth(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('log_date')
    .eq('user_id', userId)
    .order('log_date', { ascending: true })
    .limit(1);
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data[0].log_date.slice(0, 7);
}
