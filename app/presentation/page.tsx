"use client";
import { useState, useEffect, useCallback } from "react";

const SLIDES = [
  {
    id: "01",
    label: "Mission Briefing",
    title: "APEX SENTINEL",
    subtitle: "Initiative Zero — Classified Presentation",
    body: "The next-generation RF Spectrum Analytics and Threat Detection platform. Built on APEX OS Kernel architecture.",
    stats: [
      { value: "0.15s",  label: "Reaction Time" },
      { value: "100%",   label: "Live Coverage" },
      { value: "5+",     label: "Sentinel Nodes" },
    ],
    tags: ["EU Cat A–D", "FIR LRBB", "EASA Compliant"],
  },
  {
    id: "02",
    label: "Threat Landscape",
    title: "THE THREAT",
    subtitle: "Unregulated UAS — Growing Risk Vector",
    body: "EU airspace sees 12,000+ unregistered drone flights monthly. Cat-D unknown UAS infiltrate restricted airspace at sub-radar altitudes. Traditional C-UAS systems react in 4–6s. SENTINEL reacts in 150ms.",
    stats: [
      { value: "12k+",  label: "Monthly incidents" },
      { value: "4–6s",  label: "Legacy reaction" },
      { value: "Cat-D", label: "Primary threat" },
    ],
    tags: ["RF Silent drones", "Nuclear exclusion zones", "NATO assets"],
  },
  {
    id: "03",
    label: "Architecture",
    title: "APEX SENTINEL CORE",
    subtitle: "7-Layer Acoustic + RF Fusion Stack",
    body: "Distributed acoustic nodes cross-referenced with RF spectrum signatures. AI fusion engine classifies drone category in 2 acoustic cycles. AWNING escalation protocol triggers automated INDIGO clearance workflow.",
    stats: [
      { value: "7",     label: "Fusion layers" },
      { value: "22kHz", label: "Acoustic ceiling" },
      { value: "AWNING",label: "Protocol" },
    ],
    tags: ["APEX OS Kernel", "Edge ML inference", "Supabase telemetry"],
  },
  {
    id: "04",
    label: "Live Threat Radar",
    title: "LIVE INTELLIGENCE",
    subtitle: "Real-Time Multi-Source Fusion",
    body: "8 live intelligence feeds: OpenSky ADS-B, adsb.fi backup, FAA NOTAM (FIR LRBB), ACLED/GDELT security events, Ukraine air-raid alerts (alerts.in.ua), Open-Meteo airspace weather, EASA UAS zones (EU 2021/664).",
    stats: [
      { value: "8",    label: "Live data feeds" },
      { value: "15s",  label: "Poll interval" },
      { value: "LIVE", label: "OpenSky + adsb.fi" },
    ],
    tags: ["Palantir-style UI", "Leaflet map", "56/56 E2E tests GREEN"],
  },
  {
    id: "05",
    label: "Operational Readiness",
    title: "INDIGO CLEARANCE",
    subtitle: "Demo-Ready — March 28 Deadline Met",
    body: "Full W0–W21 wave-formation complete. 3540 unit tests GREEN. Playwright E2E 56/56. Live at apex-sentinel-demo.vercel.app. INDIGO clearance compliance demonstrated across all 8 restricted zone types.",
    stats: [
      { value: "3540",  label: "Tests GREEN" },
      { value: "56/56", label: "E2E Playwright" },
      { value: "W21",   label: "Waves complete" },
    ],
    tags: ["INDIGO!APEX!2026", "Hackathon ready", "EU AI Act compliant"],
  },
];

