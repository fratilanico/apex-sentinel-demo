> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans

**Goal:** Initialize the Next.js presentation deck with R3F, Framer Motion, Zustand state, and the Mission Briefing loading screen (Wave 0).
**Architecture:** Single-page Next.js App Router application with client-side Zustand store for global navigation state and R3F for the 3D background.
**Tech Stack:** Next.js 15, React 19, React Three Fiber, Framer Motion, Zustand, Tailwind CSS.

## Exact File Map
**New files to create:**
- `src/stores/presentationStore.ts`
- `src/components/NavigationController.tsx`
- `src/components/MissionBriefingLoader.tsx`
- `src/components/slides/SlideRegistry.ts`
- `vitest.config.ts` and `src/test/setup.ts`

**Existing files to modify:**
- `app/page.tsx`
- `app/layout.tsx`
- `package.json` (add scripts and dependencies)

## Task 1 — FFMS TDD Stack Setup
**Files:** `vitest.config.ts`, `src/test/setup.ts`, `package.json`
**Step 1:** Install Vitest and testing library dependencies.
**Step 2:** Configure Vitest for JSDOM and React.
**Step 3:** Commit.

## Task 2 — Slide Registry and Zustand Store
**Files:** `src/stores/presentationStore.ts`, `src/components/slides/SlideRegistry.ts`, `src/test/w0/FR-01-navigation.test.ts`
**Step 1:** Write failing tests for the `presentationStore`.
**Step 2:** Implement the Slide Registry (SLIDES array) and the Zustand store (`currentSlideId`, `currentIndex`, `goNext()`, `goPrev()`).
**Step 3:** Verify GREEN. Commit.

## Task 3 — Navigation Controller (Keyboard & Touch)
**Files:** `src/components/NavigationController.tsx`, `src/test/w0/FR-01-navigation.test.tsx`
**Step 1:** Write failing component tests (simulating `ArrowRight` and `ArrowLeft`).
**Step 2:** Implement `NavigationController` listening to global keydown events.
**Step 3:** Verify GREEN. Commit.

## Task 4 — Mission Briefing Loader
**Files:** `src/components/MissionBriefingLoader.tsx`, `src/test/w0/FR-02-loader.test.tsx`
**Step 1:** Write tests asserting terminal output and progress ring.
**Step 2:** Implement `MissionBriefingLoader` using Framer Motion and `useProgress` from R3F.
**Step 3:** Verify GREEN. Commit.

## Task 5 — Integrate Single-Page App
**Files:** `app/page.tsx`, `app/globals.css`
**Step 1:** Assemble `<MissionBriefingLoader>`, `<NavigationController>`, and placeholder slides inside `<AnimatePresence>`.
**Step 2:** Verify the app runs without errors (`npm run build`).
**Step 3:** Commit.
