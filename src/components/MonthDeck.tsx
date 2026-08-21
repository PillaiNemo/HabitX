import React, { useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { HABIT_ICONS } from '../constants';
import './MonthDeck.css';

export interface MonthCardData {
  monthId: string;
  label: string;
  topHabitColor: string;
  topHabitIcon: string;
  isCurrent: boolean;
  previewLine: string;
}

interface MonthDeckProps {
  months: MonthCardData[]; // most recent first, most recent 3-4 only
  onOpenMonth: (monthId: string) => void;
  onViewAll?: () => void;
  onClose: () => void;
}

// Uses a pos-0..3 layered-position/drag-swipe pattern (fanned stack of cards),
// with two additions: a 180deg flip-to-open on tap (front card only) instead
// of a plain click, and month-specific theming per card.
export const MonthDeck: React.FC<MonthDeckProps> = ({ months, onOpenMonth, onViewAll, onClose }) => {
  const [order, setOrder] = useState<number[]>(() => months.map((_, i) => i));
  const [flipped, setFlipped] = useState(false);
  const [dragX, setDragX] = useState(0);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);

  const next = () => { setOrder(o => [...o.slice(1), o[0]]); setFlipped(false); };
  const prev = () => { setOrder(o => [o[o.length - 1], ...o.slice(0, -1)]); setFlipped(false); };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, pos: number) => {
    if (pos !== 0 || flipped) return;
    draggingRef.current = true;
    startXRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setDragX(e.clientX - startXRef.current);
  };
  const endDragAndMaybeTap = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const dx = dragX;
    setDragX(0);
    if (Math.abs(dx) > 70) {
      if (dx < 0) next(); else prev();
    } else if (Math.abs(dx) <= 8) {
      setFlipped(f => !f);
    }
  };

  if (months.length === 0) {
    return (
      <div className="mdeck-root">
        <button className="mdeck-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        <div className="mdeck-empty">No months tracked yet — check back once you've logged a few days.</div>
      </div>
    );
  }

  return (
    <div className="mdeck-root">
      <button className="mdeck-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
      <div className="mdeck-head">
        <span className="mdeck-eyebrow">Your recaps</span>
        <h2>Browse your months</h2>
      </div>

      <div className="mdeck-stage">
        {order.map((monthIdx, pos) => {
          if (pos > 3) return null;
          const m = months[monthIdx];
          const isFront = pos === 0;
          const style: React.CSSProperties & { ['--accent']?: string } = { '--accent': m.topHabitColor };
          if (isFront && dragX !== 0) {
            style.transform = `translate(${dragX}px,0) rotate(${(dragX * 0.04).toFixed(2)}deg)`;
          }
          return (
            <div
              key={m.monthId}
              className={`mdeck-card pos-${pos} ${isFront && flipped ? 'flipped' : ''}`}
              style={style}
              onPointerDown={isFront ? (e) => onPointerDown(e, pos) : undefined}
              onPointerMove={isFront ? onPointerMove : undefined}
              onPointerUp={isFront ? endDragAndMaybeTap : undefined}
              onPointerLeave={isFront ? endDragAndMaybeTap : undefined}
            >
              <div className="mdeck-face mdeck-face-front">
                <div className="mdeck-card-icon">{HABIT_ICONS[m.topHabitIcon] || HABIT_ICONS['rocket']}</div>
                <h3>{m.label}</h3>
                {m.isCurrent && <span className="mdeck-badge">This month</span>}
                <span className="mdeck-tap-hint">Tap to open</span>
              </div>
              <div className="mdeck-face mdeck-face-back">
                <span className="mdeck-back-label">{m.label}</span>
                <p className="mdeck-back-preview">{m.previewLine}</p>
                <button className="mdeck-back-cta" onClick={(e) => { e.stopPropagation(); onOpenMonth(m.monthId); }}>
                  See full insights →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mdeck-controls">
        <button className="mdeck-arrow" onClick={prev} aria-label="Previous"><ChevronLeft size={16} /></button>
        <button className="mdeck-arrow" onClick={next} aria-label="Next"><ChevronRight size={16} /></button>
      </div>

      {onViewAll && <button className="mdeck-viewall" onClick={onViewAll}>View all months →</button>}
    </div>
  );
};

export default MonthDeck;
