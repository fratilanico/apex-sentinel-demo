/**
 * adsb.fi backup ADS-B feed — Romania bbox
 * Free, no API key, no IP block from Vercel
 * Bounding box: Romania (43.5–48.5°N, 20.2–30.0°E)
 */
import { NextResponse } from "next/server";

const ADSB_FI = "https://opendata.adsb.fi/api/v2/lat/46/lon/25/dist/400";

let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 15_000;

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, { headers: { "X-Cache": "HIT" } });
  }

  try {
    const res = await fetch(ADSB_FI, {
      headers: { "User-Agent": "APEX-SENTINEL/1.0 (research)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`adsb.fi ${res.status}`);

    const raw = await res.json();
    const aircraft = (raw.aircraft || [])
      .filter((a: Record<string, unknown>) => a.lat != null && a.lon != null)
      .filter((a: Record<string, unknown>) => {
        // Filter to Romania bbox
        const lat = a.lat as number;
        const lon = a.lon as number;
        return lat >= 43.5 && lat <= 48.5 && lon >= 20.2 && lon <= 30.0;
      })
      .map((a: Record<string, unknown>) => ({
        icao24:   a.hex,
        callsign: (a.flight as string)?.trim() || null,
        lat:      a.lat,
        lon:      a.lon,
        altitude: a.alt_baro ?? a.alt_geom,
        velocity: a.gs,   // ground speed in knots
        heading:  a.track,
        onGround: a.alt_baro === "ground",
        category: a.category,
        source:   "adsb.fi",
      }));

    const payload = {
      aircraft,
      count:  aircraft.length,
      source: "adsb.fi",
      bbox:   "Romania/EU (43.5–48.5°N, 20.2–30.0°E)",
      ts:     Date.now(),
    };
    cache = { data: payload, ts: Date.now() };
    return NextResponse.json(payload, { headers: { "X-Cache": "MISS" } });
  } catch (err) {
    if (cache) return NextResponse.json(cache.data, { headers: { "X-Cache": "STALE" } });
    return NextResponse.json({ aircraft: [], count: 0, source: "adsb.fi", error: String(err) }, { status: 200 });
  }
}
