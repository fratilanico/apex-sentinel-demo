# Product Requirements Document (PRD)
**Project:** Apex Sentinel Presentation Deck (Nano Banana 2 & Threat Radar)
**Date:** 2026-03-27
**Target Audience:** Enterprise Clients, Investors, Defense/Security Stakeholders

## 1. Product Vision
Create a top-tier, "Palantir-style" interactive web-based pitch deck that showcases the capabilities of APEX Sentinel (RF Spectrum Monitoring) using the Nano Banana 2 immersive 3D funnel architecture. The deck must feel "like a video game" while presenting mission-critical data.

## 2. Core Requirements (SRS)
- **SRS-01 (Architecture):** Single-page interactive Next.js application leveraging React Three Fiber (R3F) and Framer Motion.
- **SRS-02 (Aesthetics):** Dark-mode, high-data-density, minimalist cyberpunk (Palantir) style. Glowing accents, monospace typography for technical data.
- **SRS-03 (3D Engine):** Implement the Nano Banana 2 immersive background (WebGL2 default, Drei ScrollControls).
- **SRS-04 (Content Overlay):** Glass-morphism slides that trigger camera movements in the 3D scene on scroll/arrow keys.
- **SRS-05 (Telemetry/Data Viz):** Real-time (simulated or live) Threat Radar component representing RF anomalies and bearing estimations from the `RfFusionEngine`.
- **SRS-06 (Interactivity):** Keyboard navigation (Space, Arrow keys) and continuous progress tracking.
- **SRS-07 (Quality):** 100% TDD coverage for UI state management.

## 3. Delivery Methodology
- Must strictly adhere to the APEX OS `wave-formation` process and the `apex-business-analyst` protocol.
- TDD RED gate enforced for all features.

## 4. Key Constraints
- WebGL rendering must have a `<Suspense>` loader (Mission Briefing style).
- Error Boundary fallback to 2D Tailwind is required.
