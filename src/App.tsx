import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LayoutGrid, Settings, LogOut, Rocket, X, TrendingUp, Palette, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { StatCard } from './components/StatCard';
import { Sidebar } from './components/Sidebar';
import { HabitTable } from './components/HabitTable';
import { AnalysisSidebar } from './components/AnalysisSidebar';
import { WrappedHub } from './components/WrappedHub';
import { WrappedBanner } from './components/WrappedBanner';
import { HABIT_ICONS, generateEmptyLogs } from './constants';
import { fetchLogs, upsertLog, createHabit, updateHabit, deleteHabit, createGoal, updateGoal, deleteGoal } from './lib/db';
import { DailyLog, Habit, Goal, Theme } from './types';

const DARK_COLORS = ['#00FF9C','#00D1FF','#B026FF','#FF0055','#FFB800','#fbbf24','#4ade80','#2dd4bf','#94a3b8','#22c55e'];
const LIGHT_COLORS = ['#10b981','#0ea5e9','#8b5cf6','#f43f5e','#f59e0b','#3b82f6','#ec4899','#84cc16','#64748b','#14b8a6'];
const PRESET_ICONS = Object.keys(HABIT_ICONS).slice(0, 10);
const THEMES: { id: Theme; name: string }[] = [{ id: 'dark', name: 'Black' }, { id: 'light', name: 'White' }];
const MIN_HABITS = 3;
const MAX_HABITS = 5;
const MAX_GOALS = 2;

const Modal = ({ children }: { children: React.ReactNode }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">{children}</div>
);

interface AppProps {
  userId: string;
  initialHabits: Habit[];
  initialGoals: Goal[];
  isNewUser?: boolean;
  onLogout: () => void;
  // When provided, logs are used as-is instead of fetched from Supabase —
  // lets a preview/demo harness seed the dashboard without a real session.
  initialLogs?: DailyLog[];
  // Extended history (beyond the 30-day initialLogs window) for the Wrapped
  // month deck to browse, so a preview/demo harness can show it fully
  // populated without a real Supabase session.
  mockWrappedLogs?: DailyLog[];
}

