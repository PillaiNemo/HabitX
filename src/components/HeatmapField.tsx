import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

export interface HeatmapFieldHandle {
  /** 0 = fully empty, 1 = fully filled in. Cheap — just updates a ref read by the internal rAF loop. */
  setProgress: (p: number) => void;
}

interface HeatmapFieldProps {
  cols?: number;
  rows?: number;
}

// Same palette as the in-app heatmap widget, so the hero already speaks the
// product's real visual language instead of an invented one.
const LEVELS = ['rgba(6,78,59,.5)', 'rgba(6,95,70,.65)', 'rgba(5,150,105,.8)', '#00FF9C'];

function weightedLevel() {
  const r = Math.random();
  if (r < 0.1) return -1; // stays empty even at full fill — the odd missed day reads as authentic, not broken
  if (r < 0.4) return 0;
  if (r < 0.7) return 1;
  if (r < 0.9) return 2;
  return 3;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export const HeatmapField = forwardRef<HeatmapFieldHandle, HeatmapFieldProps>(({ cols = 52, rows = 7 }, ref) => {
  const fillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progressRef = useRef(0);
  const lastWrittenRef = useRef(-1);

  const cells = useMemo(() => Array.from({ length: cols * rows }, () => ({
    level: weightedLevel(),
    delay: Math.random() * 0.85,
    shimmerDelay: Math.random() * 4,
  })), [cols, rows]);

  useImperativeHandle(ref, () => ({
    setProgress(p: number) {
      progressRef.current = Math.min(Math.max(p, 0), 1);
    },
  }), []);

  // Continuous rAF loop, same pattern as SolveCube — always running so setProgress()
  // is reflected on the very next frame, diffed so idle frames do near-zero work.
  useEffect(() => {
    let raf = 0;
    function frame() {
      const p = progressRef.current;
      if (Math.abs(p - lastWrittenRef.current) > 0.0008) {
        lastWrittenRef.current = p;
        cells.forEach((cell, i) => {
          if (cell.level === -1) return; // stays empty regardless of progress
          const local = Math.min(Math.max((p - cell.delay) / (1 - cell.delay), 0), 1);
          const eased = easeOutCubic(local);
          const el = fillRefs.current[i];
          if (el) el.style.opacity = String(eased);
        });
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [cells]);

  return (
    <div className="hm-field" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
      {cells.map((cell, i) => (
        <div key={i} className="hm-field-cell">
          <div className="hm-field-base" style={{ animationDelay: `${cell.shimmerDelay}s` }} />
          {cell.level >= 0 && (
            <div
              ref={el => { fillRefs.current[i] = el; }}
              className="hm-field-fill"
              style={{ background: LEVELS[cell.level], opacity: 0 }}
            />
          )}
        </div>
      ))}
    </div>
  );
});
HeatmapField.displayName = 'HeatmapField';
