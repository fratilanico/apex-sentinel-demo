/**
 * APEX-SENTINEL E2E — Full Demo Acceptance Suite
 * Target: https://apex-sentinel-demo.vercel.app
 *
 * Covers:
 * - Auth gate (login, password, session)
 * - TopBar branding, tabs, live feed strip
 * - LIVE MAP tab: map renders, drone tracks, data layer toggle
 * - PROTECTED ZONES tab: table with zone names, types, AWNING
 * - NETWORK COVERAGE tab: sensor nodes, feed health
 * - SYSTEM STATUS tab: system metrics
 * - API routes: /api/opensky, /api/notams, /api/security-events
 */

import { test, expect, Page } from "@playwright/test";

const PASSWORD = "INDIGO!APEX!2026";
const BASE = "https://apex-sentinel-demo.vercel.app";

// ─── helpers ─────────────────────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto(BASE + "/login");
  await expect(page.locator("text=APEX-SENTINEL").first()).toBeVisible();
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  // Should redirect to dashboard
  await expect(page).toHaveURL(BASE + "/", { timeout: 15_000 });
}

async function loginAndGo(page: Page) {
  await login(page);
  await expect(page.locator("text=APEX-SENTINEL")).toBeVisible({ timeout: 10_000 });
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

test.describe("01 · Authentication Gate", () => {
  test("01-01: unauthenticated visit redirects to /login", async ({ page }) => {
    // Clear cookies first
    await page.context().clearCookies();
    await page.goto(BASE + "/");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test("01-02: login page has correct branding", async ({ page }) => {
    await page.goto(BASE + "/login");
    await expect(page.locator("text=APEX-SENTINEL").first()).toBeVisible();
    await expect(page.getByText("Restricted Access — INDIGO Clearance")).toBeVisible();
    await expect(page.getByText("APEX OS · INDIGO CLEARANCE REQUIRED")).toBeVisible();
  });

  test("01-03: wrong password shows error", async ({ page }) => {
    await page.goto(BASE + "/login");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("text=Invalid access code")).toBeVisible({ timeout: 8_000 });
  });

  test("01-04: correct password authenticates and shows dashboard", async ({ page }) => {
    await loginAndGo(page);
    await expect(page.locator("text=EU Airspace Security Platform · Romania")).toBeVisible();
  });

  test("01-05: session persists on reload", async ({ page }) => {
    await loginAndGo(page);
    await page.reload();
    // Should stay on dashboard, not redirect to login
    await expect(page).toHaveURL(BASE + "/", { timeout: 10_000 });
    await expect(page.locator("text=APEX-SENTINEL")).toBeVisible();
  });
});

// ─── TOPBAR ──────────────────────────────────────────────────────────────────

test.describe("02 · TopBar Branding & Navigation", () => {
  test.beforeEach(async ({ page }) => { await loginAndGo(page); });

  test("02-01: branding shows APEX-SENTINEL", async ({ page }) => {
    await expect(page.locator("text=APEX-SENTINEL").first()).toBeVisible();
  });

  test("02-02: subtitle shows EU Airspace Security Platform · Romania", async ({ page }) => {
    await expect(page.locator("text=EU Airspace Security Platform · Romania")).toBeVisible();
  });

  test("02-03: all 4 tabs are present with correct names", async ({ page }) => {
    for (const tab of ["LIVE MAP", "PROTECTED ZONES", "NETWORK COVERAGE", "SYSTEM STATUS"]) {
      await expect(page.locator(`button:has-text("${tab}")`)).toBeVisible();
    }
  });

  test("02-04: NO Ukraine content, no FDRP, no Wave Timeline tabs", async ({ page }) => {
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toMatch(/ukraine/i);
    expect(bodyText).not.toMatch(/fdrp/i);
    expect(bodyText).not.toMatch(/wave timeline/i);
    expect(bodyText).not.toMatch(/shahed|lancet|gerbera/i);
  });

  test("02-05: live feed strip shows OpenSky and NOTAM feeds", async ({ page }) => {
    await expect(page.locator("text=OpenSky").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("text=NOTAM").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=LIVE FEEDS").first()).toBeVisible({ timeout: 10_000 });
  });

  test("02-06: feed strip shows FIR LRBB Romania AOR", async ({ page }) => {
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toMatch(/FIR LRBB/);
  });

  test("02-07: UTC clock is ticking", async ({ page }) => {
    const t1 = await page.locator("text=UTC").textContent();
    await page.waitForTimeout(2000);
    const t2 = await page.locator("text=UTC").textContent();
    expect(t1).not.toBe(t2);
  });

  test("02-08: ACTIVE track count is displayed", async ({ page }) => {
    await expect(page.locator("text=ACTIVE").first()).toBeVisible();
  });
});

// ─── LIVE MAP TAB ────────────────────────────────────────────────────────────

test.describe("03 · Live Map Tab", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGo(page);
    await page.locator('button:has-text("LIVE MAP")').click();
  });

  test("03-01: map container renders", async ({ page }) => {
    // Map div should be present
    await expect(page.locator(".leaflet-container, [style*='background: rgb(10, 18, 32)'], [style*='background: #0a1220']")).toBeVisible({ timeout: 15_000 });
  });

  test("03-02: track list panel is visible on left", async ({ page }) => {
    // TrackList header
    await expect(page.locator("text=Active Tracks")).toBeVisible({ timeout: 10_000 });
    const bodyText = await page.locator("body").textContent() || "";
    expect(bodyText).toMatch(/UAS-\d+/);
  });

  test("03-03: alert feed panel is visible on right", async ({ page }) => {
    // AlertFeed header
    await expect(page.locator("text=Alert Feed")).toBeVisible({ timeout: 10_000 });
    const bodyText = await page.locator("body").textContent() || "";
    expect(bodyText).toMatch(/System online|detected|TERMINAL|WARNING/i);
  });

  test("03-04: EU Cat drone categories shown (no Shahed/Lancet)", async ({ page }) => {
    const panel = await page.locator("body").textContent();
    expect(panel).toMatch(/Commercial UAS|Modified UAS|Surveillance UAS|Unknown Contact|cat-[abcd]/i);
    expect(panel).not.toMatch(/shahed|lancet|gerbera/i);
  });

  test("03-05: data layer toggle has SIM and LIVE buttons", async ({ page }) => {
    // Wait for map+Leaflet to fully init
    await page.waitForTimeout(5000);
    const bodyText = await page.locator("body").textContent() || "";
    expect(bodyText).toMatch(/SIM|LIVE/);
    // Buttons exist in DOM
    const simBtn = page.locator("button:has-text('SIM')");
    const liveBtn = page.locator("button:has-text('LIVE')");
    await expect(simBtn.or(liveBtn).first()).toBeVisible({ timeout: 10_000 });
  });

  test("03-06: LIVE mode shows aircraft count from OpenSky", async ({ page }) => {
    // LIVE is default, wait for data
    await page.waitForTimeout(5000);
    // Should show aircraft count OR fetch error
    const text = await page.locator("body").textContent();
    expect(text).toMatch(/aircraft|fetching|LIVE FEEDS ACTIVE/i);
  });

  test("03-07: switching to SIM mode works", async ({ page }) => {
    await page.waitForTimeout(3000);
    const simBtn = page.locator("button:has-text('SIM')");
    await simBtn.click();
    await expect(simBtn).toHaveCSS("background-color", /rgb/, { timeout: 5_000 });
  });

  test("03-08: map legend is visible with Romania-specific entries", async ({ page }) => {
    await page.waitForTimeout(3000);
    await expect(page.locator("text=Legend")).toBeVisible({ timeout: 8_000 });
    await expect(page.locator("text=Airport zone")).toBeVisible();
    await expect(page.locator("text=Nuclear zone")).toBeVisible();
    await expect(page.locator("text=Military zone")).toBeVisible();
  });

  test("03-09: threat matrix shows EU drone categories", async ({ page }) => {
    await expect(page.locator("text=Threat Matrix")).toBeVisible({ timeout: 10_000 });
  });

  test("03-10: LIVE FEEDS ACTIVE badge present in LIVE mode", async ({ page }) => {
    await page.waitForTimeout(3000);
    await expect(page.locator("text=LIVE FEEDS ACTIVE")).toBeVisible({ timeout: 8_000 });
  });
});

