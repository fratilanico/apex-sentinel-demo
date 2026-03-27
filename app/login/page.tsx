"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Invalid access code");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center">
      {/* Grid background */}
      <div className="absolute inset-0 grid-bg opacity-40"/>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-[rgba(0,212,255,0.3)] bg-[rgba(0,212,255,0.05)] mb-4 relative">
            <div className="absolute inset-0 rounded-full border border-[rgba(0,212,255,0.15)]" style={{animation:'pulse-ring 2s infinite'}}/>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="3" fill="#00d4ff"/>
              <circle cx="12" cy="12" r="7" stroke="#00d4ff" strokeWidth="1" strokeOpacity="0.4"/>
              <circle cx="12" cy="12" r="11" stroke="#00d4ff" strokeWidth="0.5" strokeOpacity="0.2"/>
              <path d="M12 1v3M12 20v3M1 12h3M20 12h3" stroke="#00d4ff" strokeWidth="0.5" strokeOpacity="0.4"/>
            </svg>
          </div>
          <div className="text-[10px] font-semibold tracking-[4px] uppercase text-[#00d4ff] mb-1">APEX-SENTINEL</div>
          <div className="text-[#7a9ab8] text-sm font-mono">Restricted Access — INDIGO Clearance</div>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="bg-[rgba(10,21,37,0.9)] border border-[rgba(0,212,255,0.15)] rounded-xl p-6 backdrop-blur-sm">
          <label className="block text-[10px] font-mono font-semibold text-[#556a7a] uppercase tracking-wider mb-2">
            Access Code
          </label>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="Enter access code"
            className="w-full bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.15)] rounded-lg px-4 py-3 text-[#e8f4ff] font-mono text-sm placeholder-[#334455] focus:outline-none focus:border-[rgba(0,212,255,0.4)] transition-colors"
            autoFocus
          />
          {error && (
            <div className="mt-2 text-[11px] font-mono text-[#ff6666]">⚠ {error}</div>
          )}
          <button
            type="submit"
            disabled={loading || !pw}
            className="mt-4 w-full py-2.5 rounded-lg bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.3)] text-[#00d4ff] font-mono text-sm font-bold hover:bg-[rgba(0,212,255,0.15)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "AUTHENTICATING..." : "AUTHENTICATE"}
          </button>
        </form>

        <div className="mt-4 text-center text-[10px] font-mono text-[#2a3a4a]">
          APEX OS · INDIGO CLEARANCE REQUIRED
        </div>
      </div>
    </div>
  );
}
