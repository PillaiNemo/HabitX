import React, { useEffect, useRef } from 'react';
import './FeaturesDeck.css';

interface DeckFeature {
  id: string;
  accent: string;
  glow: string;
  tint: string;
  panelBorder: string;
  icon: string;
  title: string;
  desc: string;
  body: () => string;
  animate: (card: HTMLElement) => void;
}

const FEATURES: DeckFeature[] = [
  {
    id: 'streak', accent: '#34e39a', glow: 'rgba(52,227,154,.4)', tint: 'rgba(52,227,154,.12)', panelBorder: '#1b2b24',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg>',
    title: 'Streak chains',
    desc: 'Every day you show up links onto the last. Miss one and you feel it — that is exactly the point.',
    body: function () {
      let links = '';
      for (let i = 0; i < 14; i++) { links += '<div class="deck-link" data-i="' + i + '"></div>'; }
      return '<div class="deck-panel" style="border-color:#1b2b24">' +
        '<div class="deck-panel-label">Current streak</div>' +
        '<div class="deck-streak-num"><strong class="deck-streak-count">0</strong><span>days running</span></div>' +
        '<div class="deck-chain">' + links + '</div>' +
        '</div>';
    },
    animate: function (card) {
      const nums = card.querySelector('.deck-streak-count');
      const links = card.querySelectorAll('.deck-link');
      let n = 0;
      links.forEach((l, i) => {
        if (i < 12) {
          setTimeout(() => { l.classList.add('active'); n++; if (nums) nums.textContent = String(n); }, 950 + i * 80);
        }
      });
    },
  },
  {
    id: 'heat', accent: '#4fb8ff', glow: 'rgba(79,184,255,.4)', tint: 'rgba(79,184,255,.12)', panelBorder: '#132433',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    title: 'Visual heatmaps',
    desc: 'A contribution grid per habit — months of consistency, visible at a glance.',
    body: function () {
      const levels = [0, 2, 1, 3, 0, 2, 3, 1, 0, 2, 1, 3, 0, 2, 3, 1, 0, 3, 2, 1, 0, 2, 3, 1, 0, 3, 2, 0, 1, 2, 2, 0, 3, 1, 2, 0, 3, 1, 0, 2];
      let cells = '';
      levels.forEach(lv => { cells += '<i class="' + (lv > 0 ? 'on' + lv : '') + '"></i>'; });
      return '<div class="deck-panel" style="border-color:#132433"><div class="deck-panel-label">Consistency, last 12 weeks</div><div class="deck-heatgrid">' + cells + '</div></div>';
    },
    animate: function (card) {
      const cells = card.querySelectorAll('.deck-heatgrid i');
      cells.forEach((c, idx) => {
        if (c.className.includes('on')) {
          setTimeout(() => { c.classList.add('wave'); }, 950 + (idx % 10) * 60);
        }
      });
    },
  },
  {
    id: 'check', accent: '#ff5d8f', glow: 'rgba(255,93,143,.4)', tint: 'rgba(255,93,143,.12)', panelBorder: '#2b1526',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
    title: 'One-tap check-ins',
    desc: 'Logging a habit takes one tap. No forms, no friction — the app gets out of your way.',
    body: function () {
      const items = ['Workout', 'Read', 'Meditate', 'Code'];
      let rows = '';
      items.forEach(label => {
        rows += '<div class="deck-checkrow" data-label="' + label + '"><div class="deck-box"><svg viewBox="0 0 12 12"><polyline points="1,6 4.5,9.5 11,2"/></svg></div><span>' + label + '</span></div>';
      });
      return '<div class="deck-panel" style="border-color:#2b1526"><div class="deck-panel-label">Today\'s check-ins</div><div class="deck-checklist">' + rows + '</div></div>';
    },
    animate: function (card) {
      const rows = card.querySelectorAll<HTMLElement>('.deck-checkrow');
      const doneSet = ['Workout', 'Read', 'Meditate'];
      rows.forEach((r, i) => {
        if (doneSet.includes(r.dataset.label || '')) {
          setTimeout(() => { r.classList.add('done', 'animate'); }, 950 + i * 160);
        }
      });
    },
  },
  {
    id: 'goal', accent: '#ffb347', glow: 'rgba(255,179,71,.4)', tint: 'rgba(255,179,71,.12)', panelBorder: '#2b2312',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>',
    title: 'Goals & milestones',
    desc: 'Set a target once — progress tracks itself automatically as you check in.',
    body: function () {
      return '<div class="deck-panel" style="border-color:#2b2312"><div class="deck-panel-label">Milestone</div>' +
        '<div class="deck-goal-row"><strong>Run 100km</strong><span class="deck-goal-pct">0%</span></div>' +
        '<div class="deck-goal-track"><div class="deck-goal-fill"></div></div></div>';
    },
    animate: function (card) {
      const fill = card.querySelector<HTMLElement>('.deck-goal-fill');
      const pct = card.querySelector<HTMLElement>('.deck-goal-pct');
      setTimeout(() => {
        if (!fill || !pct) return;
        fill.style.width = '62%';
        let p = 0;
        const iv = setInterval(() => {
          p++; pct.textContent = p + '%';
          if (p >= 62) clearInterval(iv);
        }, 1100 / 62);
      }, 950);
    },
  },
];

