// Simulation data for APEX-SENTINEL live demo
// Theater: Romania / EU Airspace

export type DroneCategory = 'cat-a-commercial' | 'cat-b-modified' | 'cat-c-surveillance' | 'cat-d-unknown';
export type DroneClass = DroneCategory; // backward compat alias
export type Phase = 'CRUISE' | 'APPROACH' | 'TERMINAL' | 'NEUTRALISED' | 'MISSED';

export interface DroneTrack {
  id: string;
  label: string;
  droneClass: DroneCategory;
  engineType: 'piston' | 'electric' | 'hybrid';
  lat: number;
  lon: number;
  bearing: number;
  speedKmh: number;
  altitudeM: number;
  confidence: number;
  phase: Phase;
  rfSilent: boolean;
  elrsDetected: boolean;
  freqHz: [number, number];
  spawnLat: number;
  spawnLon: number;
  targetLat: number;
  targetLon: number;
  targetZoneId: string;
  targetZoneName: string;
  age: number;
  ttImpact: number;
  nodeId: string;
}

export interface SentinelNode {
  id: string;
  lat: number;
  lon: number;
  label: string;
  online: boolean;
  detections: number;
}

export interface Alert {
  id: string;
  timestamp: number;
  message: string;
  severity: 'TERMINAL' | 'WARNING' | 'INFO';
  droneClass?: DroneCategory;
  phase?: Phase;
}

export interface ProtectedZone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radiusKm: number;
  type: 'airport' | 'nuclear' | 'military' | 'government';
  awning: 'GREEN' | 'AMBER' | 'RED';
}

export const SENTINEL_NODES: SentinelNode[] = [
  { id: 'SN-BUH', lat: 44.5713, lon: 26.0849, label: 'Henri Coandă Airport',   online: true,  detections: 34 },
  { id: 'SN-CLJ', lat: 46.7852, lon: 23.6862, label: 'Cluj-Napoca Airport',     online: true,  detections: 28 },
  { id: 'SN-TSR', lat: 45.8099, lon: 21.3379, label: 'Timișoara Airport',       online: true,  detections: 19 },
  { id: 'SN-MKK', lat: 44.3622, lon: 28.4883, label: 'Mihail Kogălniceanu',    online: true,  detections: 51 },
  { id: 'SN-CND', lat: 44.3267, lon: 28.0606, label: 'Cernavodă Nuclear',      online: true,  detections: 12 },
  { id: 'SN-DVS', lat: 44.0986, lon: 24.1375, label: 'Deveselu NATO Base',     online: false, detections: 7  },
  { id: 'SN-OTP', lat: 44.4268, lon: 26.1025, label: 'Bucharest Gov District', online: true,  detections: 22 },
];

export const PROTECTED_ZONES: ProtectedZone[] = [
  { id: 'PZ-BUH', name: 'Henri Coandă Airport',   lat: 44.5713, lon: 26.0849, radiusKm: 5,  type: 'airport',    awning: 'GREEN' },
  { id: 'PZ-CLJ', name: 'Cluj-Napoca Airport',     lat: 46.7852, lon: 23.6862, radiusKm: 5,  type: 'airport',    awning: 'GREEN' },
  { id: 'PZ-TSR', name: 'Timișoara Airport',       lat: 45.8099, lon: 21.3379, radiusKm: 5,  type: 'airport',    awning: 'GREEN' },
  { id: 'PZ-CND', name: 'Cernavodă Nuclear Plant', lat: 44.3267, lon: 28.0606, radiusKm: 10, type: 'nuclear',    awning: 'GREEN' },
  { id: 'PZ-MKK', name: 'Mihail Kogălniceanu',    lat: 44.3622, lon: 28.4883, radiusKm: 8,  type: 'military',   awning: 'GREEN' },
  { id: 'PZ-DVS', name: 'Deveselu NATO Base',      lat: 44.0986, lon: 24.1375, radiusKm: 8,  type: 'military',   awning: 'GREEN' },
  { id: 'PZ-OTP', name: 'Bucharest Gov District',  lat: 44.4268, lon: 26.1025, radiusKm: 3,  type: 'government', awning: 'GREEN' },
];

export const DRONE_META: Record<DroneCategory, {
  label: string; color: string; engineType: 'electric' | 'piston' | 'hybrid';
  freqHz: [number, number]; speedKmh: number; maxRangeKm: number;
}> = {
  'cat-a-commercial':   { label: 'Commercial UAS',   color: '#00d4ff', engineType: 'electric', freqHz: [800,3000],  speedKmh: 65,  maxRangeKm: 7  },
  'cat-b-modified':     { label: 'Modified UAS',     color: '#ffaa00', engineType: 'electric', freqHz: [400,2400],  speedKmh: 80,  maxRangeKm: 15 },
  'cat-c-surveillance': { label: 'Surveillance UAS', color: '#ff8800', engineType: 'piston',   freqHz: [100,400],   speedKmh: 120, maxRangeKm: 50 },
  'cat-d-unknown':      { label: 'Unknown Contact',  color: '#ff4444', engineType: 'hybrid',   freqHz: [2400,5800], speedKmh: 100, maxRangeKm: 30 },
};

