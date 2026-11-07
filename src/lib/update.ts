/**
 * Keeping the installed app (PWA) in step with new deployments.
 *
 * After a deployment the browser may still run the previous version from the service-worker cache.
 * Its lazily loaded files (map engine, country shapes) carry content hashes and no longer exist on
 * the server, so loading them fails. Such a failure is not a missing WebGL: the page is reloaded
 * once to get the current version; only if that does not help is a notice shown.
 */

const KEY = 'vb-reload-at';
/** no second automatic reload within this time – prevents reload loops (e.g. when offline) */
const GUARD_MS = 60_000;

/** reload the page unless that was already tried a moment ago; returns whether it reloads */
export function reloadOnce(now = Date.now(), storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeStorage(), reload = () => location.reload()): boolean {
  if (!storage) return false;
  const last = Number(storage.getItem(KEY) ?? 0);
  if (now - last < GUARD_MS) return false;
  storage.setItem(KEY, String(now));
  reload();
  return true;
}

function safeStorage(): Storage | null {
  try { return sessionStorage; } catch { return null; }
}

/** why the map could not be shown */
export type MapFailure = 'webgl' | 'load';

/** classify a map error; a load error triggers one reload (returns null then – nothing to show yet) */
export function handleMapError(e: unknown, reload: () => boolean = () => reloadOnce()): MapFailure | null {
  console.warn(e);
  if ((e as Error)?.name === 'MapUnavailableError') return 'webgl';
  return reload() ? null : 'load';
}
