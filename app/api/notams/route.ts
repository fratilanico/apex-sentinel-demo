/**
 * NOTAM proxy — FAA/ICAO format
 * Romania FIR: LRBB (Bucharest FIR)
 */
import { NextResponse } from "next/server";

const ROMANIAN_AIRPORTS = ['LROP', 'LRCL', 'LRTR', 'LRBS', 'LRIA', 'LRSB', 'LRTM', 'LROD'];

let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 300_000; // 5min - NOTAMs change slowly

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, { headers: { 'X-Cache': 'HIT' } });
  }

  try {
    const locations = ROMANIAN_AIRPORTS.join(',');
    const url = `https://external-api.faa.gov/notamapi/v1/notams?icaoLocation=${locations}&pageSize=50`;
    const res = await fetch(url, {
      headers: { 'accept': 'application/json', 'client_id': 'apex-sentinel', 'client_secret': 'apex-sentinel' },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const raw = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notams = (raw.items || []).map((n: any) => ({
        id: n.properties?.coreNOTAMData?.notam?.id,
        icaoLocation: n.properties?.coreNOTAMData?.notam?.icaoLocation,
        text: n.properties?.coreNOTAMData?.notam?.text,
        type: n.properties?.coreNOTAMData?.notam?.classification,
        startDate: n.properties?.coreNOTAMData?.notam?.startDate,
        endDate: n.properties?.coreNOTAMData?.notam?.endDate,
      })).filter((n: { id: string }) => n.id);

      cache = { data: { notams, count: notams.length, fir: 'LRBB', source: 'FAA NOTAM API' }, ts: Date.now() };
      return NextResponse.json(cache.data);
    }
  } catch { /* fall through */ }

  return NextResponse.json({ notams: [], count: 0, fir: 'LRBB', source: 'unavailable' });
}
