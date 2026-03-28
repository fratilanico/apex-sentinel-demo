"use client";
import { useEffect, useState, useRef } from "react";
import { PROTECTED_ZONES, SENTINEL_NODES, DroneTrack } from "@/lib/simulation";

interface Props { tracks: DroneTrack[] }

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  return Math.sqrt((lat2-lat1)**2 + (lon2-lon1)**2) * 111;
}

const TYPE_LABEL: Record<string,string> = {
  airport: "International Airport", nuclear: "Nuclear Power Station",
  military: "Military / NATO Installation", government: "Government / State Institution",
};
const TYPE_ICON: Record<string,string> = { airport:"✈", nuclear:"☢", military:"⬡", government:"⊕" };
const AWNING_DESC: Record<string,string> = {
  RED:   "Active threat — one or more unidentified drones have breached or are approaching the exclusion perimeter. AWNING protocol engaged.",
  AMBER: "Elevated monitoring — increased UAS activity detected within the extended sensor radius. Operators are tracking contacts.",
  GREEN: "Nominal — no contacts within exclusion boundary. Sensors active and transmitting.",
};
const ZONE_DETAIL: Record<string, { law: string; authority: string; why: string; countermeasure: string }> = {
  "PZ-BUH": { law: "RACR-AD 2010/01 · EU 2021/664", authority: "ROMATSA / RCAA", why: "Henri Coandă handles 14M+ passengers/year. A drone strike on approach path risks mass-casualty collision.", countermeasure: "RF jamming + acoustic intercept + LROP Tower notification" },
  "PZ-CLJ": { law: "RACR-AD 2010/01 · EU 2021/664", authority: "ROMATSA / RCAA", why: "Cluj-Napoca International — primary gateway for Transylvania. Active flight paths to/from Western Europe.", countermeasure: "Acoustic intercept + LRCL Tower alert" },
  "PZ-TSR": { law: "RACR-AD 2010/01 · EU 2021/664", authority: "ROMATSA / RCAA", why: "Timișoara Airport serves cross-border EU routes. Located near Serbian border — elevated smuggling risk.", countermeasure: "RF jamming + cross-border coordination" },
  "PZ-CND": { law: "Law 111/1996 · EURATOM", authority: "CNCAN / SNN / SRI", why: "Cernavodă Nuclear Power Plant generates ~20% of Romania's electricity. Any drone incursion triggers national-level emergency protocol.", countermeasure: "Hard-kill authorised + SRI immediate notification + facility lockdown" },
  "PZ-MKK": { law: "SOFA Agreement · NATO STANAG", authority: "Romanian Air Force / NATO CAOC Torrejón", why: "NATO-designated installation. Houses F-16 fleet and NATO air-policing assets. Breach triggers Alliance Article 3 response.", countermeasure: "Military intercept authorised + NATO notification" },
  "PZ-OTP": { law: "HG 585/2002 · EU 2019/945", authority: "SRI / Jandarmeria Română", why: "Cotroceni Presidential Palace and Parliament. Head-of-state protection zone. Any incursion treated as assassination attempt.", countermeasure: "SRI immediate response + airspace closure" },
  "PZ-DVS": { law: "SOFA Agreement · NATO STANAG 3760", authority: "NATO BMD / MApN", why: "Deveselu hosts the Aegis Ashore missile defence battery — the only US missile shield in Eastern Europe. Critical Alliance asset.", countermeasure: "Hard-kill authorised + EUCOM notification + classified response protocol" },
};

// Sparkline-style mini detection history (simulated per zone)
function DetectionBar({ count, max }: { count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="h-1 bg-[#0a1525] rounded-full overflow-hidden w-full">
      <div className="h-full rounded-full bg-[#00d4ff] transition-all duration-1000" style={{ width: `${pct}%` }} />
    </div>
  );
}

function CountUp({ target, color }: { target: number; color: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    if (target === 0) return;
    let cur = 0;
    const step = Math.ceil(target / 20);
    const iv = setInterval(() => {
      cur = Math.min(cur + step, target);
      setVal(cur);
      if (cur >= target) clearInterval(iv);
    }, 40);
    return () => clearInterval(iv);
  }, [target]);
  return <span style={{ color }} className="font-mono text-[16px] font-bold">{val}</span>;
}

