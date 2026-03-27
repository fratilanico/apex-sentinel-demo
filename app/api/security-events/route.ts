/**
 * Security events proxy — ACLED Southeast Europe
 * Free researcher API: register at api.acleddata.com
 * Falls back to GDELT if no API key
 */
import { NextResponse } from "next/server";

const ACLED_KEY = process.env.ACLED_API_KEY || '';
const ACLED_EMAIL = process.env.ACLED_EMAIL || '';

const GDELT_FALLBACK = 'https://api.gdeltproject.org/api/v2/geo/geo?query=Romania+drone+airspace&mode=pointdata&maxrecords=50&format=json';

let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 300_000; // 5min

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, { headers: { 'X-Cache': 'HIT' } });
  }

  // Try ACLED first if key available
  if (ACLED_KEY && ACLED_EMAIL) {
    try {
      const url = `https://api.acleddata.com/acled/read?key=${ACLED_KEY}&email=${ACLED_EMAIL}&country=Romania&limit=50&fields=event_date|event_type|latitude|longitude|notes|fatalities&format=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const raw = await res.json();
        const events = (raw.data || []).map((e: Record<string, string>) => ({
          date: e.event_date, type: e.event_type,
          lat: parseFloat(e.latitude), lon: parseFloat(e.longitude),
          notes: e.notes, fatalities: parseInt(e.fatalities || '0'),
          source: 'ACLED',
        }));
        cache = { data: { events, count: events.length, source: 'ACLED' }, ts: Date.now() };
        return NextResponse.json(cache.data);
      }
    } catch { /* fall through to GDELT */ }
  }

  // GDELT fallback — no auth required
  try {
    const res = await fetch(GDELT_FALLBACK, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const raw = await res.json();
      const events = (raw.features || []).map((f: { geometry: { coordinates: number[] }, properties: Record<string, string> }) => ({
        lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0],
        date: f.properties.dateadded, type: 'Security Event',
        notes: f.properties.name, source: 'GDELT',
      }));
      cache = { data: { events, count: events.length, source: 'GDELT' }, ts: Date.now() };
      return NextResponse.json(cache.data);
    }
  } catch { /* fall through */ }

  return NextResponse.json({ events: [], count: 0, source: 'none' });
}
