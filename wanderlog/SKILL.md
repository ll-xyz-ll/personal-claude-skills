---
name: wanderlog
version: 4.1.0
description: >
  Manage, plan, and edit Wanderlog trip itineraries via browser automation.
  Supports querying what's on each day, optimizing/rearranging items between days,
  planning itineraries from scratch, adding new places, removing items, and batch moves.
  This skill should be used when the user says "rearrange my Wanderlog", "what's on my itinerary",
  "optimize my trip schedule", "move X to day Y", "add a restaurant to my trip",
  "plan my travel itinerary", "remove X from the trip", "show me what's on each day",
  "spread out the food across days", or similar trip management requests.
  Requires Chrome tab with Wanderlog open and user logged in.
---

# Wanderlog Trip Manager

## Critical Rules (Read First)

1. **Script-first, click-never.** ALL interactions MUST go through JS scripts. The `computer` tool is ONLY for keyboard input (typing search queries, Space/Arrow for drag-reorder). NEVER use `computer` tool to click buttons, links, or UI elements.
2. **If a script fails, fix the script.** Never fall back to manual browser clicking as a workaround.
3. **React fiber is the source of truth.** Use `__reactFiber` traversal for item metadata. Don't rely on DOM text matching.
4. **NEVER use map search panel.** When adding places, always select from the inline autocomplete dropdown. Clicking "See result(s) on map" or "Add to trip" from the map panel can crash the page.
5. **Verify after every batch.** Run `scrape-itinerary.js` after add/delete/reorder to confirm final state.

For detailed rationale and failure analysis behind these rules, see `references/lessons.md`.

## Setup (Always Do First)

1. Ask: "Please open your Wanderlog trip in Chrome and log in, then confirm."
2. Ask: "What is the Wanderlog URL?" (e.g. `https://wanderlog.com/plan/XXXXXXXX`)
3. If trip doesn't exist yet: "Please create the trip on wanderlog.com first, then share the URL with me."
4. Get tab ID via `mcp__Claude_in_Chrome__tabs_context_mcp` — match by URL containing "wanderlog.com/plan"

## Scripts

All automation scripts are in the `scripts/` subdirectory. Read a script with the Read tool, replace `__PLACEHOLDER__` tokens with actual values, then execute via `mcp__Claude_in_Chrome__javascript_tool`. All scripts return JSON.

### Core Scripts (Preferred)

| Script | Purpose | Params | Notes |
|---|---|---|---|
| `scrape-itinerary.js` | Read full itinerary via React fiber → JSON | none | Uses `PictureViewItem` + fiber. Returns `{ days, itemsByDay, stats }`. Dates are YYYY-MM-DD. |
| `add-place-v2.js` | Focus "Add a place" input for a specific day | `__TARGET_DAY__` (e.g. "Thursday, January 15") | Step 1 of add flow. Then use `computer tool type` for search query. |
| `click-first-result.js` | Click first place result in autocomplete dropdown | none | Step 3 of add flow. Run after typing search query. Retries for 2s. |
| `delete-item.js` | Delete item via React fiber `onDelete` | `__ITEM_NAME__`, `__DATE__` (YYYY-MM-DD) | Immediate, no confirmation dialog. |
| `ws-capture.js` | Capture Wanderlog's live WebSocket | none | Run once per page load. User must interact with page after. Uses `configurable: false` — cannot be undone without page reload. |
| `reorder-item.js` | Reorder item via ShareDB `lm` op | `__ITEM_NAME__`, `__DATE__` (YYYY-MM-DD), `__TARGET_INDEX__` (0-based) | Requires ws-capture.js first. Filters by date then falls back to name-only search. |

### Legacy Scripts (Use Only for Cross-Day Moves)

| Script | Purpose | Params |
|---|---|---|
| `open-panel.js` | Open item detail panel | `__ITEM_NAME__` |
| `move-item.js` | Move item between days (steps 3-6) | `__TARGET_DAY__`, `__SOURCE_DAY__` |
| `remove-from-day.js` | Remove item from a day | `__DAY_TO_REMOVE__` |
| `navigate-day.js` | Navigate to a day via sidebar (**unreliable** — prefer `scrollIntoView()`) | `__DAY_TEXT__` |
| `find-items.js` | Batch-find items in DOM | `__ITEM_NAMES__` (JSON array) |
| `read-dropdown.js` | Read checked days in dropdown | none (dropdown must be open) |
| `verify-move.js` | Check panel state after move | none (panel must be open) |
| `close-panel.js` | Close the right panel | none |

## Capabilities

### 1. Query Itinerary ("what's on day 3?")
1. Run `scrape-itinerary.js` — returns `{ days, itemsByDay, stats }` with YYYY-MM-DD keys
2. Answer the user's question from the JSON data