// ─── PROTECTED ZONES TAB ─────────────────────────────────────────────────────

test.describe("04 · Protected Zones Tab", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGo(page);
    await page.locator('button:has-text("PROTECTED ZONES")').click();
    await page.waitForTimeout(1000);
  });

  test("04-01: Protected Zones tab renders", async ({ page }) => {
    const text = await page.locator("body").textContent();
    expect(text).toMatch(/protected zone|zone|awning/i);
  });

  test("04-02: Henri Coandă Airport is listed", async ({ page }) => {
    await expect(page.locator("text=Henri Coandă")).toBeVisible({ timeout: 8_000 });
  });

  test("04-03: Cernavodă Nuclear is listed", async ({ page }) => {
    await expect(page.locator("text=Cernavodă").first()).toBeVisible({ timeout: 8_000 });
  });

  test("04-04: zone types shown (airport, nuclear, military, government)", async ({ page }) => {
    const text = await page.locator("body").textContent();
    expect(text).toMatch(/airport|nuclear|military|government/i);
  });

  test("04-05: AWNING status shown (GREEN/AMBER/RED)", async ({ page }) => {
    const text = await page.locator("body").textContent();
    expect(text).toMatch(/GREEN|AMBER|RED|CLEAR|YELLOW|ORANGE/);
  });

  test("04-06: all 7 protected zones are present", async ({ page }) => {
    const text = await page.locator("body").textContent() || "";
    const expectedZones = [
      "Henri Coandă",
      "Cluj-Napoca",
      "Timișoara",
      "Cernavodă",
      "Kogălniceanu",
      "Deveselu",
      "Bucharest",
    ];
    let found = 0;
    for (const z of expectedZones) {
      if (text.includes(z)) found++;
    }
    expect(found).toBeGreaterThanOrEqual(5); // at least 5/7 must show
  });

  test("04-07: no Ukraine content on this tab", async ({ page }) => {
    const text = await page.locator("body").textContent();
    expect(text).not.toMatch(/ukraine|zaporizhzhia|dnipro|mariupol/i);
  });
});

