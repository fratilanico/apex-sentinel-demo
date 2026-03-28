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

const AWNING_LABEL: Record<string, string> = {
  RED:   "High Alert — drone activity detected near perimeter",
  AMBER: "Elevated — monitoring increased UAS movement",
  GREEN: "Nominal — no immediate threat detected",
};

const TYPE_LABEL: Record<string, string> = {
  airport:    "International Airport",
  nuclear:    "Nuclear Power Station",
  military:   "Military / NATO Installation",
  government: "Government / State Institution",
};

const TYPE_ICON: Record<string, string> = {
  airport: "✈", nuclear: "☢", military: "⬡", government: "⊕",
};

export default function ProtectedZonesPanel({ tracks }: Props) {
  const [notamCounts, setNotamCounts] = useState<Record<string, number>>({});
  const [notamSource, setNotamSource] = useState<string>("");

  useEffect(() => {
    fetch("/api/notams")
      .then(r => r.json())
      .then(d => {
        const counts: Record<string, number> = {};
        (d.notams || []).forEach((n: { icaoLocation: string }) => {
          counts[n.icaoLocation] = (counts[n.icaoLocation] || 0) + 1;
        });
        setNotamCounts(counts);
        setNotamSource(d.source || "");
      })
      .catch(() => {});
  }, []);

  const activeTracks = tracks.filter(t => t.phase !== "NEUTRALISED" && t.phase !== "MISSED");

  const ICAO_MAP: Record<string, string> = {
    LROP: "PZ-BUH", LRCL: "PZ-CLJ", LRTR: "PZ-TSR",
    LRBS: "PZ-OTP", LRTM: "PZ-TSR",
  };

  const notamByZone: Record<string, number> = {};
  Object.entries(notamCounts).forEach(([icao, count]) => {
    const zoneId = ICAO_MAP[icao];
    if (zoneId) notamByZone[zoneId] = (notamByZone[zoneId] || 0) + count;
  });

  const onlineNodes = SENTINEL_NODES.filter(n => n.online).length;

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="max-w-4xl mx-auto">

        {/* Page intro */}
        <div className="text-[10px] font-semibold tracking-[3px] uppercase text-[#00d4ff] mb-1">Protected Zones</div>
        <div className="text-2xl font-bold text-[#e8f4ff] mb-2">Romania — Restricted Airspace</div>
        <div className="text-[13px] text-[#7a9ab8] leading-relaxed mb-2 max-w-2xl">
          These are locations in Romania where drone flight is legally prohibited or restricted under EU and national aviation law.
          SENTINEL monitors each zone in real time — tracking any unidentified aircraft that approaches the perimeter.
        </div>
        <div className="text-[11px] text-[#334455] font-mono mb-6">
          {PROTECTED_ZONES.length} monitored zones · {onlineNodes} active sensors · Flight info region: Bucharest (LRBB)
          {notamSource && <span className="ml-2">· Notices to pilots: {notamSource}</span>}
        </div>

        {/* Alert level legend */}
        <div className="flex gap-3 mb-5 flex-wrap">
          {[
            { level: "RED",   color: "#ff4444", text: "High Alert" },
            { level: "AMBER", color: "#ffaa00", text: "Elevated" },
            { level: "GREEN", color: "#00e676", text: "Nominal" },
          ].map(l => (
            <div key={l.level} className="flex items-center gap-1.5 text-[10px] font-mono">
              <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              <span style={{ color: l.color }} className="font-bold">{l.level}</span>
              <span className="text-[#556a7a]">— {l.text}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {PROTECTED_ZONES.map(zone => {
            let closestDist = Infinity;
            let closestId = "";
            activeTracks.forEach(t => {
              const d = distanceKm(t.lat, t.lon, zone.lat, zone.lon);
              if (d < closestDist) { closestDist = d; closestId = t.id; }
            });

            const dronesTargeting = tracks.filter(t => t.targetZoneId === zone.id).length;
            const notams = notamByZone[zone.id] || 0;
            const awningColor = zone.awning === "GREEN" ? "#00e676" : zone.awning === "AMBER" ? "#ffaa00" : "#ff4444";
            const typeColor = zone.type === "nuclear" ? "#ff4444" : zone.type === "military" ? "#ffaa00" : "#00d4ff";
            const borderColor = zone.type === "nuclear"
              ? "border-[rgba(255,68,68,0.25)]"
              : zone.type === "military"
              ? "border-[rgba(255,170,0,0.2)]"
              : "border-[rgba(0,212,255,0.1)]";

            const threatLabel = dronesTargeting > 0
              ? `${dronesTargeting} drone${dronesTargeting > 1 ? "s" : ""} currently vectoring toward this zone`
              : "No drones currently heading toward this zone";

            const proximityLabel = closestDist < Infinity
              ? `Nearest airborne contact: ${closestId} at ${closestDist.toFixed(1)} km`
              : "No contacts within sensor range";

            return (
              <div key={zone.id} className={`bg-[#0f2035] rounded-lg p-4 border ${borderColor}`}>

                {/* Header */}
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5" style={{ color: typeColor }}>{TYPE_ICON[zone.type]}</span>
                    <div>
                      <div className="font-bold text-[#e8f4ff] text-[15px] leading-tight">{zone.name}</div>
                      <div className="text-[11px] text-[#7a9ab8] mt-0.5">
                        {TYPE_LABEL[zone.type]} · No-fly radius: {zone.radiusKm} km
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="px-2.5 py-1 rounded text-[10px] font-bold"
                      style={{ background: `${awningColor}18`, color: awningColor, border: `1px solid ${awningColor}44` }}>
                      {zone.awning}
                    </div>
                  </div>
                </div>

                {/* Plain English status */}
                <div className="text-[12px] text-[#7a9ab8] mb-3 leading-snug">
                  {AWNING_LABEL[zone.awning]}
                </div>

                {/* Stat row */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-[#0a1525] rounded-lg p-2.5 text-center">
                    <div className="font-mono text-[16px] font-bold" style={{ color: dronesTargeting > 0 ? "#ff4444" : "#556a7a" }}>
                      {dronesTargeting}
                    </div>
                    <div className="text-[9px] text-[#556a7a] uppercase tracking-wide mt-0.5">Drones approaching</div>
                  </div>
                  <div className="bg-[#0a1525] rounded-lg p-2.5 text-center">
                    <div className="font-mono text-[16px] font-bold text-[#00d4ff]">
                      {closestDist < Infinity ? `${closestDist.toFixed(1)} km` : "—"}
                    </div>
                    <div className="text-[9px] text-[#556a7a] uppercase tracking-wide mt-0.5">Nearest contact</div>
                  </div>
                  <div className="bg-[#0a1525] rounded-lg p-2.5 text-center">
                    <div className="font-mono text-[16px] font-bold" style={{ color: notams > 0 ? "#ffaa00" : "#556a7a" }}>
                      {notams}
                    </div>
                    <div className="text-[9px] text-[#556a7a] uppercase tracking-wide mt-0.5">Active flight notices</div>
                  </div>
                </div>

                {/* Narrative lines */}
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] font-mono text-[#556a7a] flex items-center gap-1.5">
                    <div className={`w-1 h-1 rounded-full ${dronesTargeting > 0 ? "bg-[#ff4444]" : "bg-[#334455]"}`} />
                    {threatLabel}
                  </div>
                  <div className="text-[10px] font-mono text-[#556a7a] flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-[#334455]" />
                    {proximityLabel}
                  </div>
                  {notams > 0 && (
                    <div className="text-[10px] font-mono text-[#ffaa00] flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-[#ffaa00]" />
                      {notams} active pilot notice{notams > 1 ? "s" : ""} issued for this location
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
