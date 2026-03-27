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

    // OpenSky blocks cloud IPs without credentials — return simulated Romanian air traffic
    const simAircraft = generateSimulatedRomanianAircraft();
    const payload = {
      aircraft: simAircraft,
      count: simAircraft.length,
      source: "simulated",
      bbox: "Romania/EU (43.5–48.5°N, 20.2–30.0°E)",
      simulated: true,
      note: String(err).includes("fetch failed") ? "OpenSky unreachable from cloud — showing representative air traffic" : String(err),
    };
    cache = { data: payload, ts: Date.now() };
    return NextResponse.json(payload, { status: 200, headers: { "X-Cache": "SIM" } });
  }
}

// Realistic Romanian commercial air traffic for demo fallback
function generateSimulatedRomanianAircraft() {
  const routes = [
    // Bucharest LROP approaches/departures
    { icao24: "4840a1", callsign: "ROT234", lat: 44.62, lon: 26.10, altitude: 3200, velocity: 140, heading: 195, onGround: false },
    { icao24: "4840b2", callsign: "ROT118", lat: 44.48, lon: 25.90, altitude: 1800, velocity: 110, heading: 35,  onGround: false },
    { icao24: "4840c3", callsign: "WZZ4321", lat: 44.70, lon: 26.30, altitude: 8500, velocity: 230, heading: 220, onGround: false },
    { icao24: "3c6743", callsign: "DLH456",  lat: 45.20, lon: 25.50, altitude: 10600, velocity: 245, heading: 175, onGround: false },
    { icao24: "484044", callsign: "ROT892",  lat: 44.55, lon: 26.08, altitude: 0,    velocity: 0,   heading: 0,   onGround: true  },
    // Cluj corridor
    { icao24: "484055", callsign: "WZZ5671", lat: 46.75, lon: 23.70, altitude: 2800, velocity: 125, heading: 280, onGround: false },
    { icao24: "484066", callsign: "ROT445",  lat: 46.90, lon: 23.50, altitude: 9200, velocity: 235, heading: 95,  onGround: false },
    // Timișoara
    { icao24: "484077", callsign: "ROT231",  lat: 45.82, lon: 21.25, altitude: 3600, velocity: 155, heading: 55,  onGround: false },
    // Constanța / Black Sea
    { icao24: "484088", callsign: "ROT773",  lat: 44.20, lon: 28.65, altitude: 7400, velocity: 220, heading: 310, onGround: false },
    // Overflights (en route across Romania)
    { icao24: "3c6921", callsign: "AUA832",  lat: 45.50, lon: 24.80, altitude: 11200, velocity: 250, heading: 85, onGround: false },
    { icao24: "4ca8f1", callsign: "RYR7821", lat: 44.80, lon: 22.40, altitude: 10400, velocity: 245, heading: 110, onGround: false },
    { icao24: "40083a", callsign: "BAW234",  lat: 47.20, lon: 26.80, altitude: 11600, velocity: 255, heading: 195, onGround: false },
  ];

  // Add small positional jitter so it looks live
  const jitter = () => (Math.random() - 0.5) * 0.05;
  return routes.map(r => ({
    ...r,
    lat: r.lat + jitter(),
    lon: r.lon + jitter(),
  }));
}
