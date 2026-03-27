/**
 * OpenSky Network proxy — real aircraft positions over Romania/EU
 * Supports credentials via OPENSKY_USERNAME + OPENSKY_PASSWORD env vars
 * Bounding box: Romania (43.5–48.5°N, 20.2–30.0°E)
 */

import { NextResponse } from "next/server";

const BASE_URL = "https://opensky-network.org/api/states/all?lamin=43.5&lomin=20.2&lamax=48.5&lomax=30.0";

const USERNAME = process.env.OPENSKY_USERNAME || '';
const PASSWORD = process.env.OPENSKY_PASSWORD || '';

let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 15_000; // 15s

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { "X-Cache": "HIT", "X-Cache-Age": String(Math.round((Date.now() - cache.ts) / 1000)) },
    });
  }

  const headers: Record<string, string> = {
    "User-Agent": "APEX-SENTINEL/1.0 (research)",
    "Accept": "application/json",
  };

  // Add basic auth if credentials are set
  if (USERNAME && PASSWORD) {
    headers["Authorization"] = `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')}`;
  }

  try {
    const res = await fetch(BASE_URL, {
      headers,
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      // Return stale cache if available, otherwise empty
      if (cache) return NextResponse.json(cache.data, { headers: { "X-Cache": "STALE" } });
      return NextResponse.json(
        { error: `OpenSky ${res.status}`, aircraft: [], count: 0, source: "opensky-network.org", rateLimited: res.status === 429 },
        { status: 200 }
      );
    }

    const raw = await res.json();
    const aircraft = (raw.states || [])
      .filter((s: unknown[]) => s[5] != null && s[6] != null)
      .map((s: unknown[]) => ({
        icao24:   s[0],
        callsign: (s[1] as string)?.trim() || null,
        origin:   s[2],
        lat:      s[6],
        lon:      s[5],
        altitude: s[7] ?? s[13],
        velocity: s[9],
        heading:  s[10],
        onGround: s[8],
        category: s[17],
      }));

    const payload = {
      time:    raw.time,
      aircraft,
      count:   aircraft.length,
      source:  "opensky-network.org",
      bbox:    "Romania/EU (43.5–48.5°N, 20.2–30.0°E)",
      authenticated: !!(USERNAME && PASSWORD),
    };

    cache = { data: payload, ts: Date.now() };
    return NextResponse.json(payload, { headers: { "X-Cache": "MISS" } });

  } catch (err) {
    // Return stale cache on timeout rather than empty
    if (cache) return NextResponse.json(cache.data, { headers: { "X-Cache": "STALE" } });
    return NextResponse.json(
      { error: String(err), aircraft: [], count: 0, source: "opensky-network.org", timedOut: true },
      { status: 200 }
    );
  }
}