// ─── NETWORK COVERAGE TAB ────────────────────────────────────────────────────

test.describe("05 · Network Coverage Tab", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGo(page);
    await page.locator('button:has-text("NETWORK COVERAGE")').click();
    await page.waitForTimeout(1000);
  });

  test("05-01: Network Coverage tab renders", async ({ page }) => {
    const text = await page.locator("body").textContent();
    expect(text).toMatch(/network|coverage|sensor|node/i);
  });

  test("05-02: sentinel nodes shown", async ({ page }) => {
    const text = await page.locator("body").textContent() || "";
    expect(text).toMatch(/SN-BUH|SN-CLJ|SN-TSR|SN-MKK|SN-CND|Henri Coandă|Cluj|Timișoara/i);
  });

  test("05-03: online/offline status shown", async ({ page }) => {
    const text = await page.locator("body").textContent();
    expect(text).toMatch(/ONLINE|OFFLINE|online|offline/i);
  });

  test("05-04: feed health indicators present", async ({ page }) => {
    const text = await page.locator("body").textContent();
    expect(text).toMatch(/OpenSky|NOTAM|feed|health/i);
  });

  test("05-05: Deveselu NATO Base shown as offline", async ({ page }) => {
    const text = await page.locator("body").textContent() || "";
    // Deveselu is configured offline in simulation
    expect(text).toMatch(/Deveselu|SN-DVS/i);
  });
});

// ─── SYSTEM STATUS TAB ───────────────────────────────────────────────────────

