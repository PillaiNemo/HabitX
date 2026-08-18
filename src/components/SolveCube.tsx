import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

export interface SolveCubeHandle {
  /** 0 = fully scrambled, 1 = fully solved (in terms of overall scroll journey). Cheap — just updates a ref read by the internal rAF loop. */
  setProgress: (p: number) => void;
}

type FaceName = 'front' | 'back' | 'right' | 'left' | 'top' | 'bottom';

interface SolveCubeProps {
  size?: number;
  /** Real UI content to crossfade in once a given face finishes solving. */
  faceContent?: Partial<Record<FaceName, React.ReactNode>>;
}

const PALETTE = ['#00FF9C', '#00D1FF', '#B026FF', '#FF0055', '#FFB800', '#E2E8F0'];

// Each face "claims" itself (finishes solving) at a different point in the overall
// scroll journey, instead of all faces converging at the very end — this is what
// lets a real UI piece crossfade in on each face as you scroll past its moment.
const FACES: { name: FaceName; home: string; transform: (s: number) => string; completeAt: number }[] = [
  { name: 'front',  home: PALETTE[0], transform: (s) => `translateZ(${s / 2}px)`,                completeAt: 0.4 },
  { name: 'right',  home: PALETTE[2], transform: (s) => `rotateY(90deg) translateZ(${s / 2}px)`,  completeAt: 0.6 },
  { name: 'top',    home: PALETTE[4], transform: (s) => `rotateX(90deg) translateZ(${s / 2}px)`,  completeAt: 0.8 },
  { name: 'back',   home: PALETTE[1], transform: (s) => `rotateY(180deg) translateZ(${s / 2}px)`, completeAt: 0.9 },
  { name: 'left',   home: PALETTE[3], transform: (s) => `rotateY(-90deg) translateZ(${s / 2}px)`, completeAt: 1.0 },
  { name: 'bottom', home: PALETTE[5], transform: (s) => `rotateX(-90deg) translateZ(${s / 2}px)`, completeAt: 1.0 },
];
const FACE_WINDOW = 0.3; // how much of the scroll journey each face spends resolving

function randColor(exclude: string) {
  const pool = PALETTE.filter(c => c !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export const SolveCube = forwardRef<SolveCubeHandle, SolveCubeProps>(({ size = 240, faceContent }, ref) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const solvedLayerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const overlayRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const progressRef = useRef(0);
  const lastWrittenRef = useRef(-1);

  // Stable per-tile scrambled color + reveal delay (relative to its face's own window), generated once.
  const tiles = useMemo(() => {
    let i = 0;
    return FACES.map(face =>
      Array.from({ length: 9 }, () => ({
        id: i++,
        scrambled: randColor(face.home),
        delay: Math.random() * 0.7, // 0..0.7 of the face's own window, staggered
      }))
    );
  }, []);

  useImperativeHandle(ref, () => ({
    setProgress(p: number) {
      progressRef.current = Math.min(Math.max(p, 0), 1);
    },
  }), []);

  // Continuous rAF loop — always running, so the cube keeps a subtle idle tumble
  // even at rest, and immediately reflects setProgress() on the next frame.
  useEffect(() => {
    let raf = 0;
    function frame(t: number) {
      const p = progressRef.current;
      const wobbleY = Math.sin(t / 2600) * 6;
      const wobbleX = Math.cos(t / 3100) * 3;
      if (outerRef.current) {
        // Kept modest on purpose: a full sweep looks great with no content on the
        // faces, but once real UI is meant to crossfade in and stay legible, a wide
        // rotation carries the just-completed face out of view right when it matters.
        const rotY = -20 + p * 70 + wobbleY;
        const rotX = 20 + Math.sin(p * Math.PI) * 8 + wobbleX;
        outerRef.current.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      }
      if (Math.abs(p - lastWrittenRef.current) > 0.0005) {
        lastWrittenRef.current = p;
        let flatIdx = 0;
        FACES.forEach((face, fi) => {
          const windowStart = face.completeAt - FACE_WINDOW;
          const faceLocal = Math.min(Math.max((p - windowStart) / FACE_WINDOW, 0), 1);

          for (const tile of tiles[fi]) {
            const local = Math.min(Math.max((faceLocal - tile.delay) / (1 - tile.delay), 0), 1);
            const eased = easeOutCubic(local);
            const el = solvedLayerRefs.current[flatIdx];
            if (el) {
              el.style.opacity = String(eased);
              el.style.transform = `scale(${0.82 + eased * 0.18})`;
            }
            flatIdx++;
          }

          // Overlay crossfades in over the last 20% of the face's own window.
          const overlay = overlayRefs.current[face.name];
          if (overlay) {
            const overlayP = Math.min(Math.max((faceLocal - 0.8) / 0.2, 0), 1);
            overlay.style.opacity = String(overlayP);
          }
        });
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [tiles]);

  let flatIdx = 0;

  return (
    <div className="solve-cube-stage" style={{ width: size, height: size, perspective: size * 4.5 }}>
      <div className="solve-cube-outer" ref={outerRef} style={{ width: size, height: size }}>
        {FACES.map((face, fi) => (
          <div
            key={face.name}
            className="solve-cube-face"
            style={{ width: size, height: size, transform: face.transform(size) }}
          >
            {tiles[fi].map(tile => {
              const idx = flatIdx++;
              return (
                <div key={tile.id} className="solve-cube-tile">
                  <div className="solve-cube-tile-layer" style={{ borderColor: tile.scrambled, boxShadow: `0 0 10px ${tile.scrambled}66, inset 0 0 8px ${tile.scrambled}33` }} />
                  <div
                    ref={el => { solvedLayerRefs.current[idx] = el; }}
                    className="solve-cube-tile-layer solve-cube-tile-solved"
                    style={{ borderColor: face.home, boxShadow: `0 0 14px ${face.home}99, inset 0 0 10px ${face.home}55`, opacity: 0 }}
                  />
                </div>
              );
            })}
            {faceContent?.[face.name] && (
              <div
                ref={el => { overlayRefs.current[face.name] = el; }}
                className="solve-cube-face-overlay"
                style={{ opacity: 0 }}
              >
                {faceContent[face.name]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
SolveCube.displayName = 'SolveCube';
