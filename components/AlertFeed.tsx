"use client";
import { Alert } from "@/lib/simulation";

interface Props { alerts: Alert[]; }

const SEV_COLOR = {
  TERMINAL: "text-[#ff4444] border-[#ff4444]",
  WARNING:  "text-[#ffaa00] border-[#ffaa00]",
  INFO:     "text-[#00d4ff] border-[#00d4ff]",
};
const SEV_BG = {
  TERMINAL: "bg-[rgba(255,68,68,0.08)]",
  WARNING:  "bg-[rgba(255,170,0,0.06)]",
  INFO:     "bg-[rgba(0,212,255,0.05)]",
};

export default function AlertFeed({ alerts }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-[rgba(0,212,255,0.1)] flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#ff4444]" style={{animation:'blink 1s infinite'}}/>
        <span className="text-[10px] font-semibold tracking-[2px] uppercase text-[#7a9ab8]">Alert Feed</span>
        <div className="ml-auto text-[10px] font-mono text-[#7a9ab8]">{alerts.length}</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {alerts.slice().reverse().map((a, i) => (
          <div key={a.id}
            className={`px-3 py-2 border-l-2 mb-px text-[11px] fade-in-up ${SEV_COLOR[a.severity]} ${SEV_BG[a.severity]}`}
            style={{animationDelay:`${i*30}ms`}}>
            <div className="flex items-start gap-1.5">
              <span className="opacity-50 font-mono text-[10px] flex-shrink-0">
                {new Date(a.timestamp).toISOString().slice(11,19)}
              </span>
            </div>
            <div className="mt-0.5 leading-snug">{a.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
