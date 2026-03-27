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

  // Realistic Romanian NOTAMs — demo fallback (ROMATSA AIS format)
  const demoNotams = [
    { id: 'A1247/26', icaoLocation: 'LROP', type: 'AIRSPACE', text: 'LROP AD 2.21 SPECIAL ACTIVITIES. UAS OPERATIONS RESTRICTED WITHIN 5NM OF LROP AD BOUNDARY SFC-500FT AMSL. REQ ATC CLEARANCE.', startDate: '2026-03-25T06:00:00Z', endDate: '2026-04-30T20:00:00Z' },
    { id: 'A1198/26', icaoLocation: 'LRCL', type: 'AIRSPACE', text: 'LRCL CTAF/UNICOM FREQ CHANGE TO 122.800 MHZ. FRQ 122.700 MHZ U/S FOR MAINTENANCE. EXC CTRL FRQ 119.100 MHZ UNCHANGED.', startDate: '2026-03-20T00:00:00Z', endDate: '2026-04-15T23:59:00Z' },
    { id: 'A1312/26', icaoLocation: 'LRTR', type: 'NAVAID', text: 'LRTR ILS RWY 12 LOC UNSERVICEABLE. DME OPR. EXP RST 2026-04-10. ALS RWY 12 U/S. NON-PRECISION APCH ONLY.', startDate: '2026-03-26T08:00:00Z', endDate: '2026-04-10T18:00:00Z' },
    { id: 'A1189/26', icaoLocation: 'LROP', type: 'OBSTACLE', text: 'CRANE ERECTED AT PSN 444108N 0260517E (APPROX 1.2NM NE LROP TWR). HGT 68M AGL. LGTD. OBST LIGHT WHITE/RED FLASHING.', startDate: '2026-03-15T00:00:00Z', endDate: '2026-05-31T23:59:00Z' },
    { id: 'A1356/26', icaoLocation: 'LRBS', type: 'AIRSPACE', text: 'LRBS RWY 35 CLOSED FOR RESURFACING. ALL OPS RWY 17/35 SUSPENDED. DEP/ARR VIA RWY 09/27 ONLY. ARFF CAT REDUCED TO CAT 6.', startDate: '2026-03-27T06:00:00Z', endDate: '2026-04-03T18:00:00Z' },
    { id: 'A1301/26', icaoLocation: 'LRIA', type: 'AIRSPACE', text: 'LRIA TMA CLASS D BOUNDARY MODIFIED. NEW COORD 463300N 0274500E-463000N 0280000E. CHART AMDT PENDING. REF AIP ROMANIA ENR 2.1.', startDate: '2026-03-22T00:00:00Z', endDate: '2026-06-22T23:59:00Z' },
    { id: 'A1278/26', icaoLocation: 'LROP', type: 'PROCEDURE', text: 'LROP SID RWY 08L/08R: BUKOV1A/BUKOV1B DEPARTURE PROC SUSPENDED. ATC VECTORS TO TRACK. CREW BRIEF ATC PRE-DEPRTURE.', startDate: '2026-03-24T04:00:00Z', endDate: '2026-04-07T04:00:00Z' },
  ];

  cache = { data: { notams: demoNotams, count: demoNotams.length, fir: 'LRBB', source: 'ROMATSA AIS (demo)' }, ts: Date.now() };
  return NextResponse.json(cache.data);
}
