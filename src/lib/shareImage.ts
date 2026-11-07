import type { FeatureCollection, Geometry, Position } from 'geojson';
import type { Base } from './types';
import { GROUP_COLOR, KIND_GROUP } from './taxonomy';

interface ShareOpts {
  bases: Base[];
  countries: FeatureCollection;
  from: { lat: number; lon: number; label: string };
  target: Base;
  km: string;
  headline: string;
  subline: string;
  footer: string;
}

/** orthographic projection centred on (lat0, lon0); returns null for the far side */
function ortho(lat0: number, lon0: number, r: number, cx: number, cy: number) {
  const φ0 = (lat0 * Math.PI) / 180;
  const λ0 = (lon0 * Math.PI) / 180;
  return (lon: number, lat: number): [number, number] | null => {
    const φ = (lat * Math.PI) / 180;
    const λ = (lon * Math.PI) / 180;
    const cosc = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * Math.cos(φ) * Math.cos(λ - λ0);
    if (cosc < 0) return null;
    const x = r * Math.cos(φ) * Math.sin(λ - λ0);
    const y = r * (Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * Math.cos(φ) * Math.cos(λ - λ0));
    return [cx + x, cy - y];
  };
}

function drawGeometry(ctx: CanvasRenderingContext2D, g: Geometry, proj: (lon: number, lat: number) => [number, number] | null) {
  const ring = (coords: Position[]) => {
    let pen = false;
    for (const [lon, lat] of coords) {
      const p = proj(lon, lat);
      if (!p) { pen = false; continue; }
      if (pen) ctx.lineTo(p[0], p[1]); else { ctx.moveTo(p[0], p[1]); pen = true; }
    }
  };
  if (g.type === 'Polygon') g.coordinates.forEach(ring);
  else if (g.type === 'MultiPolygon') g.coordinates.forEach((poly) => poly.forEach(ring));
}

/** 1080×1920 story image (Instagram / TikTok / WhatsApp status) */
export async function renderShareImage(o: ShareOpts): Promise<Blob> {
  const W = 1080, H = 1920;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const font = (w: number, s: number) => `${w} ${s}px 'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b1120'); bg.addColorStop(1, '#05070c');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // globe
  const R = 470, cx = W / 2, cy = 1060;
  const glow = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.25);
  glow.addColorStop(0, 'rgba(57,135,229,0.25)'); glow.addColorStop(1, 'rgba(57,135,229,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0d1628'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

  const midLat = (o.from.lat + o.target.lat) / 2;
  const midLon = (o.from.lon + o.target.lon) / 2;
  const proj = ortho(Math.max(-60, Math.min(60, midLat - 8)), midLon, R, cx, cy);
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#1d2840'; ctx.strokeStyle = '#33415f'; ctx.lineWidth = 1.2;
  for (const f of o.countries.features) { ctx.beginPath(); drawGeometry(ctx, f.geometry, proj); ctx.fill(); ctx.stroke(); }
  for (const b of o.bases) {
    const p = proj(b.lon, b.lat);
    if (!p) continue;
    const g = KIND_GROUP[b.kind];
    ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, Math.PI * 2);
    if (g === 'hotspot') { ctx.strokeStyle = GROUP_COLOR.hotspot; ctx.lineWidth = 2; ctx.stroke(); }
    else { ctx.fillStyle = GROUP_COLOR[g]; ctx.fill(); }
  }
  // connection
  const a = proj(o.from.lon, o.from.lat), b = proj(o.target.lon, o.target.lat);
  if (a && b) {
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.setLineDash([14, 10]);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(a[0], a[1], 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff5a3c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(b[0], b[1], 18, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();

  // text
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ff5a3c'; ctx.font = font(800, 34);
  ctx.fillText('VISUALBASES', 80, 150);
  ctx.fillStyle = '#b4bccd'; ctx.font = font(500, 40);
  wrap(ctx, o.headline, 80, 230, W - 160, 52);
  ctx.fillStyle = '#ffffff'; ctx.font = font(800, 210);
  ctx.fillText(o.km, 70, 470);
  ctx.font = font(700, 54);
  const y = wrap(ctx, o.target.name, 80, 560, W - 160, 64);
  ctx.fillStyle = '#b4bccd'; ctx.font = font(500, 38);
  wrap(ctx, o.subline, 80, y + 10, W - 160, 50);

  ctx.fillStyle = '#ffffff'; ctx.font = font(700, 40);
  ctx.textAlign = 'center';
  ctx.fillText(o.footer, W / 2, H - 150);
  ctx.fillStyle = '#8790a6'; ctx.font = font(500, 30);
  ctx.fillText('Open Data · github.com/Acephali92/VisualBases', W / 2, H - 95);

  return new Promise((res, rej) => c.toBlob((bl) => (bl ? res(bl) : rej(new Error('toBlob failed'))), 'image/png'));
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): number {
  const words = text.split(/\s+/);
  let line = '';
  let lines = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      y += lh; line = w;
      if (++lines >= 3) { line += ' …'; break; }
    } else line = test;
  }
  if (line) { ctx.fillText(line, x, y); y += lh; }
  return y;
}
