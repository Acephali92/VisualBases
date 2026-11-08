/**
 * Animation loop that only runs while it is allowed (tab visible, element in view …) and stops for good after
 * a total running time – the idle globe rotation on the start page. No frames are requested while paused, so a
 * background tab or a scrolled-away globe costs nothing (roadmap P1-5).
 */
export interface Spinner {
  /** allow or pause the loop; resuming continues the running-time budget */
  set(allowed: boolean): void;
  readonly running: boolean;
  /** the budget is used up – the loop will not start again */
  readonly done: boolean;
  destroy(): void;
}

interface Clock {
  raf: (cb: (t: number) => void) => number;
  caf: (id: number) => void;
  now: () => number;
}

// wrapped: the browser functions must not be called as methods of another object ("Illegal invocation")
const browserClock = (): Clock => ({ raf: (cb) => requestAnimationFrame(cb), caf: (id) => cancelAnimationFrame(id), now: () => performance.now() });

export function createSpinner(step: () => void, { maxMs = 60_000, clock }: { maxMs?: number; clock?: Clock } = {}): Spinner {
  const c = clock ?? browserClock();
  let id = 0;
  let running = false;
  let done = false;
  let spent = 0;
  let last = 0;
  const halt = () => { if (running) c.caf(id); running = false; };
  const frame = (t: number) => {
    // a long gap (throttled frame) counts as one frame, not as running time
    spent += Math.min(Math.max(t - last, 0), 100);
    last = t;
    if (spent >= maxMs) { halt(); done = true; return; }
    step();
    id = c.raf(frame);
  };
  return {
    set(allowed) {
      if (allowed && !running && !done) { running = true; last = c.now(); id = c.raf(frame); }
      else if (!allowed) halt();
    },
    get running() { return running; },
    get done() { return done; },
    destroy() { halt(); done = true; },
  };
}
