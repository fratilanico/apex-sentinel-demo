"use client";
import { useEffect, useState } from "react";

interface TopBarProps {
  activeCount: number;
  terminalCount: number;
  tab: string;
  onTab: (t: string) => void;
}

export default function TopBar({ activeCount, terminalCount, tab, onTab }: TopBarProps) {
  const [time, setTime] = useState("");
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC"), 1000);
    return () => clearInterval(iv);
  }, []);

  const tabs = ["LIVE MAP", "PROTECTED ZONES", "NETWORK COVERAGE", "SYSTEM STATUS"];

  return (
    <div className="flex items-center h-12 bg-[#0a1525] border-b border-[rgba(0,212,255,0.15)] px-4 gap-6 flex-shrink-0">
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

      {/* spacer */}
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
  );
}
