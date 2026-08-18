import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { HABIT_ICONS } from '../constants';
import { MonthCardData } from './MonthDeck';
import './MonthListView.css';

interface MonthListViewProps {
  months: MonthCardData[]; // most recent first
  onSelectMonth: (monthId: string) => void;
  onBack: () => void;
  onClose: () => void;
}

export const MonthListView: React.FC<MonthListViewProps> = ({ months, onSelectMonth, onBack, onClose }) => (
  <div className="mlist-root">
    <div className="mlist-header">
      <button className="mlist-back" onClick={onBack} aria-label="Back"><ChevronLeft size={16} /></button>
      <span className="mlist-title">All months</span>
      <button className="mlist-back" onClick={onClose} aria-label="Close"><X size={16} /></button>
    </div>
    <div className="mlist-body">
      {months.map(m => (
        <button key={m.monthId} className="mlist-row" onClick={() => onSelectMonth(m.monthId)}>
          <div className="mlist-icon" style={{ color: m.topHabitColor, background: `color-mix(in srgb, ${m.topHabitColor} 18%, transparent)` }}>
            {HABIT_ICONS[m.topHabitIcon] || HABIT_ICONS['rocket']}
          </div>
          <div className="mlist-text">
            <strong>{m.label}{m.isCurrent ? ' · This month' : ''}</strong>
            <span>{m.previewLine}</span>
          </div>
          <ChevronRight size={14} className="mlist-chevron" />
        </button>
      ))}
    </div>
  </div>
);

export default MonthListView;
