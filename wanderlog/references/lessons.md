# Wanderlog Skill — Lessons Learned

## Session 1: Initial Development

### What Went Wrong

#### 1. Browser clicking instead of scripting
**Problem:** Repeatedly fell back to manual `computer` tool clicks — clicking sidebar links, "Add a place" buttons, search results, scrolling — instead of scripting the interactions in JS.
**Impact:** Slow, unreliable, caused wrong elements to be clicked, pages to scroll to wrong sections, and one full page crash (blank screen requiring navigation back).
**Root cause:** The existing `add-place.js` script was broken so the agent abandoned it and switched to manual clicking instead of fixing the script.
**Fix:** Always fix broken scripts first. Never fall back to manual clicking as a workaround. If a script fails, debug it, don't bypass it.

#### 2. `add-place.js` searched for a `<button>` but Wanderlog uses `<input placeholder="Add a place">`
**Problem:** The script looked for `button` elements with text "Add a place". Wanderlog's "Add a place" is an `<input>` element with `placeholder="Add a place"`.
**Impact:** Script always returned "not found", forcing manual clicking.
**Fix:** New `add-place-v2.js` correctly queries `input[placeholder="Add a place"]` and maps each input to its parent day section via React fiber traversal.

#### 3. `nativeInputValueSetter` doesn't trigger Wanderlog's autocomplete
**Problem:** The old script used `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set` to type into the search input. This updates the React state but does NOT trigger the autocomplete/search dropdown.
**Impact:** Text appeared in the input but no search results dropdown appeared.
**Fix:** The correct approach is a 2-step process:
  1. **JS script** focuses the correct input (`add-place-v2.js`)
  2. **Computer tool** types via real keyboard events (`computer action=type`) which triggers autocomplete
  3. **Computer tool** or **JS script** clicks the first search result

#### 4. Sidebar navigation was unreliable
**Problem:** Clicking a day in the sidebar sometimes scrolled to the wrong day section.
**Impact:** Wasted time, added places to wrong days.
**Root cause:** `navigate-day.js` matches the shortest text containing the day string, which may not be the correct element when multiple elements contain the text.
**Fix:** Don't rely on sidebar clicks for navigation. Instead, use JS to find the day header button directly and call `scrollIntoView()`.

#### 5. No delete or reorder scripts existed
**Problem:** Had to discover deletion (`onDelete` via React fiber) and reordering mid-session through trial and error.
**Fix:** Created `delete-item.js` and `reorder-item.js`. These are now part of the script library.

#### 6. "Add to trip" from map search caused page crash
**Problem:** When searching for a place via the "Add a place" input, clicked "See result(s) on map" which opened the map search panel. Clicking "Add to trip" in the map panel navigated away from the plan page entirely (blank screen).
**Fix:** NEVER use the map search panel to add items. Always select from the inline dropdown results.

## Session 2: Reorder Testing

### What Went Wrong

#### 7. Programmatic `onDragEnd()` silently ignored
**Problem:** Called rbd's `onDragEnd` handler directly with a synthetic result object. Call returned successfully but nothing changed.
**Root cause:** rbd checks its internal state machine. Since no drag was in progress, `onDragEnd` silently returns. Confirmed: zero network calls, zero DOM mutations, zero React state changes after the call.

#### 8. Keyboard drag via rbd was unreliable
**Problem:** Attempted keyboard drag (focus → space lift → ArrowUp → space drop). Lift worked ~50%, move always worked when lift succeeded, but drop (second space) never persisted.
**Impact:** Hours of debugging across multiple approaches.
**Approaches tried and failed:**
  - JS `.focus()` + computer tool space: lift inconsistent (~50%)
  - JS dispatch for all keys: lift/move work, drop never persists
  - Hybrid (JS lift+move, computer drop): drop still fails
  - Click on element + computer space: click sometimes opens panel
  - Tab navigation to element: Tab goes to body, not draggable
  - Programmatic `onDragEnd`: silently ignored

#### 9. Delete+re-add for reordering loses data
**Problem:** Considered deleting all items and re-adding in correct order as a workaround.
**Why this is bad:** Items carry notes, attachments, expense data, and custom photos. Deleting destroys all metadata. Re-adding creates a fresh item with only the place reference.
**Fix:** Always use non-destructive reordering. Never delete+re-add as a reorder workaround.

### What Worked: ShareDB WebSocket `lm` ops

#### 10. ShareDB is Wanderlog's data layer
**Discovery:** Wanderlog uses ShareDB (OT-based real-time collaboration) over WebSocket. No REST API, no Firebase — pure ShareDB.
**How it works:**
  1. Patch `WebSocket.prototype.send` with `configurable: false` to capture the live WS instance
  2. User must interact with the page once (triggers a WS send, captures `window.__liveWS`)
  3. Subscribe to the trip doc: `{a:'s', c:'TripPlans', d:tripId, v:null}` → returns full snapshot with version
  4. Send `lm` (list move) op: `{a:'op', c:'TripPlans', d:tripId, v:version, op:[{p:['itinerary','sections',sectionIndex,'blocks',blockIndex], lm:targetIndex}]}`
  5. Server acks the op and broadcasts to all clients — order persists immediately
**Key details:**
  - Collection: `TripPlans`, doc ID = trip plan key from URL
  - Itinerary structure: `doc.itinerary.sections[N].blocks[M]` — each section is a day, each block is a place
  - `lm` = ShareDB's "list move" operation type
  - Version must match current server version (get from subscribe response)
  - Hotels/lodging are separate from numbered blocks

## Key Principles

1. **Script-first, click-never.** All interactions must go through JS scripts. The `computer` tool is ONLY for keyboard input (typing search queries) — NEVER for clicking.

2. **React fiber for reading, ShareDB for writing.** Use `__reactFiber` to read item metadata (name, date, index). Use ShareDB WebSocket ops to write changes (reorder via `lm`). Delete uses React fiber's `onDelete`.

3. **Two-step add pattern.** Adding a place: (1) JS focuses input, (2) `computer` types the query, (3) JS clicks first result. Steps 1 and 3 are scripted; step 2 must use real keyboard.

4. **Dates in React fiber use YYYY-MM-DD format.** Scripts that interact with fiber data should use ISO dates.

5. **Non-destructive operations only.** Never delete items to reorder — use ShareDB `lm` ops. Items carry notes, expenses, and attachments that are lost on delete.

6. **Understand the data layer before fighting the UI.** When UI automation fails, investigate the app's data persistence mechanism and operate at that level. This would have saved hours on the reorder problem.

7. **Test scripts before using them in production.** Dry-run scripts (find without clicking, check without deleting) to verify they target the right elements before committing changes.

8. **Verify after every batch operation.** Run `scrape-itinerary.js` after changes to confirm final state.
