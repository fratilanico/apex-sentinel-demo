"use client";
import { useEffect, useState } from "react";
import { PROTECTED_ZONES, SENTINEL_NODES, DroneTrack } from "@/lib/simulation";

interface Props {
  tracks: DroneTrack[];
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  return Math.sqrt(dLat * dLat + dLon * dLon) * 111;
}

export default function ProtectedZonesPanel({ tracks }: Props) {
  const [notamCounts, setNotamCounts] = useState<Record<string, number>>({});
  const [notamSource, setNotamSource] = useState<string>('');

  useEffect(() => {
    fetch('/api/notams')
      .then(r => r.json())
      .then(d => {
        const counts: Record<string, number> = {};
        (d.notams || []).forEach((n: { icaoLocation: string }) => {
          const icao = n.icaoLocation;
          counts[icao] = (counts[icao] || 0) + 1;
        });
        setNotamCounts(counts);
        setNotamSource(d.source || '');
      })
      .catch(() => {});
  }, []);

  const activeTracks = tracks.filter(t => t.phase !== 'NEUTRALISED' && t.phase !== 'MISSED');

  // Map ICAO codes to zone IDs (rough match by zone name)
  const ICAO_MAP: Record<string, string> = {
    LROP: 'PZ-BUH', LRCL: 'PZ-CLJ', LRTR: 'PZ-TSR',
    LRBS: 'PZ-OTP', LRTM: 'PZ-TSR',
  };

  const notamByZone: Record<string, number> = {};
  Object.entries(notamCounts).forEach(([icao, count]) => {
    const zoneId = ICAO_MAP[icao];
    if (zoneId) notamByZone[zoneId] = (notamByZone[zoneId] || 0) + count;
  });

  const TYPE_ICON: Record<string, string> = {
    airport: '✈',
    nuclear: '☢',
    military: '⬡',
    government: '⊕',
  };

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="max-w-4xl mx-auto">
        <div className="text-[10px] font-semibold tracking-[3px] uppercase text-[#00d4ff] mb-1">Protected Zones</div>
        <div className="text-2xl font-bold text-[#e8f4ff] mb-1">Romania Airspace Exclusion Zones</div>
        <div className="text-[11px] text-[#556a7a] font-mono mb-6">
          7 protected zones · FIR: LRBB (Bucharest)
          {notamSource && <span className="ml-3 text-[#334455]">NOTAMs: {notamSource}</span>}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {PROTECTED_ZONES.map(zone => {
            // Find closest active track
            let closestDist = Infinity;
            let closestId = '';
            activeTracks.forEach(t => {
              const d = distanceKm(t.lat, t.lon, zone.lat, zone.lon);
              if (d < closestDist) { closestDist = d; closestId = t.id; }
            });

            // Count detections in last period (tracks targeting this zone)
            const detections24h = tracks.filter(t => t.targetZoneId === zone.id).length;

            const notams = notamByZone[zone.id] || 0;
            const awningColor = zone.awning === 'GREEN' ? '#00e676' : zone.awning === 'AMBER' ? '#ffaa00' : '#ff4444';
            const typeColor = zone.type === 'nuclear' ? '#ff4444' : zone.type === 'military' ? '#ffaa00' : '#00d4ff';
            const borderColor = zone.type === 'nuclear' ? 'border-[rgba(255,68,68,0.25)]' : zone.type === 'military' ? 'border-[rgba(255,170,0,0.2)]' : 'border-[rgba(0,212,255,0.1)]';

            return (
              <div key={zone.id} className={`bg-[#0f2035] rounded-lg p-4 border ${borderColor}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg" style={{ color: typeColor }}>{TYPE_ICON[zone.type]}</span>
                    <div>
                      <div className="font-mono font-bold text-[#e8f4ff] text-[13px]">{zone.name}</div>
                      <div className="text-[10px] text-[#556a7a] font-mono">{zone.id} · {zone.type.toUpperCase()} · {zone.radiusKm}km exclusion</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                      style={{ background: `${awningColor}22`, color: awningColor, border: `1px solid ${awningColor}55` }}>
                      {zone.awning}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="font-mono text-[15px] font-bold text-[#e8f4ff]">{notams}</div>
                    <div className="text-[9px] text-[#556a7a] uppercase tracking-wider">Active NOTAMs</div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono text-[15px] font-bold text-[#ffaa00]">{detections24h}</div>
                    <div className="text-[9px] text-[#556a7a] uppercase tracking-wider">Tracks Targeting</div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono text-[15px] font-bold text-[#00d4ff]">{closestDist < Infinity ? `${closestDist.toFixed(1)}km` : '—'}</div>
                    <div className="text-[9px] text-[#556a7a] uppercase tracking-wider">Nearest Contact</div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono text-[12px] font-bold text-[#7a9ab8]">{closestId || '—'}</div>
                    <div className="text-[9px] text-[#556a7a] uppercase tracking-wider">Track ID</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1 text-[9px] font-mono text-[#334455]">
                  <span>{zone.lat.toFixed(4)}°N</span>
                  <span className="mx-1">·</span>
                  <span>{zone.lon.toFixed(4)}°E</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
