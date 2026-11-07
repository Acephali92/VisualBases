import { describe, expect, it } from 'vitest';
import { distanceKm, formatCoord, isValidCoord, EARTH_RADIUS_KM } from './geo';

/**
 * Reference values: computed independently with Vincenty's formula on the WGS84 ellipsoid (not with
 * this module). The spherical great-circle distance may differ from the ellipsoid by up to ~0.5 %.
 */
const within = (actual: number, expected: number, rel = 0.005) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(expected * rel);

describe('isValidCoord', () => {
  it('accepts valid coordinates including the edges and negatives', () => {
    for (const [lat, lon] of [[0, 0], [90, 180], [-90, -180], [-33.87, 151.21], [50.35, -7.59]]) expect(isValidCoord(lat, lon)).toBe(true);
  });
  it('rejects out-of-range, non-finite and non-numeric values', () => {
    for (const [lat, lon] of [[91, 0], [0, 181], [-90.0001, 0], [NaN, 0], [0, Infinity], ['50', '7'], [null, 7], [undefined, undefined]] as unknown[][]) {
      expect(isValidCoord(lat, lon), JSON.stringify([lat, lon])).toBe(false);
    }
  });
});

describe('distanceKm (great circle)', () => {
  it('is exactly zero for identical points', () => {
    expect(distanceKm(50.3533, 7.5949, 50.3533, 7.5949)).toBe(0);
    expect(distanceKm(-33.87, 151.21, -33.87, 151.21)).toBe(0);
  });
  it('resolves very small distances (≈ 1 m)', () => {
    // 0.000009° of latitude ≈ 1.0 m
    const d = distanceKm(50, 8, 50.000009, 8) * 1000;
    expect(d).toBeGreaterThan(0.95);
    expect(d).toBeLessThan(1.05);
  });
  it('Koblenz (PLZ 56068) → Büchel matches the ellipsoid reference (43.34 km)', () => within(distanceKm(50.3533174, 7.5949023, 50.1746, 7.0548), 43.34));
  it('Frankfurt → Ramstein ≈ 107.8 km', () => within(distanceKm(50.1109, 8.6821, 49.4398, 7.6019), 107.82));
  it('works across hemispheres: London → Sydney ≈ 16 989 km', () => within(distanceKm(51.5074, -0.1278, -33.8688, 151.2093), 16_989.3));
  it('works across the equator and the date line: Honolulu → Auckland ≈ 7 050 km', () => within(distanceKm(21.3069, -157.8583, -36.8485, 174.7633), 7_050.15));
  it('is symmetric and independent of the sign convention', () => {
    expect(distanceKm(-34.6, -58.4, 35.7, 139.7)).toBeCloseTo(distanceKm(35.7, 139.7, -34.6, -58.4), 9);
    // longitude 180 and -180 are the same meridian
    expect(distanceKm(10, 180, 10, -180)).toBeCloseTo(0, 9);
  });
  it('is numerically stable near antipodes (half circumference)', () => {
    const half = Math.PI * EARTH_RADIUS_KM;
    expect(distanceKm(0, 0, 0, 180)).toBeCloseTo(half, 6);
    expect(distanceKm(52.52, 13.405, -52.52, -166.595)).toBeCloseTo(half, 6);
    expect(distanceKm(0, 0, 0, 179.9999)).toBeLessThan(half);
  });
  it('quarter of the meridian ≈ 10 008 km', () => expect(Math.round(distanceKm(0, 0, 90, 0))).toBe(10008));
  it('returns NaN for invalid coordinates instead of a plausible-looking number', () => {
    expect(distanceKm(NaN, 0, 0, 0)).toBeNaN();
    expect(distanceKm(0, 0, 95, 0)).toBeNaN();
    expect(distanceKm(0, 0, 0, Number('x'))).toBeNaN();
  });
});

describe('formatCoord', () => {
  it('uses hemisphere letters instead of signs', () => {
    expect(formatCoord(50.3533174, 7.5949023, 'de')).toBe('50.3533° N, 7.5949° O');
    expect(formatCoord(50.3533174, 7.5949023, 'en')).toBe('50.3533° N, 7.5949° E');
    expect(formatCoord(-33.8688, -151.2093, 'en')).toBe('33.8688° S, 151.2093° W');
  });
});
