"use client";
import { useEffect, useState } from "react";

interface TopBarProps {
  activeCount: number;
  terminalCount: number;
  tab: string;
  onTab: (t: string) => void;
}

interface FeedPing {
  name: string;
  url: string;
  status: 'OK' | 'ERR' | 'LOADING';
  count: number | null;
  detail: string;
}

export default function TopBar({ activeCount, terminalCount, tab, onTab }: TopBarProps) {
  const [time, setTime] = useState("");
  const [feeds, setFeeds] = useState<FeedPing[]>([
    { name: 'OpenSky', url: '/api/opensky', status: 'LOADING', count: null, detail: '' },
    { name: 'NOTAM',   url: '/api/notams',  status: 'LOADING', count: null, detail: '' },
  ]);

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC"), 1000);
    return () => clearInterval(iv);
  }, []);

  // Poll feeds every 30s
  useEffect(() => {
    const poll = async () => {
      const results = await Promise.allSettled([
        fetch('/api/opensky').then(r => r.json()),
        fetch('/api/notams').then(r => r.json()),
      ]);
      setFeeds([
        {
          name: 'OpenSky',
          url: '/api/opensky',
          status: results[0].status === 'fulfilled' && !(results[0].value as { timedOut?: boolean }).timedOut ? 'OK' : 'ERR',
          count: results[0].status === 'fulfilled' ? (results[0].value as { count: number }).count : null,
          detail: results[0].status === 'fulfilled'
            ? `${(results[0].value as { count: number }).count} aircraft`
            : 'timeout',
        },
        {
          name: 'NOTAM',
          url: '/api/notams',
          status: results[1].status === 'fulfilled' ? 'OK' : 'ERR',
          count: results[1].status === 'fulfilled' ? (results[1].value as { count: number }).count : null,
          detail: results[1].status === 'fulfilled'
            ? `${(results[1].value as { count: number }).count} NOTAMs · ${(results[1].value as { source: string }).source || ''}`
            : 'unavailable',
        },
      ]);
    };
    poll();
    const iv = setInterval(poll, 30000);
    return () => clearInterval(iv);
  }, []);

  const tabs = ["LIVE MAP", "PROTECTED ZONES", "NETWORK COVERAGE", "SYSTEM STATUS"];

  return (
    <div className="flex-shrink-0">
      {/* Main nav bar */}
      <div className="flex items-center h-12 bg-[#0a1525] border-b border-[rgba(0,212,255,0.15)] px-4 gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-2 h-2 rounded-full bg-[#00e676] shadow-[0_0_8px_#00e676]" style={{ animation: 'blink 1s infinite' }} />
          <span className="font-mono font-bold text-[#e8f4ff] tracking-wider">APEX-SENTINEL</span>
          <span className="text-[10px] font-mono text-[#556a7a] ml-1">EU Airspace Security Platform · Romania</span>
        </div>

        {/* Nav tabs */}
        <div className="flex gap-1">
          {tabs.map(t => (
            <button key={t} onClick={() => onTab(t)}
              className={`px-3 py-1 text-[10px] font-semibold tracking-widest uppercase rounded-sm transition-all ${
                tab === t
                  ? "bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border border-[rgba(0,212,255,0.3)]"
                  : "text-[#7a9ab8] hover:text-[#c8d8e8] hover:bg-[rgba(255,255,255,0.04)]"
              }`}>{t}</button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Threat counts */}
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-[#7a9ab8]">ACTIVE</span>
            <span className="text-[#e8f4ff] font-bold">{activeCount}</span>
          </div>
          {terminalCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[rgba(255,68,68,0.15)] border border-[rgba(255,68,68,0.4)]" style={{ animation: 'blink 0.8s infinite' }}>
              <span className="text-[#ff4444]">TERMINAL</span>
              <span className="text-[#ff4444] font-bold">{terminalCount}</span>
            </div>
          )}
          <div className="text-[#7a9ab8] border-l border-[rgba(0,212,255,0.15)] pl-4">{time}</div>
        </div>
      </div>

      {/* Live feed status strip */}
      <div className="flex items-center h-6 bg-[#060f1a] border-b border-[rgba(0,212,255,0.06)] px-4 gap-4">
        <span className="text-[8px] font-mono text-[#334455] uppercase tracking-widest mr-1">LIVE FEEDS</span>
        {feeds.map(f => {
          const color = f.status === 'OK' ? '#00e676' : f.status === 'ERR' ? '#ff4444' : '#556a7a';
          return (
            <div key={f.name} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full"
                style={{ background: color, boxShadow: f.status === 'OK' ? `0 0 4px ${color}` : 'none', animation: f.status === 'LOADING' ? 'blink 1s infinite' : 'none' }} />
              <span className="text-[9px] font-mono" style={{ color }}>
                {f.name}
              </span>
              <span className="text-[9px] font-mono text-[#334455]">
                {f.status === 'LOADING' ? '...' : f.detail}
              </span>
            </div>
          );
        })}
        <div className="ml-auto text-[8px] font-mono text-[#1a2a3a]">FIR LRBB · Romania AOR</div>
      </div>
    </div>
  );
}
