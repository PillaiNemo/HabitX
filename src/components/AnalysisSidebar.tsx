import React, { useMemo } from 'react';
import { Habit, DailyLog } from '../types';
import { Calendar, BarChart3, Sparkles } from 'lucide-react';
import { HABIT_ICONS } from '../constants';
import { computeInsights } from '../lib/insights';

interface AnalysisSidebarProps { habits: Habit[]; logs: DailyLog[]; }

export const AnalysisSidebar: React.FC<AnalysisSidebarProps> = ({ habits, logs }) => {
  const heatmapData = useMemo(() => {
    return [...logs].reverse().map(log => {
      const cnt = Object.values(log.completions).filter(Boolean).length;
      const total = Math.max(habits.length, 1);
      const ratio = cnt / total;
      if (cnt === 0) return 0;
      if (ratio <= 0.25) return 1;
      if (ratio <= 0.5) return 2;
      if (ratio <= 0.75) return 3;
      return 4;
    });
  }, [logs, habits.length]);

  const getHeatColor = (v: number) => `var(--heat-${v || 0})`;

  const stats = useMemo(() => {
    const dayTotals: Record<string, { sum: number; count: number }> = { MON:{sum:0,count:0},TUE:{sum:0,count:0},WED:{sum:0,count:0},THU:{sum:0,count:0},FRI:{sum:0,count:0},SAT:{sum:0,count:0},SUN:{sum:0,count:0} };
    let totalProgress = 0;
    logs.forEach(log => { if (dayTotals[log.day]) { dayTotals[log.day].sum += log.progress; dayTotals[log.day].count += 1; } totalProgress += log.progress; });
    let bestDay = 'N/A', maxAvg = -1;
    Object.entries(dayTotals).forEach(([day, data]) => { const avg = data.count > 0 ? data.sum / data.count : 0; if (avg > maxAvg) { maxAvg = avg; bestDay = day; } });
    const dayNames: Record<string, string> = { MON:'Monday',TUE:'Tuesday',WED:'Wednesday',THU:'Thursday',FRI:'Friday',SAT:'Saturday',SUN:'Sunday' };
    return { mostConsistentDay: maxAvg > 0 ? (dayNames[bestDay] || bestDay) : '—', avgCompletion: logs.length > 0 ? Math.round(totalProgress / logs.length) : 0 };
  }, [logs]);

  const habitStability = useMemo(() => {
    return habits.map(habit => {
      const cnt = logs.filter(l => l.completions[habit.id]).length;
      return { ...habit, consistency: logs.length > 0 ? Math.round((cnt / logs.length) * 100) : 0 };
    }).sort((a, b) => b.consistency - a.consistency);
  }, [habits, logs]);

  const insights = useMemo(() => computeInsights(habits, logs), [habits, logs]);

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      {/* Heatmap */}
      <section className="bg-[var(--color-card)]/40 border border-[var(--color-border)] rounded-[10px] p-3.5 flex-shrink-0">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-1.5">
            <Calendar size={11} className="text-green-500" strokeWidth={2.5} />
            <span className="text-[8px] font-bold opacity-45 uppercase tracking-widest">Heatmap</span>
          </div>
          <div className="flex gap-1">
            {[0,1,2,3,4].map(i => <div key={i} className="w-2 h-2 rounded-[1px]" style={{ background: getHeatColor(i) }} />)}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col justify-between text-[7px] font-bold opacity-35 uppercase h-[100px] w-3 text-center py-0.5">
            {['S','M','T','W','T','F','S'].map((d,i) => <span key={i}>{d}</span>)}
          </div>
          <div className="grid grid-flow-col grid-rows-7 gap-[4px] flex-1 h-[100px]">
            {Array.from({ length: 126 }).map((_, i) => {
              const v = heatmapData[i] !== undefined ? heatmapData[i] : 0;
              return <div key={i} className="rounded-[1px] transition-all duration-300" style={{ background: getHeatColor(v) }} />;
            })}
          </div>
        </div>
      </section>

      {/* Analysis */}
      <section className="bg-[var(--color-card)]/40 border border-[var(--color-border)] rounded-[10px] p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-blue-500">
            <BarChart3 size={12} /><span className="text-[9px] font-bold uppercase tracking-widest">Analysis</span>
          </div>
          <span className="text-[7px] font-bold text-green-500 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded uppercase tracking-widest">30-Day</span>
        </div>

        {insights.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-4 flex-shrink-0">
            {insights.slice(0, 1).map(ins => (
              <div
                key={ins.id}
                className={`flex items-start gap-1.5 text-[10px] leading-snug rounded-lg border px-2.5 py-2 ${
                  ins.tone === 'up' ? 'text-green-400 bg-green-500/5 border-green-500/15'
                  : ins.tone === 'down' ? 'text-amber-400 bg-amber-500/5 border-amber-500/15'
                  : 'text-blue-400 bg-blue-500/5 border-blue-500/15'
                }`}
              >
                <Sparkles size={10} className="flex-shrink-0 mt-[1px]" />
                <span className="opacity-90">{ins.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 mb-4 flex-shrink-0">
          <div className="bg-[var(--color-bg)]/40 border border-[var(--color-border)] p-3 rounded-lg">
            <span className="text-[7px] font-bold opacity-35 uppercase tracking-widest block mb-1.5">Best Day</span>
            <span className="text-[13px] font-bold opacity-85">{stats.mostConsistentDay}</span>
          </div>
          <div className="bg-[var(--color-bg)]/40 border border-[var(--color-border)] p-3 rounded-lg">
            <span className="text-[7px] font-bold opacity-35 uppercase tracking-widest block mb-1.5">Avg Complete</span>
            <span className="text-[13px] font-bold opacity-85">{stats.avgCompletion}%</span>
          </div>
        </div>

        <span className="text-[8px] font-bold opacity-35 uppercase tracking-widest block mb-3 flex-shrink-0">Stability Index</span>
        <div className="flex flex-col gap-4 overflow-hidden">
          {habitStability.map(habit => (
            <div key={habit.id} className="flex items-center gap-2.5 group min-w-0">
              <div style={{ color: habit.color }} className="opacity-65 flex-shrink-0 scale-90">{HABIT_ICONS[habit.icon]}</div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <span className="text-[11px] font-bold opacity-60 tracking-tight truncate">{habit.name}</span>
                <div className="h-[3px] w-full bg-[var(--color-bg)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${habit.consistency}%`, backgroundColor: habit.color }} />
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold opacity-25 flex-shrink-0">{habit.consistency}%</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
