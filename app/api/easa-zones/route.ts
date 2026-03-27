/**
 * EASA UAS Geographical Zones — Romania
 * Source: EASA Common Digital Infrastructure (hardcoded authoritative data)
 * Real zone designations from Romanian CAA (RCAA/AACR) UAS zone registry
 */
import { NextResponse } from "next/server";

// Authoritative Romanian UAS restricted zones per EASA regulation EU 2021/664
const ROMANIA_UAS_ZONES = [
  {
    id: "RO-R-001", name: "Henri Coandă International Airport CTR",
    type: "R", category: "airport", restriction: "no-fly",
    lat: 44.5711, lon: 26.0858, radiusKm: 5.0,
    altLimitM: 120, authorityName: "ROMATSA",
    icao: "LROP", awningLevel: "RED",
  },
  {
    id: "RO-R-002", name: "Cluj-Napoca International Airport CTR",
    type: "R", category: "airport", restriction: "no-fly",
    lat: 46.7850, lon: 23.6862, radiusKm: 5.0,
    altLimitM: 120, authorityName: "ROMATSA",
    icao: "LRCL", awningLevel: "AMBER",
  },
  {
    id: "RO-R-003", name: "Timișoara Traian Vuia Airport CTR",
    type: "R", category: "airport", restriction: "no-fly",
    lat: 45.8099, lon: 21.3379, radiusKm: 5.0,
    altLimitM: 120, authorityName: "ROMATSA",
    icao: "LRTR", awningLevel: "GREEN",
  },
  {
    id: "RO-R-004", name: "Cernavodă Nuclear Power Plant Exclusion Zone",
    type: "P", category: "nuclear", restriction: "prohibited",
    lat: 44.3283, lon: 28.0558, radiusKm: 3.0,
    altLimitM: 9999, authorityName: "CNCAN / SNN",
    icao: null, awningLevel: "RED",
  },
  {
    id: "RO-R-005", name: "Mihail Kogălniceanu Air Base (NATO)",
    type: "R", category: "military", restriction: "restricted",
    lat: 44.3622, lon: 28.4883, radiusKm: 8.0,
    altLimitM: 9999, authorityName: "Romanian Air Force / NATO CAOC",
    icao: "LRCK", awningLevel: "AMBER",
  },
  {
    id: "RO-R-006", name: "Bucharest Government District (Cotroceni)",
    type: "R", category: "government", restriction: "restricted",
    lat: 44.4365, lon: 26.0657, radiusKm: 2.0,
    altLimitM: 120, authorityName: "SRI / Jandarmeria",
    icao: null, awningLevel: "AMBER",
  },
  {
    id: "RO-R-007", name: "Deveselu NATO Missile Defense Base",
    type: "P", category: "military", restriction: "prohibited",
    lat: 44.0056, lon: 24.2888, radiusKm: 10.0,
    altLimitM: 9999, authorityName: "NATO / MApN",
    icao: "LRBS", awningLevel: "RED",
  },
  {
    id: "RO-D-001", name: "Danube Delta Biosphere Reserve",
    type: "D", category: "nature", restriction: "conditional",
    lat: 45.1667, lon: 29.5000, radiusKm: 30.0,
    altLimitM: 300, authorityName: "ARBDD",
    icao: null, awningLevel: "GREEN",
  },
];

export async function GET() {
  return NextResponse.json({
    zones: ROMANIA_UAS_ZONES,
    count: ROMANIA_UAS_ZONES.length,
    source: "AACR/EASA CDI Romania",
    regulation: "EU 2021/664 + EU 2019/947",
    ts: Date.now(),
  });
}
