import { describe, expect, it } from 'vitest';
import { createSpinner } from './spin';

/** manual clock: frames run only when the test advances time */
function fakeClock() {
  let t = 0;
  let next = 1;
  const queue = new Map<number, (t: number) => void>();
  return {
    clock: { raf: (cb: (t: number) => void) => { queue.set(next, cb); return next++; }, caf: (id: number) => void queue.delete(id), now: () => t },
    /** run n frames of 16 ms */
    frames(n: number) { for (let i = 0; i < n; i++) { t += 16; const cbs = [...queue.values()]; queue.clear(); for (const cb of cbs) cb(t); } },
    get pending() { return queue.size; },
  };
}

describe('idle rotation (spinner)', () => {
  it('requests no frame until allowed and none while paused', () => {
    const f = fakeClock();
    let steps = 0;
    const s = createSpinner(() => steps++, { clock: f.clock });
    expect(f.pending).toBe(0);
    s.set(true);
    f.frames(10);
    expect(steps).toBe(10);
    s.set(false); // e.g. tab hidden
    expect(f.pending).toBe(0);
    f.frames(10);
    expect(steps).toBe(10);
    s.set(true);
    f.frames(5);
    expect(steps).toBe(15);
  });
  it('stops for good after the running-time budget, pauses do not count', () => {
    const f = fakeClock();
    let steps = 0;
    const s = createSpinner(() => steps++, { maxMs: 1000, clock: f.clock });
    s.set(true);
    f.frames(30); // 480 ms
    s.set(false);
    f.frames(500); // paused: no budget used
    s.set(true);
    f.frames(100);
    expect(s.done).toBe(true);
    expect(s.running).toBe(false);
    expect(f.pending).toBe(0);
    expect(steps).toBeGreaterThan(55);
    expect(steps).toBeLessThan(64);
    s.set(true);
    expect(f.pending).toBe(0);
  });
  it('destroy cancels the pending frame', () => {
    const f = fakeClock();
    const s = createSpinner(() => {}, { clock: f.clock });
    s.set(true);
    s.destroy();
    expect(f.pending).toBe(0);
  });
});
