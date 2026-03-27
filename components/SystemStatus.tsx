"use client";
import { SENTINEL_NODES, DRONE_META } from "@/lib/simulation";

export default function SystemStatus() {
  return (
    <div className="h-full overflow-y-auto px-6 py-5 grid-bg">
      <div className="max-w-4xl mx-auto">
        <div className="text-[10px] font-semibold tracking-[3px] uppercase text-[#00d4ff] mb-1">System Status</div>
        <div className="text-2xl font-bold text-[#e8f4ff] mb-6">APEX-SENTINEL — Node & Module Health</div>

        {/* Node grid */}
        <div className="mb-6">
          <div className="text-[10px] font-semibold tracking-[2px] uppercase text-[#7a9ab8] mb-3">Sentinel Nodes</div>
          <div className="grid grid-cols-5 gap-3">
            {SENTINEL_NODES.map(node => (
              <div key={node.id} className={`bg-[#0f2035] rounded-lg p-3 border ${node.online ? 'border-[rgba(0,230,118,0.2)]' : 'border-[rgba(255,68,68,0.2)] opacity-60'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${node.online ? 'bg-[#00e676]' : 'bg-[#ff4444]'}`}
                    style={node.online ? {boxShadow:'0 0 6px #00e676', animation:'blink 2s infinite'} : {}}/>
                  <span className="font-mono text-[10px] text-[#00d4ff] font-bold">{node.id}</span>
                </div>
                <div className="text-[11px] text-[#e8f4ff] font-medium mb-1">{node.label}</div>
                <div className="text-[9px] text-[#556a7a]">{node.online ? 'ONLINE' : 'OFFLINE'}</div>
                <div className="font-mono text-[13px] text-[#00d4ff] font-bold mt-1">{node.detections}</div>
                <div className="text-[9px] text-[#556a7a]">detections</div>
              </div>
            ))}
          </div>
        </div>

        {/* Drone profiles */}
        <div className="mb-6">
          <div className="text-[10px] font-semibold tracking-[2px] uppercase text-[#7a9ab8] mb-3">Acoustic Profile Library — 7 Profiles</div>
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(DRONE_META).map(([cls, meta]) => (
              <div key={cls} className="bg-[#0f2035] border border-[rgba(0,212,255,0.1)] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{background:meta.color, boxShadow:`0 0 6px ${meta.color}`}}/>
                  <span className="font-mono text-[10px] text-[#e8f4ff] font-bold">{cls.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 text-[10px]">
                  <span className="text-[#556a7a]">Engine</span>
                  <span className="text-[#ffaa00] capitalize">{meta.engineType}</span>
                  <span className="text-[#556a7a]">Freq</span>
                  <span className="font-mono text-[#00d4ff]">{meta.freqHz[0]}–{meta.freqHz[1]}Hz</span>
                  <span className="text-[#556a7a]">Speed</span>
                  <span className="font-mono text-[#c8d8e8]">{meta.speedKmh}km/h</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coverage breakdown */}
        <div>
          <div className="text-[10px] font-semibold tracking-[2px] uppercase text-[#7a9ab8] mb-3">Coverage by Module Layer</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { layer: 'acoustic',    stmt: 94.6,  branch: 85.0  },
              { layer: 'detection',   stmt: 100,   branch: 100   },
              { layer: 'fusion',      stmt: 99.0,  branch: 92.1  },
              { layer: 'ml',          stmt: 98.5,  branch: 94.4  },
              { layer: 'output',      stmt: 93.6,  branch: 90.1  },
              { layer: 'prediction',  stmt: 95.6,  branch: 82.8  },
              { layer: 'relay',       stmt: 91.4,  branch: 96.2  },
              { layer: 'privacy',     stmt: 100,   branch: 100   },
            ].map(m => (
              <div key={m.layer} className="bg-[#0f2035] border border-[rgba(0,212,255,0.1)] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] text-[#e8f4ff]">{m.layer}/</span>
                  <span className="text-[10px] text-[#00e676] font-mono">{m.stmt}%</span>
                </div>
                <div className="h-1.5 bg-[#0a1525] rounded-full overflow-hidden mb-1">
                  <div className="h-full rounded-full" style={{width:`${m.stmt}%`, background: m.stmt >= 95 ? '#00e676' : '#00d4ff'}}/>
                </div>
                <div className="flex justify-between text-[9px] text-[#556a7a] font-mono">
                  <span>stmt</span>
                  <span>branch {m.branch}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
