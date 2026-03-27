"use client";
import { DroneTrack, DRONE_META, formatTt } from "@/lib/simulation";

interface Props { tracks: DroneTrack[]; selected: string|null; onSelect: (id: string) => void; }

const PHASE_COLOR: Record<string, string> = {
  CRUISE:      "text-[#7a9ab8]",
  APPROACH:    "text-[#ffaa00]",
  TERMINAL:    "text-[#ff4444]",
  NEUTRALISED: "text-[#00e676]",
  MISSED:      "text-[#555]",
};
const PHASE_BG: Record<string, string> = {
  CRUISE:      "",
  APPROACH:    "bg-[rgba(255,170,0,0.05)]",
  TERMINAL:    "bg-[rgba(255,68,68,0.08)]",
  NEUTRALISED: "bg-[rgba(0,230,118,0.05)]",
  MISSED:      "opacity-40",
};

export default function TrackList({ tracks, selected, onSelect }: Props) {
  const active = tracks.filter(t => t.phase !== 'NEUTRALISED' && t.phase !== 'MISSED');
  const done   = tracks.filter(t => t.phase === 'NEUTRALISED' || t.phase === 'MISSED');

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-[rgba(0,212,255,0.1)] flex items-center gap-2">
        <span className="text-[10px] font-semibold tracking-[2px] uppercase text-[#7a9ab8]">Active Tracks</span>
        <div className="ml-auto text-[10px] font-mono text-[#00d4ff] font-bold">{active.length}</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {active.map(t => {
          const meta = DRONE_META[t.droneClass];
          return (
            <div key={t.id}
              onClick={() => onSelect(t.id)}
              className={`px-3 py-2 cursor-pointer border-b border-[rgba(0,212,255,0.05)] transition-all hover:bg-[rgba(0,212,255,0.05)] ${PHASE_BG[t.phase]} ${selected===t.id ? 'border-l-2 border-l-[#00d4ff]' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background: meta.color, boxShadow:`0 0 6px ${meta.color}`}}/>
                  <span className="font-mono text-[11px] text-[#e8f4ff] font-semibold">{t.id}</span>
                </div>
                <span className={`text-[10px] font-semibold font-mono ${PHASE_COLOR[t.phase]}`}>{t.phase}</span>
              </div>
              <div className="flex items-center justify-between mt-1 text-[10px] text-[#7a9ab8]">
                <span>{t.droneClass.toUpperCase()}</span>
                <span className="font-mono">{(t.confidence*100).toFixed(0)}%</span>
                <span className="font-mono">{formatTt(t.ttImpact)}</span>
              </div>
              <div className="flex gap-2 mt-0.5 text-[9px] text-[#556a7a] font-mono">
                <span>{t.freqHz[0]}–{t.freqHz[1]}Hz</span>
                {t.elrsDetected && <span className="text-[#ffaa00]">ELRS</span>}
                {t.rfSilent && <span className="text-[#ff8888]">RF-SIL</span>}
              </div>
            </div>
          );
        })}
        {done.length > 0 && (
          <div className="px-3 py-1.5 border-t border-[rgba(0,212,255,0.1)] mt-1">
            <div className="text-[9px] font-semibold tracking-widest text-[#556a7a] uppercase mb-1">Resolved</div>
            {done.slice(-5).map(t => (
              <div key={t.id} className="flex items-center justify-between py-0.5 text-[10px] opacity-50">
                <span className="font-mono text-[#7a9ab8]">{t.id}</span>
                <span className={PHASE_COLOR[t.phase]}>{t.phase}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
