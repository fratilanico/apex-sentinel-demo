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

interface WeatherPoint {
  id: string;
  name: string;
  temp?: number;
  windSpeed?: number;
  windDir?: number;
  visibility?: number;
  cloudCover?: number;
  vfrOk?: boolean;
}

interface SecurityEvent {
  lat: number;
  lon: number;
  date: string;
  type: string;
  notes: string;
  source: string;
}

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

  // Live intel state
  const [weather, setWeather] = useState<WeatherPoint | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [ukraineAlertCount, setUkraineAlertCount] = useState(0);
  const [notamCount, setNotamCount] = useState(0);

  const tickRef = useRef(0);
  const injectedAlertIds = useRef<Set<string>>(new Set());

  const addAlert = useCallback((alert: Omit<Alert, "id">) => {
    alertId++;
    setAlerts(a => [...a.slice(-49), { ...alert, id: `a${alertId}` }]);
  }, []);

  // Inject a real-world alert (deduped by externalId)
  const injectRealAlert = useCallback((externalId: string, alert: Omit<Alert, "id">) => {
    if (injectedAlertIds.current.has(externalId)) return;
    injectedAlertIds.current.add(externalId);
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

  // — LIVE INTEL: Weather (every 60s) —
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch("/api/weather");
        const data = await res.json();
        // Use Bucharest OTP (first station) for dashboard widget
        const buh = (data.stations || []).find((s: WeatherPoint) => s.id === "LROP") || data.stations?.[0];
        if (buh) setWeather(buh);
      } catch { /* silently ignore */ }
    };
    fetchWeather();
    const iv = setInterval(fetchWeather, 60000);
    return () => clearInterval(iv);
  }, []);

  // — LIVE INTEL: Ukraine Air Raid Alerts (every 15s) —
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch("/api/alerts");
        const data = await res.json();
        const active = data.active || [];
        setUkraineAlertCount(active.length);
        // Inject each new active alert into the feed (deduped)
        active.slice(0, 3).forEach((a: { id: string; oblast: string; type: string }) => {
          injectRealAlert(`ua-${a.id}`, {
            timestamp: Date.now(), severity: "WARNING",
            message: `[LIVE] Ukraine air raid alert — ${a.oblast}: ${(a.type || '').replace(/_/g, ' ').toUpperCase()}`,
          });
        });
        // Inject summary if many active
        if (active.length > 0) {
          injectRealAlert(`ua-summary-${Math.floor(Date.now() / 60000)}`, {
            timestamp: Date.now(), severity: "WARNING",
            message: `[LIVE] ${active.length} active air raid alert${active.length > 1 ? 's' : ''} across Ukraine — border threat elevated`,
          });
        }
      } catch { /* silently ignore */ }
    };
    fetchAlerts();
    const iv = setInterval(fetchAlerts, 15000);
    return () => clearInterval(iv);
  }, [injectRealAlert]);

  // — LIVE INTEL: NOTAMs (every 5min) —
  useEffect(() => {
    const fetchNotams = async () => {
      try {
        const res = await fetch("/api/notams");
        const data = await res.json();
        setNotamCount(data.count || 0);
        if (data.count > 0) {
          injectRealAlert(`notam-batch-${Math.floor(Date.now() / 300000)}`, {
            timestamp: Date.now(), severity: "INFO",
            message: `[LIVE] NOTAM: ${data.count} active notice${data.count > 1 ? 's' : ''} for FIR LRBB — check ROMATSA AIS`,
          });
        }
        // Inject individual NOTAMs
        (data.notams || []).slice(0, 3).forEach((n: { id: string; icaoLocation?: string; text?: string }) => {
          injectRealAlert(`notam-${n.id}`, {
            timestamp: Date.now(), severity: "INFO",
            message: `[NOTAM] ${n.icaoLocation || 'FIR LRBB'}: ${(n.text || '').slice(0, 80)}`,
          });
        });
      } catch { /* silently ignore */ }
    };
    fetchNotams();
    const iv = setInterval(fetchNotams, 300000);
    return () => clearInterval(iv);
  }, [injectRealAlert]);

  // — LIVE INTEL: Security Events (every 5min) —
  useEffect(() => {
    const fetchSecurity = async () => {
      try {
        const res = await fetch("/api/security-events");
        const data = await res.json();
        setSecurityEvents(data.events || []);
        (data.events || []).slice(0, 2).forEach((e: SecurityEvent, i: number) => {
          injectRealAlert(`sec-${e.date}-${i}`, {
            timestamp: Date.now(), severity: "INFO",
            message: `[${data.source || 'SIGINT'}] ${e.type} — ${(e.notes || '').slice(0, 70)}`,
          });
        });
      } catch { /* silently ignore */ }
    };
    fetchSecurity();
    const iv = setInterval(fetchSecurity, 300000);
    return () => clearInterval(iv);
  }, [injectRealAlert]);

  const activeTracks = tracks.filter(t => t.phase !== "NEUTRALISED" && t.phase !== "MISSED");
  const terminalTracks = activeTracks.filter(t => t.phase === "TERMINAL");

  const windDirLabel = (deg?: number) => {
    if (deg == null) return '';
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    return dirs[Math.round(deg / 45) % 8];
  };

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
            <LiveMap
              tracks={activeTracks}
              selected={selected}
              onSelect={setSelected}
              securityEvents={securityEvents}
            />

            {/* Selected track detail */}
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

            {/* Top-right overlays: Threat Matrix + Weather + Intel counters */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 z-[900]">
              {/* Threat Matrix */}
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

              {/* Live Intel Counters */}
              <div className="bg-[rgba(10,21,37,0.85)] border border-[rgba(0,212,255,0.2)] rounded-lg px-3 py-2 backdrop-blur-sm">
                <div className="text-[9px] font-mono text-[#556a7a] uppercase tracking-wider mb-1.5">Live Intel</div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[10px]">
                    <div className={`w-1.5 h-1.5 rounded-full ${ukraineAlertCount > 0 ? 'bg-[#ff2200]' : 'bg-[#334455]'}`} />
                    <span className="text-[#7a9ab8]">UA Alerts</span>
                    <span className={`font-mono font-bold ml-auto ${ukraineAlertCount > 0 ? 'text-[#ff6644]' : 'text-[#334455]'}`}>{ukraineAlertCount}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <div className={`w-1.5 h-1.5 rounded-full ${notamCount > 0 ? 'bg-[#ffaa00]' : 'bg-[#334455]'}`} />
                    <span className="text-[#7a9ab8]">NOTAMs</span>
                    <span className={`font-mono font-bold ml-auto ${notamCount > 0 ? 'text-[#ffaa00]' : 'text-[#334455]'}`}>{notamCount}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <div className={`w-1.5 h-1.5 rounded-full ${securityEvents.length > 0 ? 'bg-[#ff6b6b]' : 'bg-[#334455]'}`} />
                    <span className="text-[#7a9ab8]">SIGINT</span>
                    <span className={`font-mono font-bold ml-auto ${securityEvents.length > 0 ? 'text-[#ff6b6b]' : 'text-[#334455]'}`}>{securityEvents.length}</span>
                  </div>
                </div>
              </div>

              {/* Weather Widget — Open-Meteo LIVE */}
              {weather && (
                <div className="bg-[rgba(10,21,37,0.85)] border border-[rgba(0,212,255,0.15)] rounded-lg px-3 py-2 backdrop-blur-sm">
                  <div className="text-[9px] font-mono text-[#556a7a] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>MET · {weather.id}</span>
                    <span className={`font-bold ${weather.vfrOk ? 'text-[#00e676]' : 'text-[#ffaa00]'}`}>
                      {weather.vfrOk ? 'VFR' : 'MVFR'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                    <div className="flex items-center gap-1">
                      <span className="text-[#556a7a]">Wind</span>
                      <span className="font-mono text-[#00d4ff] ml-auto">{weather.windSpeed?.toFixed(1) ?? '—'}m/s {windDirLabel(weather.windDir)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[#556a7a]">Vis</span>
                      <span className={`font-mono ml-auto ${(weather.visibility ?? 0) >= 5000 ? 'text-[#00e676]' : 'text-[#ffaa00]'}`}>
                        {weather.visibility != null ? `${(weather.visibility / 1000).toFixed(0)}km` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[#556a7a]">Temp</span>
                      <span className="font-mono text-[#c8d8e8] ml-auto">{weather.temp?.toFixed(0) ?? '—'}°C</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[#556a7a]">Cloud</span>
                      <span className={`font-mono ml-auto ${(weather.cloudCover ?? 0) < 50 ? 'text-[#00e676]' : 'text-[#ffaa00]'}`}>{weather.cloudCover ?? '—'}%</span>
                    </div>
                  </div>
                  <div className="text-[8px] font-mono text-[#334455] mt-1">open-meteo.com · LIVE</div>
                </div>
              )}
            </div>
          </div>

          {/* Right: alert feed */}
          <div className="w-64 flex-shrink-0 flex flex-col border-l border-[rgba(0,212,255,0.1)] bg-[#0a1525]">
            <AlertFeed alerts={alerts} />
          </div>
        </div>
      )}

      {tab === "PROTECTED ZONES"  && <div className="flex-1 min-h-0 overflow-hidden"><ProtectedZonesPanel tracks={tracks} /></div>}
      {tab === "NETWORK COVERAGE" && <div className="flex-1 min-h-0 overflow-hidden"><NetworkCoveragePanel /></div>}
      {tab === "SYSTEM STATUS"    && <div className="flex-1 min-h-0 overflow-hidden"><SystemStatus /></div>}
    </div>
  );
}
