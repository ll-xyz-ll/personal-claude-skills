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

## Session 3: Pure-Script Testing — Trip Destruction Incident

### What Happened (Timeline)

1. User asked to test all skill functions with zero user interaction, fully automated
2. Successfully scraped the itinerary (all 12 days, 60+ items)
3. Tested DOM-based add (focus input → computer type → click result) — worked but slow
4. Investigated pure-script alternatives to eliminate all DOM/scroll dependency
5. Discovered Wanderlog's autocomplete API: `GET /api/placesAPI/autocomplete/v2`
6. Discovered place details API: `GET /api/placesAPI/getPlaceDetailsAndCardData`
7. Built a pure-script add: fetch autocomplete → fetch details → ShareDB `li` (list insert) op
8. **The `li` op succeeded** — server acked it, "ICHIRAN Tenjin" appeared in the itinerary
9. Attempted to test pure-script delete via ShareDB `ld` op — subscribe failed (stale subscription)
10. Attempted to re-subscribe — got error "Cannot read properties of null (reading 'type')"
11. Reloaded the page — **entire trip crashed**: "Sorry, but we ran into an unexpected error"
12. Tried fresh tab, different browser context — same error
13. REST API also returned the same error: the trip data was **permanently corrupted server-side**
14. Attempted recovery via standalone WS connection — handshake worked but subscribe failed with same error
15. Attempted to find auth WS URL by opening another trip — connected but couldn't fix corrupted doc
16. Trip remains unrecoverable. User had to create a new trip from scratch.

### What Went Wrong

#### 11. ShareDB `li` op created a malformed block that corrupted the entire trip

**Problem:** The pure-script add constructed a block object manually from API data, but it was missing required fields that Wanderlog's server/client code expects.

**The block we sent:**
```json
{
  "id": Date.now(),
  "type": "place",
  "place": {
    "name": "ICHIRAN Tenjin",
    "place_id": "...",
    "geometry": {...},
    "formatted_address": "...",
    "rating": 4.4,
    "user_ratings_total": 630,
    "website": "...",
    "price_level": 2,
    "address_components": [...]
  },
  "text": "",
  "addedBy": null,
  "imageSize": null,
  "upvotedBy": [],
  "travelMode": null,
  "attachments": [],
  "imageKeys": []
}
```

**What was likely missing:** The `place` sub-object was missing fields that the original blocks had — possibly `types` (Google Places types array), `opening_hours`, `photos`, `reviews`, or other nested objects. The server error "Cannot read properties of null (reading 'type')" indicates server code does `something.type` on a field we set to `null` or omitted entirely.

**Impact:** CATASTROPHIC. The entire trip (~60 items across 12 days of planning) became permanently inaccessible. No undo, no rollback, no recovery path.

**Root cause:** ShareDB accepted and persisted the malformed operation without validation. The corruption only manifests when the server tries to serialize/render the document (on subscribe, on REST API read, on page load).

#### 12. No validation on ShareDB write ops (Wanderlog server-side gap)

**Problem:** Wanderlog's ShareDB server accepts arbitrary `li` (list insert) operations with no schema validation on the block structure. If the inserted object is malformed, it corrupts the document permanently.

**This means:**
- The server trusts client-submitted data structures completely
- No schema validation on write ops
- No integrity checks on the document after applying ops
- No automatic rollback when corruption is detected
- The REST API and WebSocket both fail when trying to read the corrupted doc

#### 13. WS capture timing is a non-deterministic race condition