// Spawn zones around Romania borders / rural areas
const SPAWN_ZONES = [
  { lat: 44.0, lon: 22.5 }, // SW Romania
  { lat: 47.5, lon: 27.5 }, // NE Romania (Moldova border)
  { lat: 45.0, lon: 29.5 }, // Danube delta / Black Sea coast
  { lat: 46.0, lon: 20.5 }, // W Romania (Hungary border)
  { lat: 43.8, lon: 25.0 }, // S Romania (Bulgaria border)
];

let trackCounter = 0;

export function spawnTrack(droneClass?: DroneCategory): DroneTrack {
  const cats = Object.keys(DRONE_META) as DroneCategory[];
  const cls = droneClass ?? cats[Math.floor(Math.random() * cats.length)];
  const meta = DRONE_META[cls];
  const spawn = SPAWN_ZONES[Math.floor(Math.random() * SPAWN_ZONES.length)];
  const target = PROTECTED_ZONES[Math.floor(Math.random() * PROTECTED_ZONES.length)];
  trackCounter++;

  const jitterLat = (Math.random() - 0.5) * 0.5;
  const jitterLon = (Math.random() - 0.5) * 0.5;

  const spawnLat = spawn.lat + jitterLat;
  const spawnLon = spawn.lon + jitterLon;
  const targetLat = target.lat + (Math.random() - 0.5) * 0.2;
  const targetLon = target.lon + (Math.random() - 0.5) * 0.2;

  const dLat = targetLat - spawnLat;
  const dLon = targetLon - spawnLon;
  const bearing = Math.atan2(dLon, dLat) * 180 / Math.PI;

  const dist = Math.sqrt(dLat * dLat + dLon * dLon) * 111;
  const ttImpact = Math.round(dist / meta.speedKmh * 3600);

  const onlineNodes = SENTINEL_NODES.filter(n => n.online);
  const node = onlineNodes[Math.floor(Math.random() * onlineNodes.length)];

  return {
    id: `UAS-${String(trackCounter).padStart(3, '0')}`,
    label: `${meta.label.replace(' ', '-').toUpperCase()}-${String(trackCounter).padStart(2, '0')}`,
    droneClass: cls,
    engineType: meta.engineType,
    lat: spawnLat,
    lon: spawnLon,
    bearing,
    speedKmh: meta.speedKmh * (0.8 + Math.random() * 0.4),
    altitudeM: 50 + Math.random() * 400,
    confidence: 0.55 + Math.random() * 0.45,
    phase: 'CRUISE',
    rfSilent: Math.random() < 0.15,
    elrsDetected: cls === 'cat-b-modified' || cls === 'cat-d-unknown',
    freqHz: meta.freqHz,
    spawnLat,
    spawnLon,
    targetLat,
    targetLon,
    targetZoneId: target.id,
    targetZoneName: target.name,
    age: 0,
    ttImpact,
    nodeId: node.id,
  };
}

export function tickTrack(t: DroneTrack, dtS: number): DroneTrack {
  const dLat = t.targetLat - t.lat;
  const dLon = t.targetLon - t.lon;
  const dist = Math.sqrt(dLat * dLat + dLon * dLon) * 111;
  if (dist < 0.5) return { ...t, phase: Math.random() > 0.3 ? 'NEUTRALISED' : 'MISSED', age: t.age + dtS };

  const step = (t.speedKmh / 3600) * dtS / 111;
  const norm = Math.sqrt(dLat * dLat + dLon * dLon);
  const newLat = t.lat + (dLat / norm) * step;
  const newLon = t.lon + (dLon / norm) * step;

  const newDist = Math.sqrt((t.targetLat - newLat) ** 2 + (t.targetLon - newLon) ** 2) * 111;
  let phase: Phase = 'CRUISE';
  if (newDist < 5)       phase = 'TERMINAL';
  else if (newDist < 20) phase = 'APPROACH';

  const newTt = Math.round(newDist / t.speedKmh * 3600);

  return {
    ...t,
    lat: newLat,
    lon: newLon,
    age: t.age + dtS,
    ttImpact: newTt,
    phase,
    altitudeM: phase === 'TERMINAL' ? Math.max(10, t.altitudeM - 20) : t.altitudeM,
    confidence: Math.min(0.99, t.confidence + 0.001),
  };
}

export function formatTt(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}
