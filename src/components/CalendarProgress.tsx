import React, { useEffect, useMemo, useRef, useState } from 'react';
import './CalendarProgress.css';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const COLS = 7;
const ROWS = 5;
const CELL = 46;
const GAP = 10;
const GLOW_RADIUS = 100;

// 0=empty..3=brightest. Row 0 = this week (top), later rows = further back —
// matches the reference: activity trending up toward "today."
const LEVELS: number[][] = [
  [2, 3, 1, 3, 3, 2, 3],
  [1, 2, 2, 1, 3, 2, 2],
  [0, 1, 2, 1, 2, 3, 2],
  [1, 0, 1, 2, 1, 2, 1],
  [0, 1, 0, 1, 1, 0, 2],
];

// The connecting "streak" line traced through a hand-picked ascending run of
// cells, ending on Today.
const PATH: [number, number][] = [[4, 1], [3, 2], [3, 4], [2, 5], [1, 4], [1, 6], [0, 6]];
const TODAY: [number, number] = [0, 6];

function centerOf([row, col]: [number, number]) {
  return { x: col * (CELL + GAP) + CELL / 2, y: row * (CELL + GAP) + CELL / 2 };
}

export const CalendarProgress: React.FC = () => {
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef(0);

  const cells = useMemo(() => {
    const list: { row: number; col: number; level: number; isToday: boolean }[] = [];
    LEVELS.forEach((rowLevels, row) => {
      rowLevels.forEach((level, col) => list.push({ row, col, level, isToday: row === TODAY[0] && col === TODAY[1] }));
    });
    return list;
  }, []);

  const pathPoints = useMemo(() => PATH.map(centerOf), []);
  const pathD = pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const todayCenter = useMemo(() => centerOf(TODAY), []);
  const gridWidth = COLS * CELL + (COLS - 1) * GAP;
  const gridHeight = ROWS * CELL + (ROWS - 1) * GAP;

  // A cursor-proximity glow — cells brighten as the pointer nears them,
  // fading back out with distance. Driven imperatively (no React state) so
  // it stays smooth under fast mouse movement.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const handleMove = (e: MouseEvent) => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const rect = grid.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        cellRefs.current.forEach(el => {
          if (!el) return;
          const cx = parseFloat(el.dataset.cx || '0');
          const cy = parseFloat(el.dataset.cy || '0');
          const dist = Math.hypot(mx - cx, my - cy);
          const glow = Math.max(0, 1 - dist / GLOW_RADIUS);
          el.style.setProperty('--glow', glow.toFixed(2));
        });
      });
    };
    const handleLeave = () => cellRefs.current.forEach(el => el?.style.setProperty('--glow', '0'));

    grid.addEventListener('mousemove', handleMove);
    grid.addEventListener('mouseleave', handleLeave);
    return () => {
      grid.removeEventListener('mousemove', handleMove);
      grid.removeEventListener('mouseleave', handleLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Only runs the flip loop while the grid is actually on screen — without
  // this it starts looping the moment the page mounts, in a section
  // that's below the fold on load, burning cycles on an animation nobody
  // can see (and re-plays the streak reveal from the start each time you
  // scroll back to it, which reads better than resuming mid-cycle anyway).
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Auto-plays the flip along the streak PATH itself, in order, ending on
  // Today — the same run the connecting line already draws — rather than
  // waiting on a hover that a static screenshot or touch device never gets.
  useEffect(() => {
    if (!visible) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const pathIndices = PATH.map(([r, c]) => r * COLS + c);
    const FLIP_MS = 900;
    const STEP_MS = 260;
    const LOOP_PAUSE_MS = 1500;
    let flipTimer: ReturnType<typeof setTimeout>;
    let stepTimer: ReturnType<typeof setTimeout>;
    let i = 0;

    const flipNext = () => {
      const el = cellRefs.current[pathIndices[i]];
      el?.classList.add('is-flipped');
      flipTimer = setTimeout(() => el?.classList.remove('is-flipped'), FLIP_MS);
      i++;
      stepTimer = setTimeout(flipNext, i < pathIndices.length ? STEP_MS : LOOP_PAUSE_MS);
      if (i >= pathIndices.length) i = 0;
    };
    stepTimer = setTimeout(flipNext, 700);

    // if visibility drops mid-flip, the pending timeout that would've
    // un-flipped the current cell gets cancelled below without running —
    // clear the class directly so nothing is left stuck flipped when the
    // loop restarts from the top next time this scrolls into view.
    return () => {
      clearTimeout(flipTimer);
      clearTimeout(stepTimer);
      pathIndices.forEach(idx => cellRefs.current[idx]?.classList.remove('is-flipped'));
    };
  }, [visible]);

  return (
    <div className="calprog-root">
      <div className="calprog-days" style={{ width: gridWidth }}>
        {DAYS.map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="calprog-grid" ref={gridRef} style={{ width: gridWidth, height: gridHeight }}>
        {cells.map((c, i) => (
          <div
            key={i}
            ref={el => { cellRefs.current[i] = el; }}
            data-cx={centerOf([c.row, c.col]).x}
            data-cy={centerOf([c.row, c.col]).y}
            className={`calprog-cell lvl${c.level} ${c.isToday ? 'today' : ''}`}
            style={{ left: c.col * (CELL + GAP), top: c.row * (CELL + GAP), width: CELL, height: CELL }}
          >
            <div className="calprog-cell-inner">
              <div className="calprog-cell-front" />
              <div className="calprog-cell-back" />
            </div>
          </div>
        ))}

        <svg className="calprog-path" width={gridWidth} height={gridHeight}>
          <defs>
            <linearGradient id="calprog-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(0,255,156,.15)" />
              <stop offset="100%" stopColor="#00FF9C" />
            </linearGradient>
          </defs>
          <path d={pathD} fill="none" stroke="url(#calprog-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {pathPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={i === pathPoints.length - 1 ? 0 : 2.5} fill="rgba(0,255,156,.8)" />
          ))}
        </svg>

        <div className="calprog-today-label" style={{ left: gridWidth + 12, top: todayCenter.y - 9 }}>
          <span className="calprog-today-arrow">→</span> Today
        </div>
      </div>
    </div>
  );
};

export default CalendarProgress;
