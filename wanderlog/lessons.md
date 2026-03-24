# Wanderlog Skill — Lessons Learned

## Session: Initial Development

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
**Problem:** Had to discover deletion (`onDelete` via React fiber) and reordering (react-beautiful-dnd keyboard drag) mid-session through trial and error.
**Impact:** Wasted ~15 minutes of experimentation.
**Fix:** Created `delete-item.js` and `reorder-item.js`. These are now part of the script library.

#### 6. "Add to trip" from map search caused page crash
**Problem:** When searching for a place via the "Add a place" input, clicked "See result(s) on map" which opened the map search panel. Clicking "Add to trip" in the map panel navigated away from the plan page entirely (blank screen).
**Impact:** Had to reload the page and lost the flow.
**Fix:** NEVER use the map search panel to add items. Always select from the inline dropdown results. If the place doesn't appear in inline results, try a more specific search query.

#### 7. Programmatic `onDragEnd()` didn't persist reordering
**Problem:** Found react-beautiful-dnd's `onDragEnd` handler via fiber tree traversal and called it directly with a synthetic result object. The call returned successfully but the order didn't actually change.
**Impact:** Wasted time on an approach that looked promising but didn't work.
**Root cause:** rbd likely requires the full drag lifecycle (sensors, state machine) to properly update. Direct `onDragEnd` calls bypass internal state tracking.
**Fix:** Use real keyboard events via the `computer` tool:
  1. **JS script** focuses the `[data-rbd-draggable-id]` element (`reorder-item.js`)
  2. **Computer tool:** `key "space"` to lift
  3. **Computer tool:** `key "ArrowUp"` or `key "ArrowDown"` with `repeat: N`
  4. **Computer tool:** `key "space"` to drop

### Key Principles Established

1. **Script-first, click-never.** All interactions must go through JS scripts. The `computer` tool should only be used for keyboard input (typing search queries, space/arrow for drag) — NEVER for clicking UI elements.

2. **React fiber is the source of truth.** Use `__reactFiber` traversal to find item metadata (name, date, index), call `onDelete`, and identify drag handles. Don't rely on DOM text matching.

3. **Two-step add pattern.** Adding a place requires: (1) JS focuses input, (2) `computer` types the query, (3) wait for dropdown, (4) click first result. Steps 1 and 4 can be scripted; step 2 must use real keyboard.

4. **Dates in React fiber use YYYY-MM-DD format.** Not "Fri 1/16" or "Friday, January 16th". Scripts that interact with fiber data should use ISO dates.

5. **Scraper uses React fiber, not DOM text.** The `scrape-itinerary.js` script queries `[class*="PictureViewItem__placeInputHeight"]` elements and walks their fiber tree. DOM text walking is unreliable.

6. **Verify after every batch operation.** Run `scrape-itinerary.js` after adding/deleting/reordering to confirm the final state matches expectations.