export const FeaturesDeck: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const prevBtnRef = useRef<HTMLDivElement>(null);
  const nextBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const dotsWrap = dotsRef.current;
    const prevBtn = prevBtnRef.current;
    const nextBtn = nextBtnRef.current;
    if (!root || !stage || !dotsWrap || !prevBtn || !nextBtn) return;

    // Reset in case of StrictMode double-invoke in dev.
    stage.innerHTML = '';
    dotsWrap.innerHTML = '';

    let order = [0, 1, 2, 3];
    let autoTimer: ReturnType<typeof setInterval> | null = null;
    let dragging = false;
    let dragStartX = 0;
    let dragDX = 0;

    const moveHandlers: Array<() => void> = [];

    FEATURES.forEach((f, i) => {
      const card = document.createElement('div');
      card.className = 'deck-card';
      card.dataset.idx = String(i);
      card.style.setProperty('--accent', f.accent);
      card.style.setProperty('--accent-glow', f.glow);
      card.style.setProperty('--tint', f.tint);
      card.style.setProperty('--panel-border-2', f.panelBorder);
      card.style.setProperty('--dot-accent', f.accent);
      card.innerHTML =
        '<div class="deck-glow-follow"></div>' +
        '<div class="deck-card-icon">' + f.icon + '</div>' +
        '<h3>' + f.title + '</h3>' +
        '<p class="deck-desc">' + f.desc + '</p>' +
        f.body();
      stage.appendChild(card);

      const onMove = (e: MouseEvent) => {
        const r = card.getBoundingClientRect();
        const mx = ((e.clientX - r.left) / r.width) * 100;
        const my = ((e.clientY - r.top) / r.height) * 100;
        card.style.setProperty('--mx', mx + '%');
        card.style.setProperty('--my', my + '%');
        if (card.classList.contains('pos-0')) {
          const rx = ((my - 50) / 50) * -6;
          const ry = ((mx - 50) / 50) * 6;
          card.style.transform = 'translate(0,0) scale(1) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
        }
      };
      const onLeave = () => {
        if (card.classList.contains('pos-0')) {
          card.style.transform = '';
        }
      };
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
      moveHandlers.push(() => {
        card.removeEventListener('mousemove', onMove);
        card.removeEventListener('mouseleave', onLeave);
      });
    });

    const dots: HTMLButtonElement[] = [];
    FEATURES.forEach((_f, i) => {
      const b = document.createElement('button');
      b.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(b);
      dots.push(b);
    });

    function render(triggerAnim: boolean) {
      const cards = stage!.querySelectorAll<HTMLElement>('.deck-card');
      cards.forEach(c => { c.classList.remove('pos-0', 'pos-1', 'pos-2', 'pos-3', 'sweep'); c.style.transform = ''; });
      order.forEach((featureIdx, pos) => {
        const card = stage!.querySelector<HTMLElement>('.deck-card[data-idx="' + featureIdx + '"]');
        card?.classList.add('pos-' + pos);
      });
      dots.forEach((d, i) => d.classList.toggle('active', i === order[0]));

      if (triggerAnim) {
        const frontCard = stage!.querySelector<HTMLElement>('.deck-card[data-idx="' + order[0] + '"]');
        if (frontCard) {
          void frontCard.offsetWidth;
          frontCard.classList.add('sweep');
          FEATURES[order[0]].animate(frontCard);
        }
      }
    }

    function next() {
      order.push(order.shift()!);
      render(true);
      restartAuto();
    }
    function prev() {
      order.unshift(order.pop()!);
      render(true);
      restartAuto();
    }
    function goTo(featureIdx: number) {
      const pos = order.indexOf(featureIdx);
      if (pos === 0) return;
      for (let i = 0; i < pos; i++) { order.push(order.shift()!); }
      render(true);
      restartAuto();
    }

    function restartAuto() {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = setInterval(next, 4200);
    }

    prevBtn!.addEventListener('click', prev);
    nextBtn!.addEventListener('click', next);

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      const card = target.closest('.deck-card') as HTMLElement | null;
      if (!card || !card.classList.contains('pos-0')) return;
      dragging = true; dragStartX = e.clientX; dragDX = 0;
      card.setPointerCapture(e.pointerId);
      if (autoTimer) clearInterval(autoTimer);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const card = stage!.querySelector<HTMLElement>('.pos-0');
      if (!card) return;
      dragDX = e.clientX - dragStartX;
      card.style.transform = 'translate(' + dragDX + 'px,0) rotate(' + (dragDX * 0.04) + 'deg)';
    };
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      const card = stage!.querySelector<HTMLElement>('.pos-0');
      if (card) {
        if (Math.abs(dragDX) > 70) {
          card.style.transition = 'transform .3s ease';
          if (dragDX < 0) next(); else prev();
        } else {
          card.style.transform = '';
        }
      }
      restartAuto();
    };
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointerleave', endDrag);

    let io: IntersectionObserver | null = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          render(true);
          restartAuto();
          io?.disconnect();
        }
      });
    }, { threshold: 0.3 });
    io.observe(root);

    return () => {
      if (autoTimer) clearInterval(autoTimer);
      io?.disconnect();
      io = null;
      moveHandlers.forEach(off => off());
      prevBtn!.removeEventListener('click', prev);
      nextBtn!.removeEventListener('click', next);
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerup', endDrag);
      stage.removeEventListener('pointerleave', endDrag);
    };
  }, []);

  return (
    <div className="deck-wrap" ref={rootRef}>
      <div className="deck-head">
        <div className="deck-eyebrow"><span className="dot"></span> Features</div>
        <h2>One feature at a time,<br />fully in focus</h2>
        <p>Swipe, click, or wait — each one gets its moment before the next steps up.</p>
      </div>

      <div className="deck-stage" ref={stageRef}></div>

      <div className="deck-controls">
        <div className="deck-arrow" ref={prevBtnRef} aria-label="Previous">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </div>
        <div className="deck-dots" ref={dotsRef}></div>
        <div className="deck-arrow" ref={nextBtnRef} aria-label="Next">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </div>
      </div>
    </div>
  );
};

export default FeaturesDeck;
