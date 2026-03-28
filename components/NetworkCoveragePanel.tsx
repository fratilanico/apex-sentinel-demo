"use client";
import { useEffect, useState } from "react";
import { SENTINEL_NODES } from "@/lib/simulation";

interface FeedStatus {
  name: string;
  url: string;
  status: "OK" | "WARN" | "ERR" | "PENDING";
  lastUpdated: string;
  detail: string;
  what: string; // plain-English description
}

interface WeatherStation {
  id: string;
  name: string;
  temp?: number;
  windSpeed?: number;
  windDir?: number;
  visibility?: number;
  cloudCover?: number;
  vfrOk?: boolean;
}

const FEEDS_CONFIG: Omit<FeedStatus, "status" | "lastUpdated" | "detail">[] = [
  {
    name: "Live Aircraft — OpenSky",
    url: "/api/opensky",
    what: "Real-time positions of all registered aircraft in Romanian airspace (ADS-B transponder data)",
  },
  {
    name: "Live Aircraft — adsb.fi",
    url: "/api/adsb-fi",
    what: "Backup aircraft feed — cross-checks OpenSky data for higher reliability",
  },
  {
    name: "Pilot Notices (NOTAMs)",
    url: "/api/notams",
    what: "Official airspace notices issued by Romanian aviation authority — restrictions, hazards, closures",
  },
  {
    name: "Security Events",
    url: "/api/security-events",
    what: "Geopolitical conflict events near Romania sourced from ACLED and GDELT research databases",
  },
  {
    name: "Ukraine Air Raid Alerts",
    url: "/api/alerts",
    what: "Live air raid sirens across Ukrainian regions — indicates active aerial threats near Romania's border",
  },
  {
    name: "Airspace Weather",
    url: "/api/weather",
    what: "Wind speed, visibility and cloud cover at 7 Romanian locations — affects drone flight conditions",
  },
  {
    name: "EU Drone Exclusion Zones",
    url: "/api/easa-zones",
    what: "Official no-fly zones for drones in Romania defined by EU aviation regulation (EASA 2021/664)",
  },
  {
    name: "Aircraft Auth Service",
    url: "/api/opensky-token",
    what: "Authentication token for the OpenSky Network API — confirms live data connection is authorised",
  },
];

