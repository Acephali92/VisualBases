/** per-device preferences (kept in localStorage when available) */
function read(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

export const settings = $state({ satellite: read('vb-satellite', false) });

export function setSatellite(on: boolean) {
  settings.satellite = on;
  try { localStorage.setItem('vb-satellite', on ? '1' : '0'); } catch { /* ignore */ }
}
