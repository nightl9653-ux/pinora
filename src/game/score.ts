/** Kilometers to a 0–100 accuracy score. Steep across nearby cities, then flatter. */
const KNOTS: readonly (readonly [number, number])[] = [
  [0, 100],
  [30, 100],
  [80, 96],
  [150, 90],
  [250, 78],
  [500, 70],
  [800, 68],
  [1500, 55],
  [3000, 38],
  [6000, 22],
  [10000, 12],
  [15000, 4],
  [19000, 0],
  [20100, 0],
];

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const r = 6371;
  const p = Math.PI / 180;
  const dLat = (lat2 - lat1) * p;
  const dLng = (lng2 - lng1) * p;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Distance past the edge of a region. Inside the radius counts as 0 km. */
export function scoredKm(rawKm: number, radiusKm = 0): number {
  const radius = Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : 0;
  const past = rawKm - radius;
  return past > 0 ? past : 0;
}

export function accuracyFromKm(km: number): number {
  if (!Number.isFinite(km) || km <= 30) return km < 0 || !Number.isFinite(km) ? 0 : 100;
  if (km >= 19000) return 0;
  for (let i = 1; i < KNOTS.length; i += 1) {
    const [d0, s0] = KNOTS[i - 1];
    const [d1, s1] = KNOTS[i];
    if (km <= d1) {
      const t = (km - d0) / (d1 - d0);
      return Math.round(s0 + (s1 - s0) * smooth(t));
    }
  }
  return 0;
}
