/**
 * Open-Meteo airspace weather for Romania
 * Free, no auth, no IP block — works from Vercel
 * 7 points: Bucharest, Cluj, Timișoara, Constanța, Iași, Cernavodă, Deveselu
 */
import { NextResponse } from "next/server";

const STATIONS = [
  { id: "LROP", name: "Bucharest OTP",   lat: 44.57, lon: 26.10 },
  { id: "LRCL", name: "Cluj-Napoca",     lat: 46.79, lon: 23.70 },
  { id: "LRTR", name: "Timișoara",       lat: 45.80, lon: 21.34 },
  { id: "LRCK", name: "Constanța",       lat: 44.36, lon: 28.49 },
  { id: "LRIA", name: "Iași",            lat: 47.18, lon: 27.62 },
  { id: "LRCV", name: "Cernavodă NPP",   lat: 44.33, lon: 28.05 },
  { id: "LRBS", name: "Deveselu AFB",    lat: 44.01, lon: 24.29 },
];

let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 60_000; // 1 min

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, { headers: { "X-Cache": "HIT" } });
  }

  try {
    const results = await Promise.all(
      STATIONS.map(async (s) => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}` +
          `&current=temperature_2m,wind_speed_10m,wind_direction_10m,visibility,weather_code,cloud_cover` +
          `&wind_speed_unit=ms&format=json`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return { ...s, error: res.status };
        const d = await res.json();
        const c = d.current || {};
        return {
          id:          s.id,
          name:        s.name,
          lat:         s.lat,
          lon:         s.lon,
          temp:        c.temperature_2m,
          windSpeed:   c.wind_speed_10m,   // m/s
          windDir:     c.wind_direction_10m,
          visibility:  c.visibility,       // metres
          cloudCover:  c.cloud_cover,      // %
          weatherCode: c.weather_code,
          vfrOk:       (c.visibility ?? 0) >= 5000 && (c.cloud_cover ?? 100) < 50,
          ts:          c.time,
        };
      })
    );

    const payload = {
      stations: results,
      count: results.length,
      source: "open-meteo.com",
      ts: Date.now(),
    };
    cache = { data: payload, ts: Date.now() };
    return NextResponse.json(payload, { headers: { "X-Cache": "MISS" } });
  } catch (err) {
    return NextResponse.json({ stations: [], count: 0, source: "open-meteo.com", error: String(err) }, { status: 200 });
  }
}
