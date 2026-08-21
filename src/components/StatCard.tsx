import React from 'react';
import { HABIT_ICONS } from '../constants';

interface StatCardProps {
  label: string; value: string | number; subValue?: string;
  icon: string; iconColor?: string;
  trend?: { value: number; isUp: boolean };
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, icon, iconColor, trend }) => (
  <div className="bg-[var(--color-card)] opacity-90 border border-[var(--color-border)] rounded-[10px] p-3 hover:border-blue-500/40 transition-all group">
    <span className="text-[7px] font-bold opacity-45 uppercase tracking-[.15em] block mb-2">{label}</span>
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-[7px] bg-[var(--color-bg)] flex items-center justify-center border border-[var(--color-border)] shrink-0">
        <div style={{ color: iconColor }} className="scale-90">{HABIT_ICONS[icon] || HABIT_ICONS['rocket']}</div>
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[18px] font-bold leading-none tracking-tight truncate">{value}</span>
          {trend && <span className={`text-[9px] font-bold ${trend.isUp ? 'text-green-500' : 'text-red-500'}`}>{trend.isUp ? '▲' : '▼'}{trend.value}%</span>}
        </div>
        {subValue && <span className="text-[9px] opacity-40 font-medium mt-0.5 block truncate">{subValue}</span>}
      </div>
    </div>
  </div>
);