export default function ProtectedZonesPanel({ tracks }: Props) {
  const [notamCounts, setNotamCounts] = useState<Record<string,number>>({});
  const [notamSource, setNotamSource] = useState("");
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch("/api/notams").then(r=>r.json()).then(d => {
      const counts: Record<string,number> = {};
      (d.notams||[]).forEach((n:{icaoLocation:string}) => { counts[n.icaoLocation] = (counts[n.icaoLocation]||0)+1; });
      setNotamCounts(counts);
      setNotamSource(d.source||"");
    }).catch(()=>{});
  }, []);

  const activeTracks = tracks.filter(t => t.phase !== "NEUTRALISED" && t.phase !== "MISSED");
  const ICAO_MAP: Record<string,string> = { LROP:"PZ-BUH", LRCL:"PZ-CLJ", LRTR:"PZ-TSR", LRBS:"PZ-OTP", LRTM:"PZ-TSR" };
  const notamByZone: Record<string,number> = {};
  Object.entries(notamCounts).forEach(([icao,c]) => { const z=ICAO_MAP[icao]; if(z) notamByZone[z]=(notamByZone[z]||0)+c; });

  const maxDetections = Math.max(...PROTECTED_ZONES.map(z => tracks.filter(t=>t.targetZoneId===z.id).length), 1);
  const onlineNodes = SENTINEL_NODES.filter(n=>n.online).length;

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="max-w-4xl mx-auto">
        <div className="text-[10px] font-semibold tracking-[3px] uppercase text-[#00d4ff] mb-1">Protected Zones</div>
        <div className="text-2xl font-bold text-[#e8f4ff] mb-2">Romania — Restricted Airspace</div>
        <div className="text-[13px] text-[#7a9ab8] leading-relaxed mb-2 max-w-2xl">
          These are locations in Romania where drone flight is legally prohibited or restricted under EU and national aviation law.
          INDIGO SENTINEL monitors each zone in real time.{" "}
          <span className="text-[#00d4ff]">Click any zone for full detail.</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-[#334455] mb-6">
          <span>{PROTECTED_ZONES.length} monitored zones</span>
          <span>·</span><span>{onlineNodes} active sensors</span>
          <span>·</span><span>Flight info region: Bucharest (LRBB)</span>
          {notamSource && <><span>·</span><span>Notices: {notamSource}</span></>}
        </div>

        {/* Alert level legend */}
        <div className="flex gap-4 mb-5 flex-wrap">
          {[{l:"RED",c:"#ff4444",t:"High Alert"},{l:"AMBER",c:"#ffaa00",t:"Elevated"},{l:"GREEN",c:"#00e676",t:"Nominal"}].map(x=>(
            <div key={x.l} className="flex items-center gap-1.5 text-[10px]">
              <div className="w-2 h-2 rounded-full" style={{background:x.c}}/>
              <span style={{color:x.c}} className="font-bold">{x.l}</span>
              <span className="text-[#556a7a]">— {x.t}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {PROTECTED_ZONES.map((zone, idx) => {
            let closestDist = Infinity, closestId = "";
            activeTracks.forEach(t => {
              const d = distanceKm(t.lat,t.lon,zone.lat,zone.lon);
              if (d < closestDist) { closestDist=d; closestId=t.id; }
            });
            const dronesTargeting = tracks.filter(t=>t.targetZoneId===zone.id).length;
            const notams = notamByZone[zone.id]||0;
            const awningColor = zone.awning==="GREEN"?"#00e676":zone.awning==="AMBER"?"#ffaa00":"#ff4444";
            const typeColor = zone.type==="nuclear"?"#ff4444":zone.type==="military"?"#ffaa00":"#00d4ff";
            const borderCls = zone.type==="nuclear"?"border-[rgba(255,68,68,0.3)]":zone.type==="military"?"border-[rgba(255,170,0,0.25)]":"border-[rgba(0,212,255,0.15)]";
            const isSelected = selectedId === zone.id;
            const detail = ZONE_DETAIL[zone.id];

            return (
              <div key={zone.id}
                className={`bg-[#0f2035] rounded-lg border ${borderCls} transition-all duration-300 ${mounted?"opacity-100 translate-y-0":"opacity-0 translate-y-2"} cursor-pointer hover:border-[rgba(0,212,255,0.35)] hover:bg-[#0f2535]`}
                style={{ transitionDelay: `${idx*60}ms` }}
                onClick={() => setSelectedId(isSelected ? null : zone.id)}>

                {/* Main row */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5" style={{color:typeColor}}>{TYPE_ICON[zone.type]}</span>
                      <div>
                        <div className="font-bold text-[#e8f4ff] text-[15px] leading-tight">{zone.name}</div>
                        <div className="text-[11px] text-[#7a9ab8] mt-0.5">{TYPE_LABEL[zone.type]} · No-fly radius: {zone.radiusKm} km</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="px-2.5 py-1 rounded text-[10px] font-bold"
                        style={{background:`${awningColor}18`,color:awningColor,border:`1px solid ${awningColor}44`}}>
                        <span style={{animation:zone.awning==="RED"?"blink 1s infinite":"none",display:"inline-block"}}>●</span>{" "}{zone.awning}
                      </div>
                      <span className="text-[#334455] text-[12px]">{isSelected?"▲":"▼"}</span>
                    </div>
                  </div>

                  <div className="text-[12px] text-[#7a9ab8] mb-3">{AWNING_DESC[zone.awning]}</div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-[#0a1525] rounded-lg p-2.5 text-center">
                      <CountUp target={dronesTargeting} color={dronesTargeting>0?"#ff4444":"#556a7a"} />
                      <div className="text-[9px] text-[#556a7a] uppercase tracking-wide mt-0.5">Drones approaching</div>
                      <DetectionBar count={dronesTargeting} max={maxDetections} />
                    </div>
                    <div className="bg-[#0a1525] rounded-lg p-2.5 text-center">
                      <span className="font-mono text-[16px] font-bold text-[#00d4ff]">
                        {closestDist < Infinity ? `${closestDist.toFixed(1)} km` : "—"}
                      </span>
                      <div className="text-[9px] text-[#556a7a] uppercase tracking-wide mt-0.5">Nearest contact</div>
                      {closestId && <div className="text-[9px] font-mono text-[#556a7a] mt-0.5">{closestId}</div>}
                    </div>
                    <div className="bg-[#0a1525] rounded-lg p-2.5 text-center">
                      <CountUp target={notams} color={notams>0?"#ffaa00":"#556a7a"} />
                      <div className="text-[9px] text-[#556a7a] uppercase tracking-wide mt-0.5">Active flight notices</div>
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-[#556a7a]">
                    {dronesTargeting>0 ? `⚠ ${dronesTargeting} drone${dronesTargeting>1?"s":""} currently vectoring toward this zone` : "✓ No drones heading toward this zone"}
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isSelected && detail && (
                  <div className="border-t border-[rgba(0,212,255,0.1)] px-4 py-4 bg-[#081828]" onClick={e=>e.stopPropagation()}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="text-[9px] uppercase tracking-[2px] text-[#00d4ff] mb-1">Why is this zone protected?</div>
                        <div className="text-[12px] text-[#c8d8e8] leading-relaxed">{detail.why}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-[2px] text-[#00d4ff] mb-1">Legal Basis</div>
                        <div className="text-[12px] text-[#c8d8e8] font-mono mb-3">{detail.law}</div>
                        <div className="text-[9px] uppercase tracking-[2px] text-[#00d4ff] mb-1">Governing Authority</div>
                        <div className="text-[12px] text-[#c8d8e8]">{detail.authority}</div>
                      </div>
                      <div className="sm:col-span-2">
                        <div className="text-[9px] uppercase tracking-[2px] text-[#ffaa00] mb-1">Countermeasure Protocol</div>
                        <div className="text-[12px] text-[#ffaa00] font-mono bg-[rgba(255,170,0,0.06)] rounded px-3 py-2 border border-[rgba(255,170,0,0.15)]">
                          {detail.countermeasure}
                        </div>
                      </div>
                      <div className="sm:col-span-2 flex gap-4 text-[10px] font-mono text-[#334455]">
                        <span>Coordinates: {zone.lat.toFixed(4)}°N {zone.lon.toFixed(4)}°E</span>
                        <span>·</span>
                        <span>Exclusion radius: {zone.radiusKm} km</span>
                        <span>·</span>
                        <span>Zone ID: {zone.id}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