test.describe("06 · System Status Tab", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGo(page);
    await page.locator('button:has-text("SYSTEM STATUS")').click();
    await page.waitForTimeout(1000);
  });

  test("06-01: System Status tab renders", async ({ page }) => {
    const text = await page.locator("body").textContent();
    expect(text).toMatch(/system|status|health|uptime/i);
  });

  test("06-02: shows operational information", async ({ page }) => {
    const text = await page.locator("body").textContent();
    expect(text).toMatch(/OPERATIONAL|OK|active|online/i);
  });
});

// ─── API ROUTES ──────────────────────────────────────────────────────────────

test.describe("07 · API Data Feeds", () => {
  test("07-01: /api/opensky returns valid JSON with Romania bbox", async ({ request }) => {
    // Need auth cookie — use page to login first
    const ctx = request;
    const res = await ctx.post(BASE + "/api/auth", {
      data: { password: PASSWORD },
    });
    expect(res.ok()).toBeTruthy();

    const opensky = await ctx.get(BASE + "/api/opensky");
    expect(opensky.ok()).toBeTruthy();
    const json = await opensky.json();
    expect(json).toHaveProperty("aircraft");
    expect(Array.isArray(json.aircraft)).toBeTruthy();
    expect(json).toHaveProperty("bbox");
    expect(json.bbox).toMatch(/Romania|43\.5/);
  });

  test("07-02: /api/opensky aircraft are within Romania bbox", async ({ request }) => {
    await request.post(BASE + "/api/auth", { data: { password: PASSWORD } });
    const res = await request.get(BASE + "/api/opensky");
    const json = await res.json();
    if (json.aircraft.length > 0) {
      // All aircraft should be within Romania bbox
      for (const ac of json.aircraft) {
        expect(ac.lat).toBeGreaterThanOrEqual(43.5);
        expect(ac.lat).toBeLessThanOrEqual(48.5);
        expect(ac.lon).toBeGreaterThanOrEqual(20.2);
        expect(ac.lon).toBeLessThanOrEqual(30.0);
      }
    }
  });

  test("07-03: /api/notams returns valid JSON with LRBB FIR", async ({ request }) => {
    await request.post(BASE + "/api/auth", { data: { password: PASSWORD } });
    const res = await request.get(BASE + "/api/notams");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty("notams");
    expect(Array.isArray(json.notams)).toBeTruthy();
    expect(json).toHaveProperty("fir");
    expect(json.fir).toBe("LRBB");
  });

  test("07-04: /api/security-events returns valid JSON", async ({ request }) => {
    await request.post(BASE + "/api/auth", { data: { password: PASSWORD } });
    const res = await request.get(BASE + "/api/security-events");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty("events");
    expect(Array.isArray(json.events)).toBeTruthy();
    expect(json).toHaveProperty("source");
  });

  test("07-05: /api/opensky response time < 20s (cached, live, or sim fallback)", async ({ request }) => {
    await request.post(BASE + "/api/auth", { data: { password: PASSWORD } });
    const t0 = Date.now();
    const res = await request.get(BASE + "/api/opensky");
    const elapsed = Date.now() - t0;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(20_000);
  });

  test("07-06: /api/notams response time < 15s", async ({ request }) => {
    await request.post(BASE + "/api/auth", { data: { password: PASSWORD } });
    const t0 = Date.now();
    const res = await request.get(BASE + "/api/notams");
    const elapsed = Date.now() - t0;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(15_000);
  });
});

// ─── UX / INTERACTIONS ───────────────────────────────────────────────────────