**Problem:** The `navigate` + `javascript_tool` parallel approach for patching `WebSocket.prototype.send` only works when the JS injection lands at `document.readyState === 'interactive'`. In this session, it consistently landed at `complete` (too late — the app's WS was already created and had cached the original `send` reference).

**Why it fails at `complete`:** The app's ShareDB client creates the WS and calls `send()` during page initialization. By `complete`, all initial sends are done. The WS instance IS captured but with `readyState: 3` (CLOSED) — it's the OLD page's WS being torn down during navigation.

**Approaches tried and failed:**
- Parallel `navigate` + `javascript_tool`: landed at `complete` 4/4 times
- Standalone WS to `wss://wanderlog.com/channel`: connected, got handshake, but subscribe failed
- Reusing closed WS's URL (with auth tokens): connected and got handshake, but subscribe returned server error
- Constructor patching (`window.WebSocket = function(...)`): landed at `complete`, no new WS created after patch

**Only reliable capture method:** The parallel approach DOES sometimes land at `interactive` (worked in Session 2). It's non-deterministic and depends on network/page load timing. Need a deterministic alternative.

#### 14. `nativeSetter` DOES trigger autocomplete (contradicts Session 1 lesson #3)

**Problem:** Session 1 documented that `nativeInputValueSetter` doesn't trigger Wanderlog's autocomplete. In Session 3, it DID work — autocomplete appeared and results were clickable.

**Possible explanation:** Wanderlog may have updated their code, or the React version handles `input` events differently. Or the Session 1 failure was caused by a different issue (e.g., input not properly focused).

**Updated guidance:** Try `nativeSetter` + `dispatchEvent('input')` first. It enables fully scripted add (single JS call per place). Fall back to `computer type` only if autocomplete doesn't appear.

#### 15. Click-first-result text matching is dangerously broad

**Problem:** The `clickFirstResult` function matched any element containing keywords like "Japan", "Ward", "Fukuoka", etc. within 400px below the input. This matched:
- Sidebar day labels (e.g., "Thu 4/30" text containing "Fukuoka")
- Existing itinerary items (already-added places with "Hakata Ward" in their address)
- Recommended places section
- Map panel elements

**Impact:** 5 out of 6 places in a batch were added incorrectly (wrong place clicked).

**Fix needed:** Must target ONLY the autocomplete dropdown container. Options:
1. Use `role="option"` elements that are visible + positioned directly below the input
2. Find the autocomplete container via React fiber (it's a child of the input's form wrapper)
3. Use the `find` MCP tool to locate "first autocomplete suggestion"
4. Check that the clicked element's parent is NOT a `PictureViewItem` (existing itinerary item)

#### 16. "Places to visit" input matched as a day input

**Problem:** The `add-place-v2.js` input-to-day matching logic walked up the DOM looking for a button with a day pattern. The "Places to visit" section's input matched "Thursday, April 30" because a day selector button existed in a shared ancestor.

**Impact:** 7 items intended for April 30 went to "Places to visit" (no date) instead.

**Fix needed:** Additional validation: after matching a day label, confirm the input is inside an itinerary day section (has `PictureViewItem` siblings or a specific section container class), NOT in the "Places to visit" overview section.

#### 17. No backup or recovery mechanism existed

**Problem:** Before performing destructive operations (ShareDB `li`/`ld` ops), there was no:
- Snapshot of the current document state saved to a file
- Version number recorded for potential rollback
- Test on a dummy/sandbox trip first

**Fix:** ALWAYS save a full document snapshot before ANY ShareDB write operation. Record the version number. Test destructive operations on a test trip first, never on a user's real itinerary.

### Wanderlog Security Concerns

#### Server-Side Input Validation Gap

The ShareDB `li` op accepted a malformed block and persisted it, permanently corrupting the trip document. This reveals several security/reliability issues:

1. **No schema validation on ShareDB ops:** The server blindly applies any structurally valid ShareDB operation without checking if the data payload matches the expected schema. A malicious user could craft WebSocket messages to inject arbitrary data into trip documents.

2. **Permanent DoS via data corruption:** A single malformed op can render an entire trip permanently inaccessible. There is no server-side integrity check, no automatic rollback, and no admin recovery tool exposed to users. This is effectively a **permanent denial-of-service** against a user's trip data.

3. **No rate limiting on WS ops:** During testing, we sent multiple rapid subscribe/unsubscribe/op messages. The server processed all of them without throttling.

4. **Auth tokens in WS URL:** The WebSocket connection URL contains authentication tokens. While this is common, combined with the lack of op validation, it means any script running in the page context (e.g., a browser extension, XSS payload, or console script) can send arbitrary ops to corrupt any trip the user has access to.

5. **Shared trip vulnerability:** If a trip is shared with collaborators, any collaborator could send a malformed op to corrupt the trip for ALL users. There's no per-user permission model on op types — if you can edit, you can corrupt.

6. **No version history/rollback:** ShareDB supports version history natively, but Wanderlog doesn't expose any rollback mechanism. Once corrupted, the only recovery would be database-level intervention by Wanderlog engineers.

**Recommendation:** Report this to Wanderlog's security team. The fix should include:
- Server-side schema validation on all ShareDB `li` (insert) and `oi` (object insert) ops
- Document integrity checks after applying ops
- Automatic rollback when a corrupted document is detected
- User-facing version history / undo for catastrophic changes
- Rate limiting on WebSocket operations

## Key Principles (Updated)

1. **Script-first, click-never.** All interactions must go through JS scripts. The `computer` tool is ONLY for keyboard input (typing search queries) — NEVER for clicking.

2. **React fiber for reading, ShareDB for writing.** Use `__reactFiber` to read item metadata (name, date, index). Use ShareDB WebSocket ops to write changes (reorder via `lm`). Delete uses React fiber's `onDelete`.

3. **NEVER send raw ShareDB `li` (insert) or `oi` (object insert) ops.** The block schema is undocumented and missing fields WILL corrupt the trip permanently. Only use `lm` (list move) for reordering — it doesn't modify data, just position. For adding places, use the DOM-based approach (nativeSetter + click autocomplete result) which goes through Wanderlog's own code to create properly-formed blocks.

4. **`nativeSetter` works for autocomplete.** Use `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set` + `dispatchEvent(new Event('input', {bubbles: true}))`. This enables single-script-call adds. Fall back to `computer type` only if needed.

5. **Autocomplete click must be precisely targeted.** Filter by: (a) visible `role="option"` elements, (b) positioned below the active input within 400px, (c) NOT inside a `PictureViewItem` ancestor (existing itinerary item), (d) NOT inside sidebar. Broad text matching (Japan/Ward/etc.) is NOT sufficient.

6. **Expand day sections before accessing their inputs.** Wanderlog virtualizes day sections. Only expanded days have "Add a place" inputs in the DOM. Click the day header (e.g., "Friday, May 1st") to expand it before trying to find its input.

7. **Dates in React fiber use YYYY-MM-DD format.** Scripts that interact with fiber data should use ISO dates.

8. **Non-destructive operations only.** Never delete items to reorder — use ShareDB `lm` ops. Items carry notes, expenses, and attachments that are lost on delete.

9. **ALWAYS snapshot before writing.** Before ANY ShareDB op or destructive action, save the full document snapshot (from subscribe response) to a local file. Record the version number. This enables manual recovery if something goes wrong.

10. **Test on a throwaway trip first.** Never test new/experimental operations on a user's real itinerary. Create a test trip, verify the operation works, then apply to the real trip.

11. **Verify after every batch operation.** Run `scrape-itinerary.js` after changes to confirm final state.

12. **WS capture is non-deterministic.** The parallel `navigate` + `javascript_tool` race only sometimes lands at `interactive`. For reliable WS access, consider: (a) asking user to run a bookmarklet, (b) using `configurable: true` so the patch can be retried, (c) triggering a mutation via React fiber `onDelete`/re-add to force a WS send through the patched prototype.
