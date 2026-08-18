import { WrappedStats } from './wrapped';

// Renders the Wrapped share card to an off-screen canvas — no PDF, no
// external screenshot library. Save/share both go through canvas -> PNG.

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  let val = text;
  while (ctx.measureText(val).width > maxWidth && val.length > 3) val = val.slice(0, -2) + '…';
  return val;
}

export function drawShareCard(stats: WrappedStats, monthLabel: string, topHabitName: string): HTMLCanvasElement {
  const W = 600;
  const H = 720;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#11141d');
  grad.addColorStop(1, '#04040a');
  roundRectPath(ctx, 0, 0, W, H, 28);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,255,156,.4)';
  ctx.lineWidth = 2;
  roundRectPath(ctx, 1, 1, W - 2, H - 2, 27);
  ctx.stroke();

  // logo mark
  roundRectPath(ctx, 44, 48, 40, 40, 11);
  ctx.fillStyle = '#00FF9C';
  ctx.fill();
  ctx.fillStyle = '#04040a';
  [[54, 58], [70, 58], [54, 74], [70, 74]].forEach(([x, y]) => {
    roundRectPath(ctx, x, y, 12, 12, 3);
    ctx.fill();
  });

  ctx.fillStyle = '#f4f4f6';
  ctx.font = '800 24px Inter, sans-serif';
  ctx.fillText('HabitX', 98, 68);
  ctx.fillStyle = 'rgba(244,244,246,.5)';
  ctx.font = '700 12px "JetBrains Mono", monospace';
  ctx.fillText(`${monthLabel.toUpperCase()} WRAPPED`, 98, 86);

  const tiles = [
    { label: 'TOP HABIT', value: topHabitName || '—' },
    { label: 'CHECK-INS', value: String(stats.totalCheckins) },
    { label: 'BEST DAY', value: stats.bestDay?.date ?? '—' },
    { label: 'AVG COMPLETE', value: `${stats.avgComplete}%` },
  ];
  const tileW = 246;
  const tileH = 150;
  const gap = 20;
  const startX = 44;
  const startY = 160;
  tiles.forEach((t, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = startX + col * (tileW + gap);
    const y = startY + row * (tileH + gap);
    roundRectPath(ctx, x, y, tileW, tileH, 16);
    ctx.fillStyle = 'rgba(255,255,255,.04)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = 1;
    roundRectPath(ctx, x, y, tileW, tileH, 16);
    ctx.stroke();

    ctx.fillStyle = 'rgba(244,244,246,.45)';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillText(t.label, x + 20, y + 36);

    ctx.fillStyle = '#f4f4f6';
    ctx.font = '800 30px Inter, sans-serif';
    ctx.fillText(fitText(ctx, t.value, tileW - 40), x + 20, y + 96);
  });

  ctx.fillStyle = 'rgba(244,244,246,.32)';
  ctx.font = '600 12px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('habitx.app', W / 2, H - 36);
  ctx.textAlign = 'left';

  return canvas;
}

export function saveShareCardAsPng(stats: WrappedStats, monthLabel: string, topHabitName: string, filename: string) {
  const canvas = drawShareCard(stats, monthLabel, topHabitName);
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function shareCardNative(stats: WrappedStats, monthLabel: string, topHabitName: string, filename: string): Promise<boolean> {
  const canvas = drawShareCard(stats, monthLabel, topHabitName);
  const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return false;
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (data: any) => boolean };
  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    await nav.share({ files: [file], title: `HabitX · ${monthLabel} Wrapped` });
    return true;
  }
  return false;
}