const App: React.FC<AppProps> = ({ userId, initialHabits, initialGoals, isNewUser = false, onLogout, initialLogs, mockWrappedLogs }) => {
  const [time, setTime] = useState(new Date());
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [logs, setLogs] = useState<DailyLog[]>(() => initialLogs ?? (isNewUser ? generateEmptyLogs(initialHabits) : []));
  const [logsLoading, setLogsLoading] = useState(!isNewUser && !initialLogs);
  const [theme, setTheme] = useState<Theme>('dark');
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [incrementingGoal, setIncrementingGoal] = useState<Goal | null>(null);
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [wrappedInitialScreen, setWrappedInitialScreen] = useState<'story' | 'deck'>('story');
  const [confirmDeleteHabitId, setConfirmDeleteHabitId] = useState<string | null>(null);
  const [confirmDeleteGoalId, setConfirmDeleteGoalId] = useState<string | null>(null);

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { document.body.setAttribute('data-theme', theme); }, [theme]);

  // Load logs from DB on mount for returning users
  useEffect(() => {
    if (isNewUser || initialLogs) return;
    fetchLogs(userId, initialHabits).then(l => { setLogs(l); setLogsLoading(false); }).catch(() => setLogsLoading(false));
  }, [userId, isNewUser, initialLogs]);

  const activeColors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  const formattedDate = time.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  const formattedTime = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase();

  const dashboardStats = useMemo(() => {
    const empty = { streak: 0, performance7d: 0, performanceTrend: 0, peakDate: '—', mostConsistentHabitName: '—', mostConsistentHabitValue: 0, mostConsistentHabitColor: '#38bdf8' };
    if (habits.length === 0 || logs.every(l => l.progress === 0)) return empty;
    let streak = 0;
    for (const log of logs) { if (Object.values(log.completions).filter(Boolean).length > 0) streak++; else if (streak > 0) break; }
    const last7 = logs.slice(0, 7);
    const perf7 = last7.length > 0 ? Math.round(last7.reduce((s, l) => s + l.progress, 0) / last7.length) : 0;
    const prev7 = logs.slice(7, 14);
    const prevPerf7 = prev7.length > 0 ? Math.round(prev7.reduce((s, l) => s + l.progress, 0) / prev7.length) : 0;
    let peak = logs[0];
    logs.forEach(l => { if (l.progress >= peak.progress) peak = l; });
    const counts: Record<string, number> = {};
    habits.forEach(h => { counts[h.id] = 0; });
    logs.forEach(l => habits.forEach(h => { if (l.completions[h.id]) counts[h.id] += 1; }));
    let bestId = habits[0]?.id, maxC = 0;
    habits.forEach(h => { const c = counts[h.id] || 0; if (c > maxC) { maxC = c; bestId = h.id; } });
    const best = habits.find(h => h.id === bestId);
    return { streak, performance7d: perf7, performanceTrend: perf7 - prevPerf7, peakDate: peak?.date.split(',')[0] ?? '—', mostConsistentHabitName: best?.name || '—', mostConsistentHabitValue: logs.length > 0 ? Math.round((maxC / logs.length) * 100) : 0, mostConsistentHabitColor: best?.color || '#38bdf8' };
  }, [logs, habits]);

  const handleToggleHabit = useCallback(async (logIndex: number, habitId: string) => {
    if (logIndex !== 0) return;
    const log = logs[logIndex];
    const newVal = !log.completions[habitId];
    // Optimistic update
    setLogs(prev => {
      const next = [...prev];
      const l = { ...next[logIndex] };
      const completions = { ...l.completions, [habitId]: newVal };
      const cnt = Object.values(completions).filter(Boolean).length;
      const progress = habits.length > 0 ? Math.round((cnt / habits.length) * 100) : 0;
      next[logIndex] = { ...l, completions, progress, status: progress === 100 ? 'PEAK' : progress >= 60 ? 'STABLE' : 'IDLE' };
      return next;
    });
    // Persist to DB
    const dateStr = log.dateStr || new Date().toISOString().split('T')[0];
    try { await upsertLog(userId, habitId, dateStr, newVal); } catch (err) {
      console.error('Failed to save log', err);
      // Revert on failure
      setLogs(prev => {
        const next = [...prev];
        const l = { ...next[logIndex] };
        const completions = { ...l.completions, [habitId]: !newVal };
        const cnt = Object.values(completions).filter(Boolean).length;
        const progress = habits.length > 0 ? Math.round((cnt / habits.length) * 100) : 0;
        next[logIndex] = { ...l, completions, progress, status: progress === 100 ? 'PEAK' : progress >= 60 ? 'STABLE' : 'IDLE' };
        return next;
      });
    }
  }, [logs, habits.length, userId]);

  const handleSaveHabit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    const color = fd.get('color') as string;
    const icon = fd.get('icon') as string;
    try {
      if (editingHabit) {
        await updateHabit(editingHabit.id, { name, color, icon });
        setHabits(prev => prev.map(h => h.id === editingHabit.id ? { ...h, name, color, icon } : h));
        setEditingHabit(null);
      } else if (isAddingHabit) {
        const newH = await createHabit(userId, { name, color, icon }, habits.length);
        setHabits(prev => [...prev, newH]);
        setLogs(prev => prev.map(log => ({ ...log, completions: { ...log.completions, [newH.id]: false } })));
        setIsAddingHabit(false);
      }
    } catch (err) { console.error('Failed to save habit', err); }
  };

  const handleSaveGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    const icon = fd.get('icon') as string;
    const target = parseFloat(fd.get('target') as string);
    const color = fd.get('color') as string;
    const unit = (fd.get('unit') as string) || 'units';
    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, { name, target, icon, color, unit });
        setGoals(prev => prev.map(g => g.id === editingGoal.id ? { ...g, name, target, icon, color, unit } : g));
        setEditingGoal(null);
      } else if (isAddingGoal) {
        const current = parseFloat(fd.get('current') as string) || 0;
        const newG = await createGoal(userId, { name, target, current, unit, color, icon });
        setGoals(prev => [...prev, newG]);
        setIsAddingGoal(false);
      }
    } catch (err) { console.error('Failed to save goal', err); }
  };

  const handleDeleteHabit = async () => {
    if (!confirmDeleteHabitId) return;
    try {
      await deleteHabit(confirmDeleteHabitId);
      setHabits(prev => prev.filter(h => h.id !== confirmDeleteHabitId));
      setLogs(prev => prev.map(log => { const c = { ...log.completions }; delete c[confirmDeleteHabitId]; return { ...log, completions: c }; }));
    } catch (err) { console.error('Failed to delete habit', err); }
    setConfirmDeleteHabitId(null);
  };

  const handleDeleteGoal = async () => {
    if (!confirmDeleteGoalId) return;
    try {
      await deleteGoal(confirmDeleteGoalId);
      setGoals(prev => prev.filter(g => g.id !== confirmDeleteGoalId));
    } catch (err) { console.error('Failed to delete goal', err); }
    setConfirmDeleteGoalId(null);
  };

  const handleIncrementGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!incrementingGoal) return;
    const amount = parseFloat(new FormData(e.currentTarget).get('amount') as string) || 0;
    const newCurrent = Math.min(incrementingGoal.current + amount, incrementingGoal.target);
    try {
      await updateGoal(incrementingGoal.id, { current: newCurrent });
      setGoals(prev => prev.map(g => g.id === incrementingGoal.id ? { ...g, current: newCurrent } : g));
    } catch (err) { console.error('Failed to update goal', err); }
    setIncrementingGoal(null);
  };

  if (logsLoading) {
    return (
      <div className="fixed inset-0 bg-[var(--color-bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Rocket size={16} className="text-white" /></div>
          <div className="w-4 h-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-[10px] opacity-30 uppercase tracking-widest font-mono">Loading your protocol...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg)] text-[var(--color-text)] font-sans flex flex-col antialiased overflow-hidden" style={{ height: '100vh' }}>
      <header className="flex-shrink-0 px-5 py-1.5 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-header-bg)] z-50">
        <div className="flex flex-col">
          <span className="text-[6px] font-bold opacity-45 uppercase tracking-widest">Date</span>
          <span className="text-[10px] font-bold opacity-80">{formattedDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center"><Rocket className="text-white" size={12} /></div>
          <span className="text-[16px] font-bold tracking-tighter">HabitX</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[6px] font-bold opacity-45 uppercase tracking-widest">Clock</span>
          <span className="text-[10px] font-mono font-bold uppercase">{formattedTime}</span>
        </div>
      </header>

      <main className="flex-1 min-h-0 px-4 pt-2 pb-0 flex flex-col gap-2 overflow-hidden">
        <div className="flex-shrink-0">
          <WrappedBanner habits={habits} goals={goals} logs={logs} onOpen={() => { setWrappedInitialScreen('story'); setIsWrappedOpen(true); }} />
        </div>
        <div className="flex-shrink-0 grid grid-cols-4 gap-2">
          <StatCard label="STREAK" value={`${dashboardStats.streak}d`} subValue="Daily streak" icon="fire" iconColor="#FF0055" />
          <StatCard label="7-DAY AVG" value={`${dashboardStats.performance7d}%`} subValue={`vs prev: ${dashboardStats.performanceTrend >= 0 ? '+' : ''}${dashboardStats.performanceTrend}%`} icon="chart" iconColor="#B026FF" trend={{ value: Math.abs(dashboardStats.performanceTrend), isUp: dashboardStats.performanceTrend >= 0 }} />
          <StatCard label="PEAK DATE" value={dashboardStats.peakDate} subValue="Best day this cycle" icon="calendar" iconColor="#00FF9C" />
          <StatCard label="TOP HABIT" value={dashboardStats.mostConsistentHabitName} subValue={`${dashboardStats.mostConsistentHabitValue}% stability`} icon="award" iconColor={dashboardStats.mostConsistentHabitColor} />
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-[220px_1fr_250px] gap-3 overflow-hidden pb-12">
          <div className="min-h-0 overflow-hidden">
            <Sidebar habits={habits} goals={goals} canAddHabit={habits.length < MAX_HABITS} canAddGoal={goals.length < MAX_GOALS}
              canDeleteHabit={habits.length > MIN_HABITS}
              onAddHabit={() => habits.length < MAX_HABITS && setIsAddingHabit(true)}
              onAddGoal={() => goals.length < MAX_GOALS && setIsAddingGoal(true)}
              onEditHabit={setEditingHabit} onDeleteHabit={setConfirmDeleteHabitId}
              onEditGoal={setEditingGoal} onDeleteGoal={setConfirmDeleteGoalId}
              onOpenIncrement={setIncrementingGoal} />
          </div>
          <div className="min-w-0 min-h-0 overflow-auto" style={{ scrollbarWidth: 'none' }}>
            <HabitTable logs={logs} habits={habits} onToggleHabit={handleToggleHabit} />
          </div>
          <div className="min-h-0 overflow-hidden">
            <AnalysisSidebar habits={habits} logs={logs} />
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 w-full bg-[var(--color-nav-bg)] border-t border-[var(--color-border)] px-10 py-1.5 flex items-center justify-between z-50">
        <div className="flex-1" />
        <div className="flex gap-12">
          <button className="flex flex-col items-center gap-0.5 text-blue-500">
            <LayoutGrid size={15} /><span className="text-[6px] font-bold uppercase tracking-widest">Dashboard</span>
            <div className="w-3 h-0.5 bg-blue-500 rounded-full" />
          </button>
          <button onClick={() => { setWrappedInitialScreen('deck'); setIsWrappedOpen(true); }} className="flex flex-col items-center gap-0.5 text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors">
            <Sparkles size={15} /><span className="text-[6px] font-bold uppercase tracking-widest">Wrapped</span>
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="flex flex-col items-center gap-0.5 text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors">
            <Settings size={15} /><span className="text-[6px] font-bold uppercase tracking-widest">Settings</span>
          </button>
        </div>
        <div className="flex-1 flex justify-end">
          <button onClick={onLogout} className="flex flex-col items-center gap-0.5 text-red-500/40 hover:text-red-500 transition-colors">
            <LogOut size={15} /><span className="text-[6px] font-bold uppercase tracking-widest">Logout</span>
          </button>
        </div>
      </nav>

      {isWrappedOpen && (
        <WrappedHub
          habits={habits}
          goals={goals}
          logs={logs}
          userId={userId}
          initialScreen={wrappedInitialScreen}
          mockLogs={mockWrappedLogs}
          onClose={() => setIsWrappedOpen(false)}
        />
      )}

      {confirmDeleteHabitId && <Modal><div className="bg-[var(--color-card)] border border-[var(--color-border)] p-5 rounded-2xl w-full max-w-[280px] text-center"><div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-3"><AlertTriangle className="text-red-500" size={18}/></div><h3 className="text-sm font-bold mb-1.5">Delete Habit?</h3><p className="text-[10px] opacity-50 mb-4">This will permanently remove this habit and all its history.</p><div className="flex gap-2"><button onClick={() => setConfirmDeleteHabitId(null)} className="flex-1 py-2 bg-gray-500/10 hover:bg-gray-500/20 rounded-lg text-[10px] font-bold">Cancel</button><button onClick={handleDeleteHabit} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold">Delete</button></div></div></Modal>}
      {confirmDeleteGoalId && <Modal><div className="bg-[var(--color-card)] border border-[var(--color-border)] p-5 rounded-2xl w-full max-w-[280px] text-center"><div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-3"><AlertTriangle className="text-red-500" size={18}/></div><h3 className="text-sm font-bold mb-1.5">Delete Milestone?</h3><p className="text-[10px] opacity-50 mb-4">Progress will be lost permanently.</p><div className="flex gap-2"><button onClick={() => setConfirmDeleteGoalId(null)} className="flex-1 py-2 bg-gray-500/10 hover:bg-gray-500/20 rounded-lg text-[10px] font-bold">Cancel</button><button onClick={handleDeleteGoal} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold">Delete</button></div></div></Modal>}
      {isSettingsOpen && <Modal><div className="bg-[var(--color-card)] border border-[var(--color-border)] p-5 rounded-2xl w-full max-w-[260px]"><div className="flex justify-between items-center mb-4"><div className="flex items-center gap-1.5"><Palette size={13} className="text-blue-500"/><h2 className="text-[9px] font-bold uppercase tracking-wider">Appearance</h2></div><button onClick={() => setIsSettingsOpen(false)} className="text-gray-500 hover:text-[var(--color-text)]"><X size={13}/></button></div>{THEMES.map(t => (<button key={t.id} onClick={() => setTheme(t.id)} className={`w-full flex items-center justify-between p-2.5 rounded-lg border mb-1.5 transition-all text-[11px] font-bold ${theme===t.id?'border-blue-500 bg-blue-500/5 text-blue-500':'border-[var(--color-border)] text-[var(--color-text-dim)]'}`}><span>{t.name}</span>{theme===t.id&&<CheckCircle2 size={12}/>}</button>))} <button onClick={() => setIsSettingsOpen(false)} className="w-full mt-3 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold py-2 rounded-lg">Close</button></div></Modal>}

      {(editingHabit || isAddingHabit) && <Modal><form onSubmit={handleSaveHabit} className="bg-[var(--color-card)] border border-[var(--color-border)] p-5 rounded-2xl w-full max-w-[310px]"><div className="flex justify-between items-center mb-3"><h2 className="text-[9px] font-bold uppercase tracking-[.2em] opacity-30">{editingHabit?'Edit Habit':'New Habit'}</h2><button type="button" onClick={() => {setEditingHabit(null);setIsAddingHabit(false);}}><X size={13} className="text-gray-500"/></button></div><div className="space-y-3"><div><label className="text-[7px] font-bold opacity-25 uppercase tracking-widest block mb-1">Name</label><input name="name" defaultValue={editingHabit?.name||''} required placeholder="Habit name" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[12px] text-[var(--color-text)] focus:border-blue-500 outline-none"/></div><div><label className="text-[7px] font-bold opacity-25 uppercase tracking-widest block mb-1">Icon</label><div className="grid grid-cols-5 gap-1">{PRESET_ICONS.map(i=>(<label key={i} className="cursor-pointer"><input type="radio" name="icon" value={i} defaultChecked={editingHabit?.icon===i||(!editingHabit&&i==='exercise')} className="peer hidden"/><div className="w-7 h-7 mx-auto bg-[var(--color-bg)]/50 border border-[var(--color-border)] rounded-md flex items-center justify-center text-[var(--color-text-dim)] peer-checked:border-blue-500 peer-checked:text-blue-500 transition-all">{HABIT_ICONS[i]}</div></label>))}</div></div><div><label className="text-[7px] font-bold opacity-25 uppercase tracking-widest block mb-1">Color</label><div className="grid grid-cols-5 gap-1">{activeColors.map(c=>(<label key={c} className="cursor-pointer"><input type="radio" name="color" value={c} defaultChecked={editingHabit?.color===c||(!editingHabit&&c===activeColors[0])} className="peer hidden"/><div className="w-4 h-4 mx-auto rounded-full transition-all peer-checked:scale-125" style={{backgroundColor:c}}/></label>))}</div></div></div><button type="submit" className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold py-2.5 rounded-lg">{editingHabit?'Save Changes':'Create Habit'}</button></form></Modal>}

      {(editingGoal || isAddingGoal) && <Modal><form onSubmit={handleSaveGoal} className="bg-[var(--color-card)] border border-[var(--color-border)] p-5 rounded-2xl w-full max-w-[310px]"><div className="flex justify-between items-center mb-3"><h2 className="text-[9px] font-bold uppercase tracking-[.2em] opacity-30">{editingGoal?'Edit Target':'New Target'}</h2><button type="button" onClick={() => {setEditingGoal(null);setIsAddingGoal(false);}}><X size={13} className="text-gray-500"/></button></div><div className="space-y-3"><div><label className="text-[7px] font-bold opacity-25 uppercase tracking-widest block mb-1">Label</label><input name="name" defaultValue={editingGoal?.name||''} required placeholder="Goal name" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[12px] text-[var(--color-text)] focus:border-blue-500 outline-none"/></div><div className="grid grid-cols-2 gap-2">{!editingGoal&&<div><label className="text-[7px] font-bold opacity-25 uppercase tracking-widest block mb-1">Start</label><input name="current" type="number" defaultValue={0} className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[12px] text-[var(--color-text)] focus:border-blue-500 outline-none"/></div>}<div className={editingGoal?'col-span-2':''}><label className="text-[7px] font-bold opacity-25 uppercase tracking-widest block mb-1">Target</label><input name="target" type="number" defaultValue={editingGoal?.target||100} required className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[12px] text-[var(--color-text)] focus:border-blue-500 outline-none"/></div></div><div><label className="text-[7px] font-bold opacity-25 uppercase tracking-widest block mb-1">Metric</label><input name="unit" defaultValue={editingGoal?.unit||'km'} placeholder="km, books…" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[12px] text-[var(--color-text)] focus:border-blue-500 outline-none"/></div><div><label className="text-[7px] font-bold opacity-25 uppercase tracking-widest block mb-1">Icon</label><div className="grid grid-cols-5 gap-1">{PRESET_ICONS.map(i=>(<label key={i} className="cursor-pointer"><input type="radio" name="icon" value={i} defaultChecked={editingGoal?.icon===i||(!editingGoal&&i==='trophy')} className="peer hidden"/><div className="w-7 h-7 mx-auto bg-[var(--color-bg)]/50 border border-[var(--color-border)] rounded-md flex items-center justify-center text-[var(--color-text-dim)] peer-checked:border-blue-500 peer-checked:text-blue-500 transition-all">{HABIT_ICONS[i]}</div></label>))}</div></div><div><label className="text-[7px] font-bold opacity-25 uppercase tracking-widest block mb-1">Color</label><div className="grid grid-cols-5 gap-1">{activeColors.map(c=>(<label key={c} className="cursor-pointer"><input type="radio" name="color" value={c} defaultChecked={editingGoal?.color===c||(!editingGoal&&c===activeColors[0])} className="peer hidden"/><div className="w-4 h-4 mx-auto rounded-full transition-all peer-checked:scale-125" style={{backgroundColor:c}}/></label>))}</div></div></div><button type="submit" className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold py-2.5 rounded-lg">{editingGoal?'Save Changes':'Create Target'}</button></form></Modal>}

      {incrementingGoal && <Modal><form onSubmit={handleIncrementGoal} className="bg-[var(--color-card)] border border-[var(--color-border)] p-5 rounded-2xl w-full max-w-[260px]"><div className="flex justify-between items-center mb-4"><div className="flex items-center gap-1.5"><TrendingUp size={13} className="text-blue-500"/><h2 className="text-[9px] font-bold uppercase tracking-wider">Log Yield</h2></div><button type="button" onClick={() => setIncrementingGoal(null)}><X size={13} className="text-gray-500"/></button></div><p className="text-[10px] font-bold opacity-50 text-center mb-3 truncate">{incrementingGoal.name}</p><input autoFocus name="amount" type="number" step="any" placeholder="0.0" required className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-xl text-center text-[var(--color-text)] focus:border-blue-500 outline-none font-mono"/><p className="text-[7px] font-bold opacity-22 uppercase tracking-widest text-center mt-1.5">{incrementingGoal.unit}</p><div className="flex gap-2 mt-4"><button type="button" onClick={() => setIncrementingGoal(null)} className="flex-1 bg-[var(--color-border)]/20 text-[9px] font-bold py-2 rounded-lg">Cancel</button><button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold py-2 rounded-lg">Log</button></div></form></Modal>}
    </div>
  );
};

export default App;
