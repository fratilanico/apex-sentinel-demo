# Feature F001-F007: W0 Foundation (Interactive Core & 3D Initialization)
**Target Wave:** W0
**Priority:** Critical

## Objective
Initialize the Next.js App Router application with React Three Fiber, Framer Motion, and Zustand to serve as the "Mission Control" presentation deck for APEX Sentinel. Includes the "Mission Briefing" loading screen, the Slide Registry, and keyboard navigation.

## Business Value
Provides the required high-fidelity "Palantir-style" immersive experience to impress enterprise clients and defense stakeholders.

## Linked SRS Requirements
- SRS-01, SRS-02, SRS-03, SRS-04, SRS-06

## Scope In
- Zustand global state for presentation navigation (`currentIndex`, `direction`).
- Framer Motion slide transition variants (`AnimatePresence mode="wait"`).
- Keyboard navigation (Arrow keys, Space).
- "Mission Briefing" loading screen with fake terminal logs.
- Basic R3F Canvas setup.

## Scope Out
- 3D model creation (using basic geometry or placeholder glTF for the first wave).
- Complex threat radar data simulation.

## User Stories
**S-001: Keyboard Navigation**
- AC-1: Pressing right arrow increments the slide index.
- AC-2: Pressing left arrow decrements the slide index.
- AC-3: Reaching the end/beginning of the slides clamps the index (no out-of-bounds).

**S-002: Mission Briefing Loading**
- AC-1: App starts with a dark terminal screen overlay.
- AC-2: Display "SYNCING SATELLITE UPLINK...".
- AC-3: When loaded, overlay fades out.

## Suggested Test Focus
- Unit tests for the Zustand store.
- Component tests for the Slide Navigation Controller.

## Risks
- R3F loading time. *Mitigation: Use the immersive terminal loader.*

## Definition of Ready
- TDD environment (Vitest + JSDOM) is configured.

## Definition of Done
- 100% tests passing.
- Application builds successfully.