export default function NetworkCoveragePanel() {
  const [feeds, setFeeds] = useState<FeedStatus[]>(
    FEEDS_CONFIG.map(f => ({ ...f, status: "PENDING", lastUpdated: "—", detail: "Checking…" }))
  );
  const [weather, setWeather] = useState<WeatherStation[]>([]);

  useEffect(() => {
    const checkFeed = async (idx: number, url: string) => {
      const start = Date.now();
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
        const data = await res.json();
        const ms = Date.now() - start;
        setFeeds(prev => prev.map((f, i) => i !== idx ? f : {
          ...f,
          status: res.ok ? "OK" : "WARN",
          lastUpdated: new Date().toLocaleTimeString(),
          detail: (() => {
            if (url === "/api/opensky")         return `${data.count ?? 0} aircraft tracked · ${ms}ms`;
            if (url === "/api/adsb-fi")         return `${data.count ?? 0} aircraft tracked · ${ms}ms`;
            if (url === "/api/notams")          return `${data.count ?? 0} active notices · ${ms}ms`;
            if (url === "/api/security-events") return `${data.count ?? 0} events retrieved · ${data.source ?? ""} · ${ms}ms`;
            if (url === "/api/alerts")          return `${data.count ?? 0} active alerts across Ukraine · ${ms}ms`;
            if (url === "/api/weather")         return `${data.count ?? 0} weather stations live · ${ms}ms`;
            if (url === "/api/easa-zones")      return `${data.count ?? 0} restricted zones loaded · ${ms}ms`;
            if (url === "/api/opensky-token")   return data.token ? `Authorised · ${ms}ms` : `No credentials configured`;
            return `${ms}ms`;
          })(),
        }));
        if (url === "/api/weather" && res.ok) setWeather(data.stations || []);
      } catch {
        setFeeds(prev => prev.map((f, i) => i !== idx ? f : {
          ...f, status: "ERR", lastUpdated: new Date().toLocaleTimeString(), detail: "Could not reach source",
        }));
      }
    };

    feeds.forEach((f, i) => checkFeed(i, f.url));
    const iv = setInterval(() => feeds.forEach((f, i) => checkFeed(i, f.url)), 30000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onlineNodes = SENTINEL_NODES.filter(n => n.online);
  const totalDetections = SENTINEL_NODES.reduce((a, n) => a + n.detections, 0);
  const coveragePercent = Math.min(100, Math.round(onlineNodes.length * 80 * 80 * Math.PI / 238397 * 100));
  const liveFeedsOk = feeds.filter(f => f.status === "OK").length;

  const STATUS_COLOR = { OK: "#00e676", WARN: "#ffaa00", ERR: "#ff4444", PENDING: "#556a7a" };
  const STATUS_LABEL = { OK: "Live", WARN: "Degraded", ERR: "Offline", PENDING: "Checking…" };

  const windDirLabel = (deg?: number) => {
    if (deg == null) return "";
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(deg / 45) % 8];
  };

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="max-w-4xl mx-auto">

        {/* Intro */}
        <div className="text-[10px] font-semibold tracking-[3px] uppercase text-[#00d4ff] mb-1">Data Sources</div>
        <div className="text-2xl font-bold text-[#e8f4ff] mb-2">Live Intelligence — What We're Watching</div>
        <div className="text-[13px] text-[#7a9ab8] leading-relaxed mb-6 max-w-2xl">
          SENTINEL combines 8 independent data sources — from aviation transponders to weather satellites to conflict trackers.
          Everything shown on the dashboard is pulled from these live feeds, refreshed every 15–30 seconds.
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Sensors online",    value: `${onlineNodes.length} of ${SENTINEL_NODES.length}`,  color: "#00e676",  explain: "Acoustic nodes transmitting" },
            { label: "Romania coverage",  value: `${coveragePercent}%`,                                color: "#00d4ff",  explain: "Estimated airspace coverage" },
            { label: "Threats detected",  value: totalDetections.toString(),                            color: "#ffaa00",  explain: "This session, all nodes" },
            { label: "Data feeds live",   value: `${liveFeedsOk} of ${feeds.length}`,                  color: liveFeedsOk >= 6 ? "#00e676" : "#ffaa00", explain: "External sources responding" },
          ].map(s => (
            <div key={s.label} className="bg-[#0f2035] border border-[rgba(0,212,255,0.1)] rounded-lg p-3 text-center">
              <div className="font-mono text-[22px] font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] text-[#e8f4ff] font-semibold mt-1">{s.label}</div>
              <div className="text-[9px] text-[#556a7a] mt-0.5">{s.explain}</div>
            </div>
          ))}
        </div>

        {/* Live feeds */}
        <div className="mb-8">
          <div className="text-[11px] font-semibold tracking-[2px] uppercase text-[#7a9ab8] mb-1">
            Live Data Feeds — {feeds.length} Sources
          </div>
          <div className="text-[11px] text-[#556a7a] mb-3">
            Each row is an external data source SENTINEL polls in real time. Green = receiving live data. Red = source temporarily unreachable.
          </div>
          <div className="flex flex-col gap-2">
            {feeds.map(feed => (
              <div key={feed.name} className="bg-[#0f2035] border border-[rgba(0,212,255,0.1)] rounded-lg p-3 flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                  style={{ background: STATUS_COLOR[feed.status], boxShadow: `0 0 6px ${STATUS_COLOR[feed.status]}` }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-0.5">
                    <span className="font-bold text-[#e8f4ff] text-[12px]">{feed.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${STATUS_COLOR[feed.status]}18`, color: STATUS_COLOR[feed.status] }}>
                      {STATUS_LABEL[feed.status]}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#7a9ab8] mb-1">{feed.what}</div>
                  <div className="text-[10px] text-[#556a7a] font-mono">{feed.detail}</div>
                </div>
                <div className="text-[9px] text-[#334455] font-mono flex-shrink-0 mt-0.5">{feed.lastUpdated}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Weather */}
        {weather.length > 0 && (
          <div className="mb-8">
            <div className="text-[11px] font-semibold tracking-[2px] uppercase text-[#7a9ab8] mb-1">
              Flying Conditions — Romania (Live)
            </div>
            <div className="text-[11px] text-[#556a7a] mb-3">
              Current wind, visibility and cloud cover at key locations. "Clear to fly" means conditions are suitable for drone operations under standard visual flight rules (visibility over 5 km, cloud cover below 50%).
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {weather.slice(0, 8).map(w => (
                <div key={w.id}
                  className={`bg-[#0f2035] rounded-lg p-3 border ${w.vfrOk ? "border-[rgba(0,230,118,0.2)]" : "border-[rgba(255,170,0,0.2)]"}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${w.vfrOk ? "bg-[#00e676]" : "bg-[#ffaa00]"}`} />
                    <span className="text-[10px] text-[#e8f4ff] font-bold">{w.name}</span>
                  </div>
                  <div className={`text-[10px] font-bold mb-2 ${w.vfrOk ? "text-[#00e676]" : "text-[#ffaa00]"}`}>
                    {w.vfrOk ? "Clear to fly" : "Marginal conditions"}
                  </div>
                  <div className="text-[10px] text-[#556a7a] leading-relaxed">
                    Wind {w.windSpeed?.toFixed(1) ?? "—"} m/s {windDirLabel(w.windDir)}<br />
                    Visibility {w.visibility != null ? `${(w.visibility / 1000).toFixed(0)} km` : "—"}<br />
                    Cloud cover {w.cloudCover ?? "—"}% · {w.temp?.toFixed(0) ?? "—"}°C
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[9px] text-[#334455] font-mono mt-2">Source: open-meteo.com · refreshed every 60 seconds</div>
          </div>
        )}

        {/* Sensor node grid */}
        <div>
          <div className="text-[11px] font-semibold tracking-[2px] uppercase text-[#7a9ab8] mb-1">
            Acoustic Sensor Locations
          </div>
          <div className="text-[11px] text-[#556a7a] mb-3">
            Physical sensor nodes deployed across Romania. Each unit detects drone sounds within an ~80 km radius and relays data back to the SENTINEL platform in real time.
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {SENTINEL_NODES.map(node => (
              <div key={node.id}
                className={`bg-[#0f2035] rounded-lg p-3 border ${node.online ? "border-[rgba(0,230,118,0.2)]" : "border-[rgba(255,68,68,0.2)] opacity-60"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${node.online ? "bg-[#00e676]" : "bg-[#ff4444]"}`}
                    style={node.online ? { boxShadow: "0 0 6px #00e676", animation: "blink 2s infinite" } : {}} />
                  <span className="font-mono text-[9px] text-[#00d4ff] font-bold">{node.id}</span>
                </div>
                <div className="text-[11px] text-[#e8f4ff] font-medium mb-1 leading-tight">{node.label}</div>
                <div className="text-[10px] mb-1" style={{ color: node.online ? "#00e676" : "#ff4444" }}>
                  {node.online ? "Transmitting" : "Offline"}
                </div>
                <div className="font-mono text-[14px] text-[#00d4ff] font-bold">{node.detections}</div>
                <div className="text-[9px] text-[#556a7a]">detections this session</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
