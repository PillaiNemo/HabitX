import React from 'react';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { Habit, Goal } from '../types';
import { HABIT_ICONS } from '../constants';

interface SidebarProps {
  habits: Habit[];
  goals: Goal[];
  canAddHabit: boolean;
  canAddGoal: boolean;
  canDeleteHabit: boolean;
  onAddHabit: () => void;
  onAddGoal: () => void;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (id: string) => void;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (id: string) => void;
  onOpenIncrement: (goal: Goal) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ habits, goals, canAddHabit, canAddGoal, canDeleteHabit, onAddHabit, onAddGoal, onEditHabit, onDeleteHabit, onEditGoal, onDeleteGoal, onOpenIncrement }) => {
  return (
    <div className="flex flex-col gap-5 w-full h-full overflow-y-auto pb-4 no-scrollbar">
      {/* Habits */}
      <section className="flex flex-col">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold opacity-55 uppercase tracking-widest">Active Habits</span>
            <span className="text-[9px] opacity-35 font-mono">({habits.length}/5)</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {habits.map(habit => (
            <div key={habit.id} className="bg-[var(--color-sidebar-item)] border border-gray-500/[0.08] rounded-xl h-[42px] px-3 flex items-center justify-between hover:bg-gray-500/[0.12] transition-all group cursor-pointer">
              <div className="flex items-center gap-2.5">
                <div style={{ color: habit.color }} className="shrink-0 scale-90">{HABIT_ICONS[habit.icon]}</div>
                <span className="text-[12px] font-bold tracking-tight">{habit.name}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={e => { e.stopPropagation(); onEditHabit(habit); }} className="p-1.5 bg-[var(--color-bg)]/80 rounded-md opacity-60 hover:opacity-100 hover:text-blue-500 transition-all"><Edit2 size={9} /></button>
                <button onClick={e => { e.stopPropagation(); if (canDeleteHabit) onDeleteHabit(habit.id); }} disabled={!canDeleteHabit}
                  title={canDeleteHabit ? undefined : 'Minimum 3 habits required'}
                  className={`p-1.5 bg-[var(--color-bg)]/80 rounded-md transition-all ${canDeleteHabit ? 'opacity-60 hover:opacity-100 hover:text-red-500' : 'opacity-20 cursor-not-allowed'}`}><Trash2 size={9} /></button>
              </div>
            </div>
          ))}
        </div>
        {/* Always-visible add button — styled differently when maxed */}
        <button
          onClick={onAddHabit}
          disabled={!canAddHabit}
          className={`mt-2 w-full h-[34px] rounded-xl flex items-center justify-center text-[9px] font-bold uppercase tracking-widest transition-all
            ${canAddHabit
              ? 'bg-blue-500/8 border border-blue-500/20 text-blue-500 hover:bg-blue-500/15 cursor-pointer'
              : 'bg-transparent border border-dashed border-gray-500/20 text-[var(--color-text-dim)] opacity-40 cursor-not-allowed'
            }`}
        >
          {canAddHabit ? '+ Add Habit' : 'Max habits reached (5/5)'}
        </button>
      </section>

      {/* Milestones */}
      <section className="flex flex-col">
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-[9px] font-bold opacity-55 uppercase tracking-widest">Strategic Milestones</span>
          <span className="text-[9px] opacity-35 font-mono">({goals.length}/2)</span>
        </div>
        <div className="flex flex-col gap-2">
          {goals.map(goal => {
            const pct = Math.min(Math.round((goal.current / goal.target) * 100), 100);
            return (
              <div key={goal.id} className="bg-[var(--color-sidebar-item)] border border-gray-500/[0.08] rounded-[14px] p-3.5 group relative hover:bg-gray-500/[0.12] transition-colors overflow-hidden">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <div style={{ color: goal.color }} className="scale-[0.85] shrink-0">{HABIT_ICONS[goal.icon] || HABIT_ICONS['trophy']}</div>
                    <span className="text-[13px] font-bold tracking-tight leading-none">{goal.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={e => { e.stopPropagation(); onEditGoal(goal); }} className="p-1.5 bg-[var(--color-bg)]/80 rounded-md opacity-60 hover:opacity-100 hover:text-blue-500 transition-all"><Edit2 size={9} /></button>
                      <button onClick={e => { e.stopPropagation(); onDeleteGoal(goal.id); }} className="p-1.5 bg-[var(--color-bg)]/80 rounded-md opacity-60 hover:opacity-100 hover:text-red-500 transition-all"><Trash2 size={9} /></button>
                    </div>
                    <button onClick={() => onOpenIncrement(goal)} className="w-[26px] h-[26px] flex items-center justify-center bg-[var(--color-bg)]/80 hover:bg-blue-500/20 hover:text-blue-500 text-blue-500/40 border border-gray-500/10 rounded-lg transition-all active:scale-95 shrink-0"><Plus size={13} strokeWidth={2.5} /></button>
                  </div>
                </div>
                <div className="flex justify-between items-center px-0.5 mb-1.5">
                  <div className="flex items-center gap-1 font-mono text-[9px] font-bold">
                    <span>{goal.current}</span>
                    <span className="opacity-20">/</span>
                    <span className="opacity-45 uppercase tracking-wider">{goal.target} {goal.unit}</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold opacity-35">{pct}%</span>
                </div>
                <div className="h-[2px] w-full bg-[var(--color-bg)] rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: goal.color }} />
                </div>
              </div>
            );
          })}
          {canAddGoal && (
            <button onClick={onAddGoal} className="w-full h-[36px] border border-dashed border-gray-500/25 rounded-xl flex items-center justify-center text-[9px] font-bold opacity-35 hover:opacity-100 hover:border-blue-500/50 transition-all uppercase tracking-widest">
              + Add Milestone
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
