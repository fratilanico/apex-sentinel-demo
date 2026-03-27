# BA-005: Business Process Catalog
**Project:** Apex Sentinel Presentation Deck

### P-01: Initialization & Loading
**Goal:** Hook the user immediately while the heavy WebGL assets load.
**Trigger:** User navigates to the presentation URL.
**Owner:** System (Frontend)
**Preconditions:** None

**Main Flow:**
1. User requests page.
2. System displays a dark, terminal-style "Mission Briefing" overlay.
3. System triggers pseudo-console logs ("SYNCING SATELLITE UPLINK...").
4. R3F `useProgress` provides real loading percentages.
5. System displays circular progress ring.
6. When 100%, overlay fades out, revealing the 3D scene.

**Alternate Flows:**
A1. WebGL fails: System displays the Error Boundary with a 2D Tailwind version of the presentation.

**Business Rules:** BR-01: Loading screen must not block the main thread unnecessarily. BR-02: Minimum display time of 2s for "Hollywood effect".
**Data Captured:** Device capabilities (WebGL2 support).
**Outputs:** Loaded 3D context.
**System Gates:** WebGL support check.
**KPIs:** Time-to-Interactive (TTI).
**Linked SRS Requirements:** SRS-03, Constraint-1

### P-02: Slide Navigation
**Goal:** Traverse the presentation content while synchronizing the 3D camera.
**Trigger:** User presses Arrow keys, Space, or scrolls.
**Owner:** User
**Preconditions:** System loaded.

**Main Flow:**
1. User presses 'Right Arrow'.
2. Navigation Controller updates `currentSlideId` and `direction` state.
3. Framer Motion `<AnimatePresence>` transitions the text overlay.
4. R3F `useFrame` smoothly interpolates the camera to the new slide's target coordinates.

**Outputs:** New slide view, camera movement.
**Linked SRS Requirements:** SRS-04, SRS-06
