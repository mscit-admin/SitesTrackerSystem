// Regenerate lib/geoReference.ts from data/sites.json.
// The reference table powers coordinate-based Region / Sub-Region detection
// (nearest-neighbour over all known sites). Run after re-importing the master:
//   node scripts/genGeoReference.js
const fs = require("fs");
const path = require("path");

const REGIONS = ["Middle Area", "Tripoli Area", "Zawia Area", "WM Area"];
const sites = require(path.join(__dirname, "..", "data", "sites.json"));

const rows = [];
for (const s of sites) {
  const lat = s.latitude,
    lng = s.longitude;
  if (typeof lat !== "number" || typeof lng !== "number" || !s.region) continue;
  if (lat < 19 || lat > 34 || lng < 9 || lng > 26) continue; // Libya sanity bounds
  const ri = REGIONS.indexOf(s.region);
  if (ri < 0) continue;
  rows.push([Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5, ri, s.subRegion || ""]);
}

const out = `// AUTO-GENERATED from data/sites.json (${rows.length} known sites). Do not edit by hand.
// Regenerate with: node scripts/genGeoReference.js
// Each row: [latitude, longitude, regionIndex, subRegion]
export const REGION_NAMES = ${JSON.stringify(REGIONS)} as const;
export type GeoRow = [number, number, number, string];
export const GEO_REFERENCE: GeoRow[] = ${JSON.stringify(rows)};
`;
fs.writeFileSync(path.join(__dirname, "..", "lib", "geoReference.ts"), out);
console.log(`wrote lib/geoReference.ts (${rows.length} rows, ${(out.length / 1024).toFixed(1)}KB)`);
