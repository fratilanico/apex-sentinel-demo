"use client";
import { useEffect, useState } from "react";
import { SENTINEL_NODES, DRONE_META } from "@/lib/simulation";

interface FeedStatus {
  name: string;
  url: string;
  status: 'OK' | 'WARN' | 'ERR' | 'PENDING';
  lastUpdated: string;
  detail: string;
  badge: string;
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

export default function NetworkCoveragePanel() {
  const [feeds, setFeeds] = useState<FeedStatus[]>([
    { name: 'OpenSky ADS-B',       url: '/api/opensky',         status: 'PENDING', lastUpdated: '—', detail: 'Romania bbox',         badge: 'ADS-B' },
    { name: 'adsb.fi ADS-B',       url: '/api/adsb-fi',         status: 'PENDING', lastUpdated: '—', detail: 'Backup aircraft feed',  badge: 'ADS-B' },
    { name: 'FAA NOTAM API',        url: '/api/notams',          status: 'PENDING', lastUpdated: '—', detail: 'FIR LRBB',             badge: 'NOTAM' },
    { name: 'Security Events',      url: '/api/security-events', status: 'PENDING', lastUpdated: '—', detail: 'ACLED/GDELT',          badge: 'SIGINT' },
    { name: 'UA Air Raid Alerts',   url: '/api/alerts',          status: 'PENDING', lastUpdated: '—', detail: 'alerts.in.ua',         badge: 'THREAT' },
    { name: 'Open-Meteo Weather',   url: '/api/weather',         status: 'PENDING', lastUpdated: '—', detail: 'Airspace conditions',  badge: 'MET' },
    { name: 'EASA UAS Zones',       url: '/api/easa-zones',      status: 'PENDING', lastUpdated: '—', detail: 'EU 2021/664 Romania',  badge: 'EASA' },
    { name: 'OpenSky OAuth Token',  url: '/api/opensky-token',   status: 'PENDING', lastUpdated: '—', detail: 'Auth service',         badge: 'AUTH' },
  ]);

  const [weather, setWeather] = useState<WeatherStation[]>([]);
  const [totalTracks] = useState(0);

  useEffect(() => {
    const checkFeed = async (idx: number, url: string) => {
      const start = Date.now();
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
        const data = await res.json();
        const ms = Date.now() - start;
        setFeeds(prev => prev.map((f, i) => i !== idx ? f : {
          ...f,
          status: res.ok ? 'OK' : 'WARN',
          lastUpdated: new Date().toLocaleTimeString(),
          detail: (() => {
            if (url === '/api/opensky')        return `${data.count ?? 0} aircraft · ${data.source ?? ''} · ${ms}ms`;
            if (url === '/api/adsb-fi')        return `${data.count ?? 0} aircraft · ${ms}ms`;
            if (url === '/api/notams')         return `${data.count ?? 0} NOTAMs · FIR LRBB · ${ms}ms`;
            if (url === '/api/security-events')return `${data.count ?? 0} events · ${data.source ?? ''} · ${ms}ms`;
            if (url === '/api/alerts')         return `${data.count ?? 0} active alerts · ${data.source ?? ''} · ${ms}ms`;
            if (url === '/api/weather')        return `${data.count ?? 0} stations · ${data.source ?? ''} · ${ms}ms`;
            if (url === '/api/easa-zones')     return `${data.count ?? 0} zones · ${data.regulation?.slice(0,10) ?? ''} · ${ms}ms`;
            if (url === '/api/opensky-token')  return data.token ? `Token active · ${ms}ms` : `No credentials · ${ms}ms`;
            return `${ms}ms`;
          })(),
        }));

        // Pull weather detail
        if (url === '/api/weather' && res.ok) {
          setWeather(data.stations || []);
        }
      } catch {
        setFeeds(prev => prev.map((f, i) => i !== idx ? f : {
          ...f,
          status: 'ERR',
          lastUpdated: new Date().toLocaleTimeString(),
          detail: 'Timeout / unreachable',
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
  const liveFeedsOk = feeds.filter(f => f.status === 'OK').length;

  const STATUS_COLOR = { OK: '#00e676', WARN: '#ffaa00', ERR: '#ff4444', PENDING: '#556a7a' };
  const BADGE_COLOR: Record<string, string> = {
    'ADS-B': '#00d4ff', 'NOTAM': '#ffaa00', 'SIGINT': '#ff6b6b', 'THREAT': '#ff4444',
    'MET': '#7bed9f', 'EASA': '#a29bfe', 'AUTH': '#74b9ff',
  };

  const windDirLabel = (deg?: number) => {
    if (deg == null) return '—';
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    return dirs[Math.round(deg / 45) % 8];
  };

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="max-w-4xl mx-auto">
        <div className="text-[10px] font-semibold tracking-[3px] uppercase text-[#00d4ff] mb-1">Network Coverage</div>
        <div className="text-2xl font-bold text-[#e8f4ff] mb-6">Sensor Network & Intelligence Feeds</div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Nodes Online',    value: `${onlineNodes.length}/${SENTINEL_NODES.length}`, color: '#00e676' },
            { label: 'Coverage Est.',   value: `${coveragePercent}%`,                            color: '#00d4ff' },
            { label: 'Total Detections',value: totalDetections.toString(),                       color: '#ffaa00' },
            { label: 'Live Feeds OK',   value: `${liveFeedsOk}/${feeds.length}`,                 color: liveFeedsOk >= 6 ? '#00e676' : '#ffaa00' },
          ].map(s => (
            <div key={s.label} className="bg-[#0f2035] border border-[rgba(0,212,255,0.1)] rounded-lg p-3 text-center">
              <div className="font-mono text-[22px] font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[9px] text-[#556a7a] uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Intelligence Feed Health — 8 sources */}
        <div className="mb-6">
          <div className="text-[10px] font-semibold tracking-[2px] uppercase text-[#7a9ab8] mb-3">
            Live Intelligence Feeds — {feeds.length} Sources
          </div>
          <div className="grid grid-cols-2 gap-2">
            {feeds.map(feed => (
              <div key={feed.name} className="bg-[#0f2035] border border-[rgba(0,212,255,0.1)] rounded-lg p-3 flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
                  style={{ background: STATUS_COLOR[feed.status], boxShadow: `0 0 6px ${STATUS_COLOR[feed.status]}` }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-mono text-[11px] text-[#e8f4ff] font-bold">{feed.name}</span>
                    <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded"
                      style={{ background: `${BADGE_COLOR[feed.badge] ?? '#556a7a'}22`, color: BADGE_COLOR[feed.badge] ?? '#556a7a' }}>
                      {feed.badge}
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded"
                      style={{ background: `${STATUS_COLOR[feed.status]}22`, color: STATUS_COLOR[feed.status] }}>
                      {feed.status}
                    </span>
                  </div>
                  <div className="text-[9px] text-[#556a7a] font-mono truncate">{feed.detail}</div>
                </div>
                <div className="text-[8px] text-[#334455] font-mono flex-shrink-0">{feed.lastUpdated}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Airspace Weather Conditions */}
        {weather.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] font-semibold tracking-[2px] uppercase text-[#7a9ab8] mb-3">
              Airspace Meteorological Conditions — Open-Meteo LIVE
            </div>
            <div className="grid grid-cols-4 gap-2">
              {weather.slice(0, 8).map(w => (
                <div key={w.id} className={`bg-[#0f2035] rounded-lg p-2.5 border ${w.vfrOk ? 'border-[rgba(0,230,118,0.2)]' : 'border-[rgba(255,170,0,0.2)]'}`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${w.vfrOk ? 'bg-[#00e676]' : 'bg-[#ffaa00]'}`} />
                    <span className="font-mono text-[9px] text-[#00d4ff] font-bold">{w.id}</span>
                  </div>
                  <div className="text-[10px] text-[#e8f4ff] font-medium mb-1 leading-tight">{w.name}</div>
                  <div className="grid grid-cols-2 gap-x-2 text-[9px]">
                    <div><span className="text-[#556a7a]">Wind</span><br />
                      <span className="font-mono text-[#00d4ff]">{w.windSpeed?.toFixed(1) ?? '—'}m/s {windDirLabel(w.windDir)}</span>
                    </div>
                    <div><span className="text-[#556a7a]">Vis</span><br />
                      <span className={`font-mono ${(w.visibility ?? 0) >= 5000 ? 'text-[#00e676]' : 'text-[#ffaa00]'}`}>
                        {w.visibility != null ? `${(w.visibility / 1000).toFixed(0)}km` : '—'}
                      </span>
                    </div>
                    <div><span className="text-[#556a7a]">Temp</span><br />
                      <span className="font-mono text-[#c8d8e8]">{w.temp?.toFixed(0) ?? '—'}°C</span>
                    </div>
                    <div><span className="text-[#556a7a]">Cloud</span><br />
                      <span className={`font-mono ${(w.cloudCover ?? 0) < 50 ? 'text-[#00e676]' : 'text-[#ffaa00]'}`}>
                        {w.cloudCover ?? '—'}%
                      </span>
                    </div>
                  </div>
                  <div className={`text-[8px] font-mono font-bold mt-1.5 ${w.vfrOk ? 'text-[#00e676]' : 'text-[#ffaa00]'}`}>
                    {w.vfrOk ? 'VFR OK' : 'VFR MARGINAL'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sensor nodes */}
        <div className="mb-6">
          <div className="text-[10px] font-semibold tracking-[2px] uppercase text-[#7a9ab8] mb-3">Acoustic Sentinel Nodes — Romania</div>
          <div className="grid grid-cols-4 gap-3">
            {SENTINEL_NODES.map(node => (
              <div key={node.id} className={`bg-[#0f2035] rounded-lg p-3 border ${node.online ? 'border-[rgba(0,230,118,0.2)]' : 'border-[rgba(255,68,68,0.2)] opacity-60'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${node.online ? 'bg-[#00e676]' : 'bg-[#ff4444]'}`}
                    style={node.online ? { boxShadow: '0 0 6px #00e676', animation: 'blink 2s infinite' } : {}} />
                  <span className="font-mono text-[10px] text-[#00d4ff] font-bold">{node.id}</span>
                </div>
                <div className="text-[11px] text-[#e8f4ff] font-medium mb-1">{node.label}</div>
                <div className="text-[9px] text-[#556a7a]">{node.online ? 'ONLINE' : 'OFFLINE'}</div>
                <div className="font-mono text-[13px] text-[#00d4ff] font-bold mt-1">{node.detections}</div>
                <div className="text-[9px] text-[#556a7a]">detections</div>
                <div className="text-[8px] font-mono text-[#334455] mt-1">{node.lat.toFixed(2)}°N {node.lon.toFixed(2)}°E</div>
              </div>
            ))}
          </div>
        </div>

        {/* EU UAS Classification Library */}
        <div>
          <div className="text-[10px] font-semibold tracking-[2px] uppercase text-[#7a9ab8] mb-3">EU UAS Classification Library — EASA Cat A–D</div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(DRONE_META).map(([cls, meta]) => (
              <div key={cls} className="bg-[#0f2035] border border-[rgba(0,212,255,0.1)] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
                  <span className="font-mono text-[10px] text-[#e8f4ff] font-bold">{cls.toUpperCase()}</span>
                  <span className="text-[10px] text-[#556a7a]">{meta.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-x-3 text-[10px]">
                  <div><span className="text-[#556a7a]">Engine</span><br /><span className="text-[#ffaa00] capitalize font-mono">{meta.engineType}</span></div>
                  <div><span className="text-[#556a7a]">Freq</span><br /><span className="font-mono text-[#00d4ff]">{meta.freqHz[0]}–{meta.freqHz[1]}Hz</span></div>
                  <div><span className="text-[#556a7a]">Speed</span><br /><span className="font-mono text-[#c8d8e8]">{meta.speedKmh}km/h</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
