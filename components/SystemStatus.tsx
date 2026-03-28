"use client";
import { SENTINEL_NODES, DRONE_META } from "@/lib/simulation";

const DRONE_PLAIN: Record<string, { name: string; who: string; risk: string }> = {
  "cat-a-commercial": {
    name: "Commercial / Hobby Drone",
    who: "Registered consumer drones — DJI Phantom, Mavic class. Low risk under normal conditions.",
    risk: "Low",
  },
  "cat-b-modified": {
    name: "Modified Drone",
    who: "Consumer drone with aftermarket parts — extended range or payload capability. Elevated risk.",
    risk: "Medium",
  },
  "cat-c-surveillance": {
    name: "Surveillance UAS",
    who: "Purpose-built surveillance platform. Extended loiter time, optical/thermal payload. High risk near restricted zones.",
    risk: "High",
  },
  "cat-d-unknown": {
    name: "Unknown / Unclassified",
    who: "RF-silent or spoofed signature. Cannot be classified by standard means. Treated as highest priority threat.",
    risk: "Critical",
  },
};

const RISK_COLOR: Record<string, string> = {
  Low: "#00e676", Medium: "#ffaa00", High: "#ff6b00", Critical: "#ff4444",
};

const MODULE_PLAIN: Record<string, { label: string; explain: string }> = {
  acoustic:   { label: "Sound Detection",       explain: "Microphone array picks up drone rotor/motor signatures" },
  detection:  { label: "Threat Classification", explain: "AI matches signature against known drone profiles" },
  fusion:     { label: "Multi-sensor Fusion",   explain: "Combines acoustic + RF + ADS-B data into single track" },
  ml:         { label: "Machine Learning",      explain: "Neural model scores threat probability in real time" },
  output:     { label: "Alert Dispatch",        explain: "Pushes confirmed threats to operators and external systems" },
  prediction: { label: "Flight Path Prediction",explain: "Estimates trajectory and time-to-impact for each contact" },
  relay:      { label: "Node Relay Network",    explain: "Passes detections between sensor nodes for triangulation" },
  privacy:    { label: "Data Privacy Layer",    explain: "GDPR / EU AI Act compliance — anonymises non-threat data" },
};

const HEALTH = [
  { layer: "acoustic",   pct: 94.6 },
  { layer: "detection",  pct: 100  },
  { layer: "fusion",     pct: 99.0 },
  { layer: "ml",         pct: 98.5 },
  { layer: "output",     pct: 93.6 },
  { layer: "prediction", pct: 95.6 },
  { layer: "relay",      pct: 91.4 },
  { layer: "privacy",    pct: 100  },
];

export default function SystemStatus() {
  const onlineCount = SENTINEL_NODES.filter(n => n.online).length;
  const totalDetections = SENTINEL_NODES.reduce((a, n) => a + n.detections, 0);

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="max-w-4xl mx-auto">

        {/* Intro */}
        <div className="text-[10px] font-semibold tracking-[3px] uppercase text-[#00d4ff] mb-1">System Status</div>
        <div className="text-2xl font-bold text-[#e8f4ff] mb-2">How APEX SENTINEL Works</div>
        <div className="text-[13px] text-[#7a9ab8] leading-relaxed mb-6 max-w-2xl">
          SENTINEL is a network of acoustic and radio-frequency sensors deployed across Romania.
          Each sensor listens for drone sounds and electromagnetic signatures, classifies what it hears using
          AI, and triggers an alert within 150 milliseconds. Here is the current health of the system.
        </div>

        {/* Sensor node grid */}
        <div className="mb-8">
          <div className="text-[11px] font-semibold tracking-[2px] uppercase text-[#7a9ab8] mb-1">
            Sensor Nodes — {onlineCount}/{SENTINEL_NODES.length} Online
          </div>
          <div className="text-[11px] text-[#556a7a] mb-3">
            Each node is a physical detection unit installed at a strategic location across Romania.
            Green = transmitting live data. Red = offline or unreachable.
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {SENTINEL_NODES.map(node => (
              <div key={node.id}
                className={`bg-[#0f2035] rounded-lg p-3 border ${node.online ? "border-[rgba(0,230,118,0.2)]" : "border-[rgba(255,68,68,0.2)] opacity-60"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${node.online ? "bg-[#00e676]" : "bg-[#ff4444]"}`}
                    style={node.online ? { boxShadow: "0 0 6px #00e676", animation: "blink 2s infinite" } : {}} />
                  <span className="font-mono text-[10px] text-[#00d4ff] font-bold">{node.id}</span>
                </div>
                <div className="text-[12px] text-[#e8f4ff] font-medium mb-1 leading-tight">{node.label}</div>
                <div className="text-[9px] mb-1" style={{ color: node.online ? "#00e676" : "#ff4444" }}>
                  {node.online ? "● ONLINE — transmitting" : "● OFFLINE"}
                </div>
                <div className="font-mono text-[15px] text-[#00d4ff] font-bold">{node.detections}</div>
                <div className="text-[9px] text-[#556a7a]">threats detected this session</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-[#334455] font-mono">
            Total detections across all nodes: {totalDetections}
          </div>
        </div>

        {/* Drone classification */}
        <div className="mb-8">
          <div className="text-[11px] font-semibold tracking-[2px] uppercase text-[#7a9ab8] mb-1">
            Drone Classification — EU EASA Categories
          </div>
          <div className="text-[11px] text-[#556a7a] mb-3">
            SENTINEL classifies every detected drone into one of four categories defined by European aviation authority EASA.
            Classification happens automatically based on acoustic frequency, speed, and RF behaviour.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(DRONE_META).map(([cls, meta]) => {
              const plain = DRONE_PLAIN[cls];
              const risk = plain?.risk ?? "Unknown";
              return (
                <div key={cls} className="bg-[#0f2035] border border-[rgba(0,212,255,0.1)] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
                      <span className="font-bold text-[#e8f4ff] text-[13px]">{plain?.name ?? cls}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{ background: `${RISK_COLOR[risk]}18`, color: RISK_COLOR[risk], border: `1px solid ${RISK_COLOR[risk]}44` }}>
                      {risk} Risk
                    </span>
                  </div>
                  <div className="text-[11px] text-[#7a9ab8] leading-snug mb-3">{plain?.who}</div>
                  <div className="flex gap-4 text-[10px] font-mono text-[#556a7a]">
                    <span>Sound: {meta.freqHz[0]}–{meta.freqHz[1]} Hz</span>
                    <span>Speed: up to {meta.speedKmh} km/h</span>
                    <span className="capitalize">{meta.engineType} engine</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System health */}
        <div>
          <div className="text-[11px] font-semibold tracking-[2px] uppercase text-[#7a9ab8] mb-1">
            Detection Pipeline — System Health
          </div>
          <div className="text-[11px] text-[#556a7a] mb-3">
            SENTINEL processes drone detections through 8 specialised modules.
            Each bar shows what percentage of that module is operational and validated.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {HEALTH.map(m => {
              const info = MODULE_PLAIN[m.layer] ?? { label: m.layer, explain: "" };
              const color = m.pct >= 99 ? "#00e676" : m.pct >= 90 ? "#00d4ff" : "#ffaa00";
              return (
                <div key={m.layer} className="bg-[#0f2035] border border-[rgba(0,212,255,0.1)] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#e8f4ff] text-[12px]">{info.label}</span>
                    <span className="font-mono text-[11px] font-bold" style={{ color }}>{m.pct}%</span>
                  </div>
                  <div className="text-[10px] text-[#556a7a] mb-2">{info.explain}</div>
                  <div className="h-1.5 bg-[#0a1525] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${m.pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
