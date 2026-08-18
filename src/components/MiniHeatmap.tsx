import React, { useMemo } from 'react';
import { DailyLog } from '../types';

interface MiniHeatmapProps {
  /** Descending, logs[0] = most recent day in the window (matches DailyLog[] convention across the app). */
  logs: DailyLog[];
  habitId: string;
  color: string;
}

// A real, data-driven per-habit grid — unlike HeatmapField (randomized,
// decorative, used on the landing page), every cell here reflects an actual
// completion. Reuses the same --heat-0 empty-cell variable as the dashboard's
// AnalysisSidebar heatmap, tinted by the habit's own color for done days.
export const MiniHeatmap: React.FC<MiniHeatmapProps> = ({ logs, habitId, color }) => {
  const cells = useMemo(() => [...logs].reverse().map(l => !!l.completions[habitId]), [logs, habitId]);

  return (
    <div className="grid grid-flow-col gap-[3px]" style={{ gridTemplateRows: 'repeat(7, 1fr)' }}>
      {cells.map((done, i) => (
        <div
          key={i}
          className="w-[7px] h-[7px] rounded-[1px] transition-colors"
          style={{ background: done ? color : 'var(--heat-0)' }}
        />
      ))}
    </div>
  );
};
