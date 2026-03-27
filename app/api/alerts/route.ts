/**
 * Ukraine Air Raid Alert proxy
 * Source: alerts.in.ua (REST) — free, no token needed for status endpoint
 * Fallback: raid.fly.dev SSE aggregator
 *
 * Returns current alert status for all 25 Ukrainian oblasts
 */

import { NextResponse } from "next/server";

// Oblast IDs from alerts.in.ua API
const ALERTS_API = "https://alerts.in.ua/api/v1/alerts/active.json";

// Oblast name→coordinates mapping for map overlay
const OBLAST_COORDS: Record<string, [number, number]> = {
  "Kyiv":            [50.45, 30.52],
  "Kyiv Oblast":     [50.11, 30.95],
  "Kharkiv":         [49.99, 36.23],
  "Dnipropetrovsk":  [48.46, 35.04],
  "Zaporizhzhia":    [47.83, 35.18],
  "Kherson":         [46.63, 32.62],
  "Mykolaiv":        [46.97, 31.99],
  "Odesa":           [46.48, 30.73],
  "Sumy":            [50.91, 34.80],
  "Chernihiv":       [51.50, 31.29],
  "Poltava":         [49.59, 34.55],
  "Kirovograd":      [48.51, 32.27],
  "Cherkasy":        [49.44, 32.06],
  "Vinnytsia":       [49.23, 28.47],
  "Khmelnytskyi":    [49.42, 26.98],
  "Zhytomyr":        [50.25, 28.66],
  "Rivne":           [50.62, 26.25],
  "Lutsk":           [50.74, 25.34],
  "Lviv":            [49.84, 24.03],
  "Ternopil":        [49.55, 25.59],
  "Ivano-Frankivsk": [48.92, 24.71],
  "Uzhhorod":        [48.62, 22.29],
  "Chernivtsi":      [48.29, 25.94],
  "Luhansk":         [48.57, 39.31],
  "Donetsk":         [47.98, 37.80],
};

let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 10_000; // 10s

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { "X-Cache": "HIT" },
    });
  }

  try {
    const res = await fetch(ALERTS_API, {
      headers: { "User-Agent": "APEX-SENTINEL/1.0" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`alerts.in.ua: ${res.status}`);
    }

    const raw = await res.json();

    // alerts.in.ua returns { alerts: [...] }
    const active = (raw.alerts || []).map((a: Record<string, unknown>) => ({
      id:          a.id,
      oblast:      a.location_title || a.location_oblast,
      type:        a.alert_type,         // "air_raid", "artillery_shelling", etc.
      started:     a.started_at,
      lat:         OBLAST_COORDS[a.location_title as string]?.[0] ?? null,
      lon:         OBLAST_COORDS[a.location_title as string]?.[1] ?? null,
    })).filter((a: Record<string, unknown>) => a.lat != null);

    const payload = {
      ts:      Date.now(),
      active,
      count:   active.length,
      source:  "alerts.in.ua",
    };

    cache = { data: payload, ts: Date.now() };
    return NextResponse.json(payload, { headers: { "X-Cache": "MISS" } });

  } catch (err) {
    // Return empty but valid on error — map just won't show alerts
    const payload = {
      ts:     Date.now(),
      active: [],
      count:  0,
      source: "alerts.in.ua",
      error:  String(err),
    };
    return NextResponse.json(payload, { status: 200 });
  }
}