export default function PresentationPage() {
  const [idx, setIdx] = useState(0);
  const [animating, setAnimating] = useState(false);

  const slide = SLIDES[idx];

  const goTo = useCallback((next: number) => {
    if (animating || next < 0 || next >= SLIDES.length) return;
    setAnimating(true);
    setTimeout(() => {
      setIdx(next);
      setAnimating(false);
    }, 220);
  }, [animating]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") goTo(idx + 1);
      if (e.key === "ArrowLeft") goTo(idx - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [idx, goTo]);

  return (
    <div className="min-h-screen w-full bg-black flex flex-col select-none overflow-hidden"
      style={{ fontFamily: "'Courier New', monospace" }}>

      {/* Scanline overlay */}
      <div className="pointer-events-none fixed inset-0 z-50"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)" }} />

      {/* Header bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[rgba(0,212,255,0.15)] bg-[rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-3">
          <div className="border border-[rgba(0,212,255,0.5)] rounded-full px-3 py-1">
            <span className="text-[10px] font-bold tracking-[3px] text-[#00d4ff] uppercase">Initiative Zero</span>
          </div>
          <span className="text-[10px] text-[#334455] hidden sm:block">APEX SENTINEL · CLASSIFIED</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-[#556a7a] tabular-nums">
            {String(idx + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
          </span>
          <div className="flex gap-1">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => goTo(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-[#00d4ff] scale-125' : 'bg-[#334455] hover:bg-[#556a7a]'}`} />
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col px-4 py-6 sm:px-8 sm:py-8 max-w-2xl w-full mx-auto">

        {/* Slide number + label */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[9px] text-[#334455] tracking-[4px] uppercase">
            {String(idx + 1).padStart(2, "0")} · {slide.label}
          </span>
          <div className="flex-1 h-px bg-[rgba(0,212,255,0.1)]" />
        </div>

        {/* Title */}
        <div className={`transition-opacity duration-200 ${animating ? 'opacity-0' : 'opacity-100'}`}>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-wider mb-1 leading-tight">
            {slide.title}
          </h1>
          <p className="text-[11px] text-[#00d4ff] tracking-[3px] uppercase mb-6">{slide.subtitle}</p>

          {/* Glass card */}
          <div className="border border-white rounded-lg p-4 sm:p-5 mb-6 bg-[rgba(255,255,255,0.03)]">
            <p className="text-sm sm:text-base text-white leading-relaxed">{slide.body}</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {slide.stats.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-[#00d4ff] mb-0.5">{s.value}</div>
                <div className="text-[9px] text-[#556a7a] uppercase tracking-widest leading-tight">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {slide.tags.map(tag => (
              <span key={tag} className="text-[9px] font-bold tracking-[2px] uppercase px-2 py-1 rounded border border-[rgba(0,212,255,0.2)] text-[#556a7a]">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex-1" />
        <div className="flex gap-2 justify-center mb-2">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={`transition-all rounded-full ${i === idx ? 'w-6 h-1.5 bg-[#00d4ff]' : 'w-1.5 h-1.5 bg-[#334455] hover:bg-[#556a7a]'}`} />
          ))}
        </div>
      </main>

      {/* PREV / NEXT fixed buttons */}
      <div className="fixed right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-40">
        <button onClick={() => goTo(idx - 1)} disabled={idx === 0}
          className={`w-9 h-9 rounded border flex items-center justify-center text-sm font-bold transition-all
            ${idx === 0 ? 'border-[#1a2a3a] text-[#1a2a3a] cursor-default' : 'border-[rgba(0,212,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.1)]'}`}>
          ←
        </button>
        <button onClick={() => goTo(idx + 1)} disabled={idx === SLIDES.length - 1}
          className={`w-9 h-9 rounded border flex items-center justify-center text-sm font-bold transition-all
            ${idx === SLIDES.length - 1 ? 'border-[#1a2a3a] text-[#1a2a3a] cursor-default' : 'border-[rgba(0,212,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.1)]'}`}>
          →
        </button>
        <div className="text-center mt-1">
          <span className="text-[8px] font-bold tracking-[2px] text-[#334455] block">PREV</span>
          <span className="text-[8px] font-bold tracking-[2px] text-[#334455] block">NEXT</span>
        </div>
      </div>

      {/* Bottom link */}
      <div className="flex-shrink-0 text-center pb-3 px-4">
        <a href="/" className="text-[9px] text-[#334455] hover:text-[#00d4ff] transition-colors tracking-wider">
          ← LIVE DASHBOARD · apex-sentinel-demo.vercel.app
        </a>
      </div>
    </div>
  );
}
