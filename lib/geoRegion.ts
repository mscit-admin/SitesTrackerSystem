// Coordinate-based Region / Sub-Region detection.
//
// Given a latitude/longitude the system infers the project Region (and the
// Sub-Region that belongs to it) by nearest-neighbour against every known site
// from the master workbook (see lib/geoReference.ts). This needs no external
// service and works fully offline: Libyan sites cluster tightly per region, so
// a weighted vote among the closest known sites is reliable.
//
// Pure module (no server imports) — safe to use on client and server alike.
import { GEO_REFERENCE, REGION_NAMES } from "@/lib/geoReference";

export const LIBYA_BOUNDS = { minLat: 19, maxLat: 34, minLng: 9, maxLng: 26 };

export interface RegionDetection {
  region: string;
  subRegion: string | null;
  nearestKm: number; // distance to the single closest known site
  confidence: "high" | "medium" | "low";
}

// Haversine distance in kilometres.
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function isValidLibyaCoord(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= LIBYA_BOUNDS.minLat &&
    lat <= LIBYA_BOUNDS.maxLat &&
    lng >= LIBYA_BOUNDS.minLng &&
    lng <= LIBYA_BOUNDS.maxLng
  );
}

const K = 7; // neighbours considered in the vote

/**
 * Detect the Region and Sub-Region for a coordinate.
 * Returns null when the coordinate is missing or clearly outside Libya.
 */
export function detectRegion(lat: number, lng: number): RegionDetection | null {
  if (!isValidLibyaCoord(lat, lng)) return null;
  if (GEO_REFERENCE.length === 0) return null;

  // distance to every known site
  const scored = GEO_REFERENCE.map((row) => ({
    km: haversineKm(lat, lng, row[0], row[1]),
    regionIdx: row[2],
    subRegion: row[3],
  })).sort((a, b) => a.km - b.km);

  const nearest = scored[0];
  const neighbours = scored.slice(0, Math.min(K, scored.length));

  // Region: inverse-distance-weighted vote among nearest neighbours.
  const regionWeight = new Map<number, number>();
  for (const nb of neighbours) {
    const w = 1 / (nb.km + 0.5); // +0.5km avoids divide-by-zero / over-weighting
    regionWeight.set(nb.regionIdx, (regionWeight.get(nb.regionIdx) ?? 0) + w);
  }
  let bestRegion = nearest.regionIdx;
  let bestWeight = -1;
  for (const [idx, w] of regionWeight) {
    if (w > bestWeight) {
      bestWeight = w;
      bestRegion = idx;
    }
  }

  // Sub-Region: majority among the neighbours that belong to the winning
  // region, tie-broken by proximity (neighbours are already distance-sorted).
  const inRegion = neighbours.filter((nb) => nb.regionIdx === bestRegion && nb.subRegion);
  let subRegion: string | null = null;
  if (inRegion.length) {
    const subCount = new Map<string, number>();
    for (const nb of inRegion) subCount.set(nb.subRegion, (subCount.get(nb.subRegion) ?? 0) + 1);
    let best = -1;
    for (const nb of inRegion) {
      const c = subCount.get(nb.subRegion)!;
      if (c > best) {
        best = c;
        subRegion = nb.subRegion; // first (closest) wins ties
      }
    }
  }

  const confidence: RegionDetection["confidence"] =
    nearest.km <= 8 ? "high" : nearest.km <= 25 ? "medium" : "low";

  return {
    region: REGION_NAMES[bestRegion] ?? REGION_NAMES[nearest.regionIdx],
    subRegion,
    nearestKm: Math.round(nearest.km * 10) / 10,
    confidence,
  };
}
