"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { DroneTrack, DRONE_META, SENTINEL_NODES, PROTECTED_ZONES } from "@/lib/simulation";

interface Props {
  tracks: DroneTrack[];
  selected: string | null;
  onSelect: (id: string) => void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any;
  }
}

interface Aircraft {
  icao24: string;
  callsign: string | null;
  lat: number;
  lon: number;
  altitude: number | null;
  velocity: number | null;
  heading: number | null;
  onGround: boolean;
}

interface UkraineAlert {
  id: string;
  oblast: string;
  type: string;
  lat: number;
  lon: number;
}

export default function LiveMap({ tracks, selected, onSelect }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeMarkersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heatLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trailsRef = useRef<Map<string, any>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aircraftMarkersRef = useRef<Map<string, any>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alertMarkersRef = useRef<any[]>([]);

  const [dataSource, setDataSource] = useState<"SIM" | "LIVE">("LIVE");
  const [liveAircraft, setLiveAircraft] = useState<Aircraft[]>([]);
  const [ukraineAlerts, setUkraineAlerts] = useState<UkraineAlert[]>([]);
  const [lastFetch, setLastFetch] = useState<string>("");
  const [fetchError, setFetchError] = useState<string>("");

  const fetchLiveData = useCallback(async () => {
    try {
      // Fetch OpenSky; if count is 0 try adsb.fi backup
      const res = await fetch("/api/opensky");
      const data = await res.json();
      let aircraft = data.aircraft || [];
      if (aircraft.length === 0 || data.simulated) {
        try {
          const r2 = await fetch("/api/adsb-fi");
          const d2 = await r2.json();
          if ((d2.aircraft || []).length > 0) aircraft = d2.aircraft;
        } catch { /* keep opensky result */ }
      }
      setLiveAircraft(aircraft);
      setLastFetch(new Date().toLocaleTimeString());
      setFetchError(data.simulated ? "sim" : "");
    } catch (e) {
      setFetchError(String(e));
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      setUkraineAlerts((data.active || []).filter((a: UkraineAlert) => a.lat && a.lon));
    } catch { /* silently ignore */ }
  }, []);

  // Poll live data every 15s when in LIVE mode
  useEffect(() => {
    if (dataSource !== "LIVE") return;
    fetchLiveData();
    const iv = setInterval(fetchLiveData, 15000);
    return () => clearInterval(iv);
  }, [dataSource, fetchLiveData]);

  // Poll Ukraine alerts every 15s
  useEffect(() => {
    if (dataSource !== "LIVE") return;
    fetchAlerts();
    const iv = setInterval(fetchAlerts, 15000);
    return () => clearInterval(iv);
  }, [dataSource, fetchAlerts]);

  // Init map
  useEffect(() => {
    if (typeof window === "undefined" || mapInstanceRef.current) return;

    const script1 = document.createElement("script");
    script1.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    const link1 = document.createElement("link");
    link1.rel = "stylesheet";
    link1.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

    const script2 = document.createElement("script");
    script2.src = "https://leaflet.github.io/Leaflet.heat/dist/leaflet-heat.js";

    document.head.appendChild(link1);
    document.head.appendChild(script1);

    script1.onload = () => {
      document.head.appendChild(script2);
      script2.onload = () => {
        initMap();
      };
    };

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initMap() {
    if (!mapRef.current || mapInstanceRef.current) return;
    const L = window.L;

    const map = L.map(mapRef.current, {
      center: [45.9, 24.9],
      zoom: 7,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
      subdomains: "abcd",
    }).addTo(map);

    mapInstanceRef.current = map;

    // Protected zone circles
    PROTECTED_ZONES.forEach(zone => {
      const color = zone.type === 'nuclear' ? '#ff4444' :
                    zone.type === 'military' ? '#ffaa00' : '#00d4ff';
      L.circle([zone.lat, zone.lon], {
        radius: zone.radiusKm * 1000,
        color, fillColor: color, fillOpacity: 0.05, weight: 1.5,
        dashArray: zone.type === 'military' ? '4,4' : undefined,
      }).addTo(map).bindPopup(`
        <div style="background:#0f2035;border:1px solid ${color}55;color:#c8d8e8;padding:6px 10px;border-radius:6px;font-size:11px;font-family:monospace">
          <b style="color:${color}">${zone.name}</b><br/>
          Type: ${zone.type.toUpperCase()}<br/>
          Exclusion: ${zone.radiusKm}km radius<br/>
          Status: <span style="color:#00e676">${zone.awning}</span>
        </div>
      `);
    });

    // Sentinel nodes
    SENTINEL_NODES.forEach(node => {
      const html = `
        <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center">
          <div style="position:absolute;width:40px;height:40px;border-radius:50%;border:1px solid ${node.online ? '#00e676' : '#ff4444'};opacity:0.3;animation:${node.online ? 'pulse-ring 2s infinite' : 'none'}"/>
          <div style="width:10px;height:10px;border-radius:50%;background:${node.online ? '#00e676' : '#ff4444'};box-shadow:0 0 8px ${node.online ? '#00e676' : '#ff4444'}"/>
        </div>`;
      const icon = L.divIcon({ html, className: "", iconSize: [40, 40], iconAnchor: [20, 20] });
      const marker = L.marker([node.lat, node.lon], { icon })
        .addTo(map)
        .bindTooltip(`<div style="background:#0f2035;border:1px solid rgba(0,212,255,0.3);color:#c8d8e8;padding:4px 8px;border-radius:4px;font-size:11px;font-family:monospace">${node.id} — ${node.label}<br/><span style="color:${node.online ? '#00e676' : '#ff4444'}">${node.online ? 'ONLINE' : 'OFFLINE'}</span> · ${node.detections} detections</div>`,
          { className: "custom-tooltip", permanent: false });
      nodeMarkersRef.current.push(marker);
    });

    // Sentinel heatmap
    if (window.L.heatLayer) {
      const heatData: [number, number, number][] = SENTINEL_NODES.map(n => [n.lat, n.lon, n.detections / 100]);
      heatLayerRef.current = window.L.heatLayer(heatData, {
        radius: 40, blur: 30, maxZoom: 12,
        gradient: { 0.2: '#001133', 0.4: '#003366', 0.6: '#ff6600', 0.8: '#ff2200', 1.0: '#ff0000' },
      }).addTo(map);
    }
  }

  // Update live aircraft markers
  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstanceRef.current || dataSource !== "LIVE") {
      aircraftMarkersRef.current.forEach(m => mapInstanceRef.current?.removeLayer(m));
      aircraftMarkersRef.current.clear();
      return;
    }

    const map = mapInstanceRef.current;
    const activeIds = new Set(liveAircraft.map(a => a.icao24));

    aircraftMarkersRef.current.forEach((m, id) => {
      if (!activeIds.has(id)) { map.removeLayer(m); aircraftMarkersRef.current.delete(id); }
    });

    liveAircraft.forEach(ac => {
      const rotate = ac.heading ? `transform:rotate(${ac.heading}deg)` : '';
      const html = `<div style="width:12px;height:12px;opacity:0.8;${rotate}">
        <svg viewBox="0 0 24 24" fill="#4488ff" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L8 18l4-2 4 2L12 2z"/>
        </svg>
      </div>`;
      const icon = L.divIcon({ html, className: "", iconSize: [12, 12], iconAnchor: [6, 6] });
      const label = ac.callsign || ac.icao24;
      const alt = ac.altitude ? `${Math.round(ac.altitude)}m` : '?m';
      const spd = ac.velocity ? `${Math.round(ac.velocity * 3.6)}km/h` : '';

      if (aircraftMarkersRef.current.has(ac.icao24)) {
        const m = aircraftMarkersRef.current.get(ac.icao24);
        m.setLatLng([ac.lat, ac.lon]);
        m.setIcon(icon);
      } else {
        const m = L.marker([ac.lat, ac.lon], { icon })
          .addTo(map)
          .bindTooltip(
            `<div style="background:#0f2035;border:1px solid #4488ff55;color:#c8d8e8;padding:4px 8px;border-radius:4px;font-size:10px;font-family:monospace">
              <b style="color:#4488ff">${label}</b><br/>
              ${alt} ${spd}${ac.onGround ? ' · GROUND' : ''}
            </div>`,
            { className: "custom-tooltip" }
          );
        aircraftMarkersRef.current.set(ac.icao24, m);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveAircraft, dataSource]);

  // Ukraine air-raid alert markers
  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    alertMarkersRef.current.forEach((m) => map.removeLayer(m));
    alertMarkersRef.current = [];
    ukraineAlerts.forEach((alert) => {
      const m = L.circle([alert.lat, alert.lon], {
        radius: 40000, color: '#ff2200', fillColor: '#ff2200',
        fillOpacity: 0.12, weight: 1, dashArray: '3,5',
      }).addTo(map).bindTooltip(
        `<div style="background:#1a0505;border:1px solid #ff220055;color:#ffaaaa;padding:4px 8px;border-radius:4px;font-size:10px;font-family:monospace">
          ⚠ ${alert.oblast}<br/><span style="color:#ff6666">${alert.type?.replace(/_/g,' ')?.toUpperCase()}</span>
        </div>`,
        { className: "custom-tooltip" }
      );
      alertMarkersRef.current.push(m);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ukraineAlerts]);

  // Update drone simulation markers
  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const activeDrones = new Set(tracks.filter(t => t.phase !== 'MISSED').map(t => t.id));

    markersRef.current.forEach((m, id) => {
      if (!activeDrones.has(id)) { map.removeLayer(m); markersRef.current.delete(id); }
    });
    trailsRef.current.forEach((t, id) => {
      if (!activeDrones.has(id)) { map.removeLayer(t); trailsRef.current.delete(id); }
    });

    tracks.filter(t => t.phase !== 'MISSED').forEach(track => {
      const meta = DRONE_META[track.droneClass];
      const isTerminal = track.phase === 'TERMINAL';
      const isApproach = track.phase === 'APPROACH';
      const isNeutralised = track.phase === 'NEUTRALISED';
      const size = isTerminal ? 20 : 14;

      const color = isNeutralised ? '#00e676' : meta.color;
      const pulse = isTerminal ? `animation:blink 0.5s infinite` : '';
      const ring = (isTerminal || isApproach)
        ? `<div style="position:absolute;width:${size + 20}px;height:${size + 20}px;border-radius:50%;border:1px solid ${color};opacity:0.5;top:${-(size + 20) / 2 + size / 2}px;left:${-(size + 20) / 2 + size / 2}px;animation:pulse-ring ${isTerminal ? '0.8' : '2'}s infinite"/>`
        : '';

      const html = `<div style="position:relative;${pulse}">
        ${ring}
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};box-shadow:0 0 ${isTerminal ? 16 : 8}px ${color};opacity:${isNeutralised ? 0.5 : 1};display:flex;align-items:center;justify-content:center">
          ${isTerminal ? `<div style="width:6px;height:6px;border-radius:50%;background:white;opacity:0.8"/>` : ''}
        </div>
      </div>`;

      const icon = L.divIcon({ html, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

      if (markersRef.current.has(track.id)) {
        const m = markersRef.current.get(track.id);
        m.setLatLng([track.lat, track.lon]);
        m.setIcon(icon);
      } else {
        const m = L.marker([track.lat, track.lon], { icon })
          .addTo(map)
          .on("click", () => onSelect(track.id))
          .bindTooltip(
            `<div style="background:#0f2035;border:1px solid ${color}55;color:#c8d8e8;padding:6px 10px;border-radius:6px;font-size:11px;min-width:160px;font-family:monospace">
              <div style="font-weight:700;color:${color};margin-bottom:4px">${track.id} — ${track.phase}</div>
              <div>${meta.label}</div>
              <div style="color:#7a9ab8;font-size:10px;margin-top:2px">${track.freqHz[0]}–${track.freqHz[1]} Hz · ${(track.confidence * 100).toFixed(0)}% conf</div>
              ${track.rfSilent ? `<div style="color:#ff8888;font-size:10px">RF Silent</div>` : ''}
            </div>`,
            { className: "custom-tooltip", permanent: false }
          );
        markersRef.current.set(track.id, m);
      }

      if (trailsRef.current.has(track.id)) {
        map.removeLayer(trailsRef.current.get(track.id));
      }
      if (track.age > 2) {
        const trail = L.polyline(
          [[track.spawnLat, track.spawnLon], [track.lat, track.lon]],
          { color, weight: 1.5, opacity: 0.35, dashArray: "4 4" }
        ).addTo(map);
        trailsRef.current.set(track.id, trail);
      }
    });

    if (heatLayerRef.current) {
      const terminalHeat: [number, number, number][] = tracks
        .filter(t => t.phase === 'TERMINAL' || t.phase === 'APPROACH')
        .map(t => [t.lat, t.lon, t.phase === 'TERMINAL' ? 1.0 : 0.5]);
      const nodeHeat: [number, number, number][] = SENTINEL_NODES.map(n => [n.lat, n.lon, n.detections / 100]);
      heatLayerRef.current.setLatLngs([...nodeHeat, ...terminalHeat]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" style={{ background: "#0a1220" }} />

      {/* Data source toggle */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-[1000]">
        <div className="bg-[rgba(10,21,37,0.92)] border border-[rgba(0,212,255,0.2)] rounded-lg p-2 backdrop-blur-sm">
          <div className="text-[9px] font-mono text-[#556a7a] uppercase tracking-wider mb-1.5">Data Layer</div>
          <div className="flex gap-1">
            {(["SIM", "LIVE"] as const).map(mode => (
              <button key={mode}
                onClick={() => setDataSource(mode)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                  dataSource === mode
                    ? "bg-[#00d4ff] text-[#0a1220]"
                    : "border border-[rgba(0,212,255,0.2)] text-[#556a7a] hover:text-[#c8d8e8]"
                }`}>
                {mode}
              </button>
            ))}
          </div>

          {dataSource === "LIVE" && (
            <div className="mt-1.5">
              <div className="flex items-center gap-1 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4488ff]" />
                <span className="text-[9px] font-mono text-[#4488ff]">{liveAircraft.length} aircraft{fetchError === "sim" ? " (sim)" : ""}</span>
              </div>
              {ukraineAlerts.length > 0 && (
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ff2200]" />
                  <span className="text-[9px] font-mono text-[#ff6644]">{ukraineAlerts.length} UA alerts</span>
                </div>
              )}
              <div className="text-[8px] text-[#334455] font-mono mt-0.5">
                {lastFetch ? `updated ${lastFetch}` : 'fetching...'}
              </div>
              {fetchError && fetchError !== "sim" && (
                <div className="text-[8px] text-[#ff6666] font-mono mt-0.5 max-w-[120px] truncate" title={fetchError}>
                  ⚠ {fetchError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-[rgba(10,21,37,0.92)] border border-[rgba(0,212,255,0.1)] rounded-lg p-2 backdrop-blur-sm">
          <div className="text-[9px] font-mono text-[#556a7a] uppercase tracking-wider mb-1">Legend</div>
          {[
            { color: "#00e676", label: "Sentinel Node" },
            { color: "#ff4444", label: "Terminal threat" },
            { color: "#ffaa00", label: "Approach" },
            { color: "#4488ff", label: "Live aircraft" },
            { color: "#ff2200", label: "UA air-raid zone" },
            { color: "#00d4ff", label: "Airport zone" },
            { color: "#ff4444", label: "Nuclear zone" },
            { color: "#ffaa00", label: "Military zone" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 mb-0.5">
              <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              <span className="text-[9px] font-mono text-[#556a7a]">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {dataSource === "LIVE" && (
        <div className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 px-2 py-1 rounded-full bg-[rgba(68,136,255,0.15)] border border-[#4488ff55] backdrop-blur-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-[#4488ff]" style={{ animation: 'blink 1s infinite' }} />
          <span className="font-mono text-[10px] font-bold text-[#4488ff] tracking-wider">LIVE FEEDS ACTIVE</span>
        </div>
      )}
    </div>
  );
}
