/**
 * OpenSky Network proxy — real aircraft positions over Romania/EU
 * No auth required for free tier (throttled to 1 req/10s per IP)
 * Bounding box: Romania (43.5–48.5°N, 20.2–30.0°E)
 */

import { NextResponse } from "next/server";

const OPENSKY_URL =
  "https://opensky-network.org/api/states/all?lamin=43.5&lomin=20.2&lamax=48.5&lomax=30.0";

// Cache to avoid hammering OpenSky (free tier: 100 req/day anon)
let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 15_000; // 15s

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { "X-Cache": "HIT", "X-Cache-Age": String(Math.round((Date.now() - cache.ts) / 1000)) },
    });
  }

  try {
    const res = await fetch(OPENSKY_URL, {
      headers: { "User-Agent": "APEX-SENTINEL/1.0 (research)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenSky returned ${res.status}`, aircraft: [] },
        { status: 200 }
      );
    }

    const raw = await res.json();
    // Transform to clean format
    const aircraft = (raw.states || [])
      .filter((s: unknown[]) => s[5] != null && s[6] != null) // must have position
      .map((s: unknown[]) => ({
        icao24:    s[0],
        callsign:  (s[1] as string)?.trim() || null,
        origin:    s[2],
        lat:       s[6],
        lon:       s[5],
        altitude:  s[7] ?? s[13], // baro alt or geo alt
        velocity:  s[9],          // m/s
        heading:   s[10],
        onGround:  s[8],
        category:  s[17],
      }));

    const payload = {
      time:     raw.time,
      aircraft,
      count:    aircraft.length,
      source:   "opensky-network.org",
      bbox:     "Romania/EU (43.5–48.5°N, 20.2–30.0°E)",
    };

    cache = { data: payload, ts: Date.now() };

    return NextResponse.json(payload, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), aircraft: [], count: 0, source: "opensky-network.org" },
      { status: 200 }
    );
  }
}
