import React from 'react';
import { Check, Lock } from 'lucide-react';
import { DailyLog, Habit } from '../types';
import { HABIT_ICONS } from '../constants';

interface HabitTableProps {
  logs: DailyLog[];
  habits: Habit[];
  onToggleHabit: (logIndex: number, habitId: string) => void;
}

const DATE_WIDTH = 22;
const STATUS_WIDTH = 15;
// Habit columns get an even share of the remaining width, but capped — with
// only a couple of habits, an uncapped share leaves the (small, fixed-size)
// checkbox floating in a mostly-empty column. Whatever width the cap frees
// up goes to the progress column instead, which actually benefits from it.
const HABIT_COLS_TOTAL = 39;
const MAX_HABIT_COL = 9;

export const HabitTable: React.FC<HabitTableProps> = ({ logs, habits, onToggleHabit }) => {
  const visibleLogs = logs.slice(0, 10);
  const habitCount = Math.max(habits.length, 1);
  const habitColPct = Math.min(HABIT_COLS_TOTAL / habitCount, MAX_HABIT_COL);
  const habitColWidth = `${habitColPct}%`;
  const progressWidth = `${63 - habitColPct * habitCount}%`;

  // Fewer habits → more room per column, so scale everything up to fill the space.
  const boxPx = habitCount <= 3 ? 30 : habitCount === 4 ? 25 : 21;
  const checkSize = habitCount <= 3 ? 14 : habitCount === 4 ? 12 : 10;
  const headerIconScale = habitCount <= 3 ? 1.05 : habitCount === 4 ? 0.9 : 0.75;

  return (
    <div className="bg-[var(--color-card)]/10 border border-gray-500/[0.08] rounded-[10px] flex flex-col h-fit shadow-xl w-full overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left table-fixed min-w-[460px] border-collapse">
          <thead>
            <tr className="border-b border-gray-500/[0.04]">
              <th style={{ width: `${DATE_WIDTH}%` }} className="px-5 py-3 text-[8px] font-bold opacity-35 uppercase tracking-widest bg-[var(--color-bg)]/20 text-[var(--color-text)]">DATE</th>
              <th style={{ width: progressWidth }} className="px-2 py-3 text-[8px] font-bold opacity-35 uppercase tracking-widest bg-[var(--color-bg)]/20 text-[var(--color-text)]">PROGRESS</th>
              {habits.map(habit => (
                <th key={habit.id} style={{ width: habitColWidth }} className="px-1 py-3 text-center bg-[var(--color-bg)]/20">
                  <div className="flex justify-center opacity-50" style={{ color: habit.color, transform: `scale(${headerIconScale})` }}>{HABIT_ICONS[habit.icon]}</div>
                </th>
              ))}
              <th style={{ width: `${STATUS_WIDTH}%` }} className="px-5 py-3 text-[8px] font-bold opacity-35 uppercase tracking-widest text-right bg-[var(--color-bg)]/20 text-[var(--color-text)]">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-500/[0.03]">
            {visibleLogs.map((log, logIdx) => {
              const isToday = logIdx === 0;
              const pbColor = log.progress >= 100 ? 'var(--color-accent-neon)' : log.progress >= 60 ? 'var(--color-accent-blue)' : 'rgba(100,116,139,0.2)';
              return (
                <tr key={log.date} className={`hover:bg-[var(--color-text)]/[0.02] transition-colors h-[46px] ${!isToday ? 'opacity-55' : ''}`}>
                  <td className="px-5 py-0 align-middle">
                    <div className="flex flex-col gap-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold opacity-90 whitespace-nowrap leading-none tracking-tight">{log.date}</span>
                        {!isToday && <Lock size={8} className="opacity-30 flex-shrink-0" />}
                      </div>
                      <span className="text-[7px] font-bold opacity-25 uppercase tracking-widest leading-none mt-1">{log.day}</span>
                    </div>
                  </td>
                  <td className="px-2 py-0 align-middle">
                    <div className="flex flex-col gap-1 px-2">
                      <span className="text-[7px] font-bold opacity-25 leading-none tracking-wider">{log.progress}% SYNC</span>
                      <div className="h-[2px] w-[80%] bg-[var(--color-bg)] rounded-full overflow-hidden">
                        <div className="h-full transition-all duration-700 ease-out" style={{ width: `${log.progress}%`, backgroundColor: pbColor }} />
                      </div>
                    </div>
                  </td>
                  {habits.map(habit => {
                    const isDone = log.completions[habit.id];
                    if (!isToday) {
                      return (
                        <td key={habit.id} className="px-1 py-0 text-center align-middle">
                          <div className={`mx-auto rounded-md flex items-center justify-center border ${isDone ? 'bg-[var(--color-accent-neon)]/5 text-[var(--color-accent-neon)] border-[var(--color-accent-neon)]/15' : 'bg-transparent border-[var(--color-text)]/[0.04]'}`} style={{ width: boxPx, height: boxPx }}>
                            {isDone && <Check size={checkSize} strokeWidth={3} />}
                          </div>
                        </td>
                      );
                    }
                    return (
                      <td key={habit.id} className="px-1 py-0 text-center align-middle">
                        <button onClick={() => onToggleHabit(logIdx, habit.id)} className={`mx-auto rounded-md flex items-center justify-center border transition-all duration-200 ${isDone ? 'bg-[var(--color-accent-neon)]/5 text-[var(--color-accent-neon)] border-[var(--color-accent-neon)]/20' : 'bg-transparent text-transparent border-[var(--color-text)]/5 hover:bg-gray-500/10 hover:border-[var(--color-text)]/15'}`} style={{ width: boxPx, height: boxPx }}>
                          {isDone ? <Check size={checkSize} strokeWidth={3} /> : <div className="w-[2px] h-[2px] rounded-full bg-[var(--color-text)]/10" />}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-5 py-0 text-right align-middle">
                    <span className="inline-block text-[6px] font-black tracking-[.2em]" style={{ color: log.status === 'PEAK' ? 'var(--color-accent-neon)' : log.status === 'STABLE' ? 'var(--color-accent-blue)' : 'var(--color-text-dim)', opacity: log.status === 'IDLE' ? 0.2 : 0.7 }}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