### 2. Add Place ("add Restaurant X to Friday")
**Four-step process — no clicking:**
1. Run `add-place-v2.js` with `__TARGET_DAY__` = `"Friday, January 16"` → focuses the input
2. Use `computer` tool `action=type` with the search query → triggers autocomplete dropdown
3. Run `click-first-result.js` to select the first place result
4. Verify with `scrape-itinerary.js`

**Batch adding:** Repeat steps 1-3 for each place. The `add-place-v2.js` script re-finds the input each time.

### 3. Delete Item ("remove Place X from the trip")
1. Run `scrape-itinerary.js` to get exact item name and date (YYYY-MM-DD)
2. Run `delete-item.js` with `__ITEM_NAME__` and `__DATE__`
3. Verify with `scrape-itinerary.js`

### 4. Reorder Within a Day ("move X to the top of Friday")
**Via ShareDB WebSocket (reliable):**
1. Run `ws-capture.js` to patch WebSocket (once per page load)
2. Ask user to click any item on the trip (flushes a WS send, captures the instance)
3. Run `scrape-itinerary.js` to get current order and calculate target index
4. Run `reorder-item.js` with `__ITEM_NAME__`, `__DATE__`, `__TARGET_INDEX__` (0-based)
5. Verify with `scrape-itinerary.js`

**NOTE:** Keyboard drag via react-beautiful-dnd is unreliable — lift works ~50%, drop never persists. Programmatic `onDragEnd` is silently ignored. ShareDB `lm` ops are the only reliable method.

### 5. Move Item Between Days ("move Restaurant X to Sunday")
1. `open-panel.js` with `__ITEM_NAME__` = "Restaurant X"
2. `move-item.js` with `__TARGET_DAY__` = "Sun, Jan 19th", `__SOURCE_DAY__` = "Fri, Jan 16th"
3. `verify-move.js` to confirm

### 6. Optimize / Rearrange ("spread food across days")
1. Run `scrape-itinerary.js` to get current state
2. Analyze: identify overloaded days, meal timing conflicts, geographic grouping
3. Present a **before/after move plan** to the user — get approval before executing
4. Execute approved changes using add/delete/reorder/move scripts
5. Run `scrape-itinerary.js` again to verify

### 7. Plan From Scratch ("plan a 3-day food trip")
1. Use web search + knowledge to suggest restaurants/places
2. Present plan to user for approval
3. For each approved item: `add-place-v2.js` → `computer type` → `click-first-result.js`
4. Reorder items within each day using `reorder-item.js` (ShareDB `lm` ops)
5. Verify with `scrape-itinerary.js`

## Day Name Formats

| Context | Format | Example |
|---|---|---|
| React fiber / scraper | `YYYY-MM-DD` | `2025-01-15` |
| add-place-v2.js param | `Weekday, Month D` | `Friday, January 16` |
| Sidebar | `Day M/D` | `Fri 1/16`, `Mon 1/19` |
| Dropdown (legacy moves) | `Day, Mon DDth` | `Fri, Jan 16th`, `Mon, Jan 19th` |

Always use `.includes()` when matching — never strict equality.

## Move Sequence (Legacy — Cross-Day Moves Only)

Moving an item = **add to target day, then remove from source day**. This is a 2-phase operation:

1. **open-panel.js** — opens the item's detail panel (clicks title text, NEVER images)
2. **move-item.js** — runs steps 3-6 synchronously:
   - Step 3: Opens dropdown toggle (small empty button right of "Added" button)
   - Step 4: Clicks target day (item is now on BOTH days → "Added to 2 lists")
   - Step 5: Verifies "Added to 2 lists" then reopens dropdown
   - Step 6: Unchecks source day (item is now only on target → "Added")

**If move-item.js returns `status: "partial"`** — Step 4 didn't register. Retry before proceeding.

## Pitfalls

| Problem | Cause | Fix |
|---|---|---|
| "Change photo" dialog | Clicked image | Use `open-panel.js` — it clicks title text |
| Item removed from ALL days | Unchecked source before target confirmed | `move-item.js` has built-in guard |
| Search typed but no dropdown | Used `nativeInputValueSetter` | Must use `computer` tool `action=type` for real keyboard events |
| Page went blank/crashed | Clicked "Add to trip" in map search panel | NEVER use map search. Always pick from inline autocomplete |
| Sidebar navigation went to wrong day | `navigate-day.js` matched wrong element | Use JS to find day header button and `scrollIntoView()` directly |
| `onDragEnd()` didn't persist reorder | Called programmatically | rbd ignores calls outside drag lifecycle. Use ShareDB `lm` ops via `ws-reorder.js` |
| Keyboard drag unreliable | Lift ~50%, drop never persists | Use ShareDB `lm` ops instead. See `ws-capture.js` + `ws-reorder.js` |
| No WebSocket captured | `ws-capture.js` run but no user interaction | User must click/interact with the trip after running ws-capture.js |
| Item not in DOM | Off-screen / lazy-loaded | Scroll to day header via JS `scrollIntoView()` first |
