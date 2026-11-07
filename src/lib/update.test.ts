import { describe, expect, it } from 'vitest';
import { reloadOnce, handleMapError } from './update';

const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

describe('update after a deployment', () => {
  it('reloads once, then not again within a minute (no reload loop)', () => {
    const s = memory();
    let reloads = 0;
    const r = () => reloads++;
    const t0 = 1_800_000_000_000;
    expect(reloadOnce(t0, s, r)).toBe(true);
    expect(reloadOnce(t0 + 20_000, s, r)).toBe(false);
    expect(reloadOnce(t0 + 61_000, s, r)).toBe(true);
    expect(reloads).toBe(2);
    expect(reloadOnce(t0, null, r)).toBe(false);
  });
  it('a missing map file is a load error, not a WebGL problem', () => {
    const chunk = new TypeError('Failed to fetch dynamically imported module: https://x/assets/map-OLD.js');
    expect(handleMapError(chunk, () => true)).toBeNull(); // page reloads
    expect(handleMapError(chunk, () => false)).toBe('load'); // reload already tried
    const webgl = Object.assign(new Error('Interactive map unavailable (WebGL)'), { name: 'MapUnavailableError' });
    expect(handleMapError(webgl, () => true)).toBe('webgl');
  });
});