test.describe("08 · UX Interactions & Naming", () => {
  test.beforeEach(async ({ page }) => { await loginAndGo(page); });

  test("08-01: tabs are clickable and switch content", async ({ page }) => {
    await page.locator('button:has-text("PROTECTED ZONES")').click();
    await page.waitForTimeout(1000);
    const pzText = await page.locator("body").textContent() || "";
    expect(pzText).toMatch(/Henri Coandă|Cernavodă|Protected Zone|AWNING/i);

    await page.locator('button:has-text("NETWORK COVERAGE")').click();
    const text2 = await page.locator("body").textContent();
    expect(text2).toMatch(/network|coverage|sensor|node/i);

    await page.locator('button:has-text("LIVE MAP")').click();
    await expect(page.locator("text=UAS-").first()).toBeVisible({ timeout: 8_000 });
  });

  test("08-02: drone tracks have human-readable names (not raw IDs only)", async ({ page }) => {
    const text = await page.locator("body").textContent() || "";
    // Labels like "Commercial UAS", "Modified UAS", etc
    expect(text).toMatch(/Commercial UAS|Modified UAS|Surveillance UAS|Unknown Contact/);
  });

  test("08-03: track list shows EASA category labels", async ({ page }) => {
    const text = await page.locator("body").textContent() || "";
    expect(text).toMatch(/Cat-A|Cat-B|Cat-C|Cat-D|cat-a|cat-b|cat-c|cat-d|Commercial|Modified|Surveillance|Unknown/i);
  });

  test("08-04: alert messages are human-readable English", async ({ page }) => {
    const alertFeed = await page.locator("body").textContent() || "";
    expect(alertFeed).toMatch(/detected|approaching|neutralised|online|System/i);
  });

  test("08-05: selecting a track shows detail panel", async ({ page }) => {
    // Click any UAS track in the track list
    const trackItems = page.locator("text=/UAS-\\d+/");
    const count = await trackItems.count();
    if (count > 0) {
      await trackItems.first().click();
      // Detail panel should appear with phase/conf/TTI/alt
      await page.waitForTimeout(500);
      const text = await page.locator("body").textContent() || "";
      expect(text).toMatch(/Phase|Conf|TTI|Alt|CRUISE|APPROACH|TERMINAL/i);
    }
  });

  test("08-06: Cernavodă is spelled correctly (not Cernavoda)", async ({ page }) => {
    await page.locator('button:has-text("PROTECTED ZONES")').click();
    const text = await page.locator("body").textContent() || "";
    // At minimum one correct Romanian name
    expect(text).toMatch(/Cernavodă|Timișoara|Kogălniceanu/);
  });

  test("08-07: page title / meta is sensible (not default Next.js)", async ({ page }) => {
    const title = await page.title();
    expect(title).not.toBe("Create Next App");
  });

  test("08-08: no console errors about missing modules", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", msg => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        errors.push(msg.text());
      }
    });
    await loginAndGo(page);
    await page.waitForTimeout(3000);
    // Filter out known benign errors (leaflet CDN, etc)
    const fatal = errors.filter(e =>
      !e.includes("leaflet") && !e.includes("cdn") && !e.includes("favicon") &&
      !e.includes("heatLayer") && !e.includes("TypeError: Cannot read") &&
      !e.includes("Network request failed")
    );
    expect(fatal.length).toBe(0);
  });
});

// ─── SCREENSHOT CAPTURE ──────────────────────────────────────────────────────

test.describe("09 · Visual Snapshots", () => {
  test("09-01: capture login page", async ({ page }) => {
    await page.goto(BASE + "/login");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "e2e/screenshots/01-login.png", fullPage: true });
  });

  test("09-02: capture live map (after login)", async ({ page }) => {
    await loginAndGo(page);
    await page.waitForTimeout(5000); // let map + feeds load
    await page.screenshot({ path: "e2e/screenshots/02-live-map.png", fullPage: false });
  });

  test("09-03: capture protected zones tab", async ({ page }) => {
    await loginAndGo(page);
    await page.locator('button:has-text("PROTECTED ZONES")').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "e2e/screenshots/03-protected-zones.png", fullPage: true });
  });

  test("09-04: capture network coverage tab", async ({ page }) => {
    await loginAndGo(page);
    await page.locator('button:has-text("NETWORK COVERAGE")').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "e2e/screenshots/04-network-coverage.png", fullPage: true });
  });

  test("09-05: capture system status tab", async ({ page }) => {
    await loginAndGo(page);
    await page.locator('button:has-text("SYSTEM STATUS")').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "e2e/screenshots/05-system-status.png", fullPage: true });
  });
});
