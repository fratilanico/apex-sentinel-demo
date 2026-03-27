"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  DroneTrack, Alert,
  spawnTrack, tickTrack,
  DRONE_META,
} from "@/lib/simulation";
import TopBar from "@/components/TopBar";
import TrackList from "@/components/TrackList";
import AlertFeed from "@/components/AlertFeed";
import ProtectedZonesPanel from "@/components/ProtectedZonesPanel";
import NetworkCoveragePanel from "@/components/NetworkCoveragePanel";
import SystemStatus from "@/components/SystemStatus";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { ssr: false });

let alertId = 0;

export default function Home() {
  const [tab, setTab] = useState("LIVE MAP");
  const [tracks, setTracks] = useState<DroneTrack[]>(() =>
    ['cat-a-commercial', 'cat-b-modified', 'cat-c-surveillance',
     'cat-d-unknown', 'cat-a-commercial', 'cat-b-modified', 'cat-c-surveillance']
      .map(cls => spawnTrack(cls as Parameters<typeof spawnTrack>[0]))
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([
    { id: "a0", timestamp: Date.now() - 5000, severity: "INFO",    message: "System online — 6/7 nodes active · FIR LRBB nominal" },
    { id: "a1", timestamp: Date.now() - 3000, severity: "WARNING", message: "SN-CND: Cat-C Surveillance UAS detected at 280Hz — bearing 045°" },
    { id: "a2", timestamp: Date.now() - 1000, severity: "TERMINAL", message: "UAS-003 entering terminal phase — RF-silent contact approaching PZ-CND" },
  ]);

  const tickRef = useRef(0);

  const addAlert = useCallback((alert: Omit<Alert, "id">) => {
    alertId++;
    setAlerts(a => [...a.slice(-49), { ...alert, id: `a${alertId}` }]);
  }, []);

  // Simulation tick every 1s
  useEffect(() => {
    const iv = setInterval(() => {
      tickRef.current++;
      const tick = tickRef.current;

      setTracks(prev => {
        const next = prev.map(t => tickTrack(t, 1));

        // Phase change alerts
        next.forEach((t, i) => {
          const old = prev[i];
          if (old && t.phase !== old.phase) {
            if (t.phase === "TERMINAL") {
              addAlert({
                timestamp: Date.now(), severity: "TERMINAL",
                message: `${t.id} TERMINAL PHASE — ${DRONE_META[t.droneClass].label} bearing ${t.bearing.toFixed(0)}° TTI ${t.ttImpact}s → ${t.targetZoneName}`,
                droneClass: t.droneClass, phase: "TERMINAL",
              });
            } else if (t.phase === "APPROACH") {
              addAlert({
                timestamp: Date.now(), severity: "WARNING",
                message: `${t.id} APPROACH — ${DRONE_META[t.droneClass].label} conf ${(t.confidence * 100).toFixed(0)}% → ${t.targetZoneName}`,
                droneClass: t.droneClass, phase: "APPROACH",
              });
            } else if (t.phase === "NEUTRALISED") {
              addAlert({
                timestamp: Date.now(), severity: "INFO",
                message: `${t.id} NEUTRALISED — ${DRONE_META[t.droneClass].label} threat eliminated`,
                droneClass: t.droneClass, phase: "NEUTRALISED",
              });
            }
          }
        });

        const active = next.filter(t => t.phase !== "NEUTRALISED" && t.phase !== "MISSED");
        const done   = next.filter(t => t.phase === "NEUTRALISED" || t.phase === "MISSED");
        const history = done.slice(-5);

        if (tick % 15 === 0 && active.length < 8) {
          const newTrack = spawnTrack();
          addAlert({
            timestamp: Date.now(), severity: "WARNING",
            message: `New contact: ${newTrack.id} — ${DRONE_META[newTrack.droneClass].label} detected by ${newTrack.nodeId}`,
            droneClass: newTrack.droneClass,
          });
          return [...active, ...history, newTrack];
        }

        return [...active, ...history];
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [addAlert]);

  const activeTracks = tracks.filter(t => t.phase !== "NEUTRALISED" && t.phase !== "MISSED");
  const terminalTracks = activeTracks.filter(t => t.phase === "TERMINAL");

  return (
    <div className="flex flex-col h-screen bg-[#0d1b2a] overflow-hidden">
      <TopBar activeCount={activeTracks.length} terminalCount={terminalTracks.length} tab={tab} onTab={setTab} />

      {tab === "LIVE MAP" && (
        <div className="flex flex-1 min-h-0">
          {/* Left: track list */}
          <div className="w-56 flex-shrink-0 flex flex-col border-r border-[rgba(0,212,255,0.1)] bg-[#0a1525]">
            <TrackList tracks={tracks} selected={selected} onSelect={setSelected} />
          </div>

          {/* Center: map */}
          <div className="flex-1 relative">
            <LiveMap tracks={activeTracks} selected={selected} onSelect={setSelected} />

            {/* Overlay: selected track detail */}
            {selected && (() => {
              const t = tracks.find(x => x.id === selected);
              if (!t) return null;
              const meta = DRONE_META[t.droneClass];
              return (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[rgba(10,21,37,0.95)] border border-[rgba(0,212,255,0.3)] rounded-lg px-5 py-3 backdrop-blur-sm min-w-[320px] fade-in-up">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
                      <span className="font-mono font-bold text-[#e8f4ff]">{t.id}</span>
                      <span className="font-mono text-[11px] text-[#7a9ab8]">{meta.label}</span>
                    </div>
                    <button onClick={() => setSelected(null)} className="text-[#556a7a] hover:text-[#c8d8e8] text-lg leading-none">×</button>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div><div className="font-mono text-[13px] font-bold text-[#e8f4ff]">{t.phase}</div><div className="text-[9px] text-[#7a9ab8] uppercase">Phase</div></div>
                    <div><div className="font-mono text-[13px] font-bold text-[#00d4ff]">{(t.confidence * 100).toFixed(0)}%</div><div className="text-[9px] text-[#7a9ab8] uppercase">Conf</div></div>
                    <div><div className="font-mono text-[13px] font-bold text-[#e8f4ff]">{t.ttImpact}s</div><div className="text-[9px] text-[#7a9ab8] uppercase">TTI</div></div>
                    <div><div className="font-mono text-[13px] font-bold text-[#e8f4ff]">{Math.round(t.altitudeM)}m</div><div className="text-[9px] text-[#7a9ab8] uppercase">Alt</div></div>
                  </div>
                  <div className="flex gap-3 mt-2 text-[10px] font-mono text-[#556a7a]">
                    <span>{t.freqHz[0]}–{t.freqHz[1]} Hz</span>
                    <span>{t.engineType}</span>
                    {t.rfSilent && <span className="text-[#ff8888]">RF Silent</span>}
                    <span>Node: {t.nodeId}</span>
                  </div>
                  <div className="mt-1 text-[10px] font-mono text-[#334455]">→ {t.targetZoneName}</div>
                </div>
              );
            })()}

            {/* Terminal phase flash */}
            {terminalTracks.length > 0 && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-[rgba(255,68,68,0.15)] border border-[#ff4444] backdrop-blur-sm" style={{ animation: 'blink 0.8s infinite' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff4444]" />
                <span className="font-mono text-[11px] font-bold text-[#ff4444] tracking-widest uppercase">
                  {terminalTracks.length} TERMINAL PHASE CONTACT{terminalTracks.length > 1 ? 'S' : ''}
                </span>
              </div>
            )}

            {/* Map overlay stats */}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              <div className="bg-[rgba(10,21,37,0.85)] border border-[rgba(0,212,255,0.2)] rounded-lg px-3 py-2 backdrop-blur-sm">
                <div className="text-[9px] font-mono text-[#556a7a] uppercase tracking-wider mb-1">Threat Matrix</div>
                {Object.entries(
                  activeTracks.reduce((acc, t) => ({ ...acc, [t.droneClass]: (acc[t.droneClass] || 0) + 1 }), {} as Record<string, number>)
                ).map(([cls, cnt]) => (
                  <div key={cls} className="flex items-center gap-2 text-[10px]">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: DRONE_META[cls as keyof typeof DRONE_META]?.color }} />
                    <span className="text-[#7a9ab8]">{DRONE_META[cls as keyof typeof DRONE_META]?.label || cls}</span>
                    <span className="font-mono text-[#e8f4ff] font-bold ml-auto">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: alert feed */}
          <div className="w-64 flex-shrink-0 flex flex-col border-l border-[rgba(0,212,255,0.1)] bg-[#0a1525]">
            <AlertFeed alerts={alerts} />
          </div>
        </div>
      )}

      {tab === "PROTECTED ZONES"   && <div className="flex-1 min-h-0 overflow-hidden"><ProtectedZonesPanel tracks={tracks} /></div>}
      {tab === "NETWORK COVERAGE"  && <div className="flex-1 min-h-0 overflow-hidden"><NetworkCoveragePanel /></div>}
      {tab === "SYSTEM STATUS"     && <div className="flex-1 min-h-0 overflow-hidden"><SystemStatus /></div>}
    </div>
  );
}
