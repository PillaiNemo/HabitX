import React, { useRef, useState } from 'react';
import { ChevronLeft, X, TrendingUp, AlertTriangle, Trophy, Clock, Flame } from 'lucide-react';
import { InsightItem, InsightTone, monthLabel } from '../lib/wrappedMonth';
import './MonthInsights.css';

const VIEWED_PREFIX = 'habitx-wrapped-insights-viewed-';

interface MonthInsightsProps {
  monthId: string;
  insights: InsightItem[];
  onInsightTap: (habitId?: string) => void;
  onSeeFullReport: () => void;
  onBack: () => void;
  onClose: () => void;
  onReplayStory?: () => void;
}

function toneIcon(tone: InsightTone) {
  switch (tone) {
    case 'positive': return <TrendingUp size={16} />;
    case 'attention': return <AlertTriangle size={16} />;
    case 'milestone': return <Trophy size={16} />;
    case 'timing': return <Clock size={16} />;
    case 'streak': return <Flame size={16} />;
  }
}

export const MonthInsights: React.FC<MonthInsightsProps> = ({ monthId, insights, onInsightTap, onSeeFullReport, onBack, onClose, onReplayStory }) => {
  // Opening Insights for a month at all counts as "viewed" — the swipe-card
  // treatment is a first-open-this-month affordance, not something tied to
  // finishing the swipe.
  const [firstOpen] = useState(() => {
    try {
      const key = `${VIEWED_PREFIX}${monthId}`;
      const seen = localStorage.getItem(key) === '1';
      if (!seen) localStorage.setItem(key, '1');
      return !seen;
    } catch {
      return true;
    }
  });
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || !el.clientWidth) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIdx(Math.min(insights.length - 1, Math.max(0, idx)));
  };

  return (
    <div className="minsights-root">
      <div className="minsights-header">
        <button className="minsights-back" onClick={onBack} aria-label="Back"><ChevronLeft size={16} /></button>
        <span className="minsights-title">{monthLabel(monthId)}</span>
        <button className="minsights-back" onClick={onClose} aria-label="Close"><X size={16} /></button>
      </div>

      {insights.length === 0 ? (
        <div className="minsights-empty">Not enough activity this month for a recap yet.</div>
      ) : firstOpen ? (
        <>
          <div className="minsights-dots">
            {insights.map((_, i) => <span key={i} className={`minsights-dot ${i === activeIdx ? 'active' : ''}`} />)}
          </div>
          <div className="minsights-scroller" ref={scrollerRef} onScroll={handleScroll}>
            {insights.map(item => (
              <div key={item.id} className={`minsights-card minsights-tone-${item.tone}`} onClick={() => onInsightTap(item.habitId)}>
                <div className="minsights-icon">{toneIcon(item.tone)}</div>
                <h3>{item.conclusion}</h3>
                <p>{item.support}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="minsights-list">
          {insights.map(item => (
            <button key={item.id} className={`minsights-row minsights-tone-${item.tone}`} onClick={() => onInsightTap(item.habitId)}>
              <div className="minsights-icon">{toneIcon(item.tone)}</div>
              <div className="minsights-row-text">
                <strong>{item.conclusion}</strong>
                <span>{item.support}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="minsights-footer">
        {onReplayStory && <button className="minsights-ghost" onClick={onReplayStory}>Replay recap</button>}
        <button className="minsights-primary" onClick={onSeeFullReport}>See full report →</button>
      </div>
    </div>
  );
};

export default MonthInsights;
