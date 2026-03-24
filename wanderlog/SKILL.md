---
name: wanderlog
version: "4.0"
description: >
  Manage, plan, and edit Wanderlog trip itineraries via browser automation.
  Supports: querying what's on each day, optimizing/rearranging items between days,
  planning itineraries from scratch, adding new places, removing items, and batch moves.
  This skill should be used when the user says "rearrange my Wanderlog", "what's on my itinerary",
  "optimize my trip schedule", "move X to day Y", "add a restaurant to my trip",
  "plan my food itinerary", "remove X from the trip", "show me what's on each day",
  "spread out the food across days", or similar trip management requests.
  Requires Chrome tab with Wanderlog open and user logged in.
  If the trip hasn't been created yet, user must create it on wanderlog.com and provide the URL.
---

# Wanderlog Trip Manager

## Critical Rules (Read First)

1. **Script-first, click-never.** ALL interactions MUST go through JS scripts. The `computer` tool is ONLY for keyboard input (typing search queries, Space/Arrow for drag-reorder). NEVER use `computer` tool to click buttons, links, or UI elements.
2. **If a script fails, fix the script.** Never fall back to manual browser clicking as a workaround.
3. **React fiber is the source of truth.** Use `__reactFiber` traversal for item metadata. Don't rely on DOM text matching.
4. **NEVER use map search panel.** When adding places, always select from the inline autocomplete dropdown. Clicking "See result(s) on map" or "Add to trip" from the map panel can crash the page.
5. **Verify after every batch.** Run `scrape-itinerary.js` after add/delete/reorder to confirm final state.
6. **Read `lessons.md`** in this skill directory for detailed failure modes and fixes from prior sessions.

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
| `delete-item.js` | Delete item via React fiber `onDelete` | `__ITEM_NAME__`, `__DATE__` (YYYY-MM-DD) | Immediate, no confirmation dialog. |
| `reorder-item.js` | Focus drag handle for keyboard reorder | `__ITEM_NAME__`, `__DATE__` (YYYY-MM-DD) | Step 1 of reorder. Then: `key space` → `key ArrowUp/Down repeat:N` → `key space`. |

### Legacy Scripts (Use Only for Cross-Day Moves)

| Script | Purpose | Params |
|---|---|---|
| `open-panel.js` | Open item detail panel | `__ITEM_NAME__` |
| `move-item.js` | Move item between days (steps 3-6) | `__TARGET_DAY__`, `__SOURCE_DAY__` |
| `remove-from-day.js` | Remove item from a day | `__DAY_TO_REMOVE__` |
| `navigate-day.js` | Navigate to a day via sidebar | `__DAY_TEXT__` |
| `find-items.js` | Batch-find items in DOM | `__ITEM_NAMES__` (JSON array) |
| `read-dropdown.js` | Read checked days in dropdown | none (dropdown must be open) |
| `verify-move.js` | Check panel state after move | none (panel must be open) |
| `close-panel.js` | Close the right panel | none |
| `add-place.js` | **DEPRECATED** — use `add-place-v2.js` | — |

## Capabilities

### 1. Query Itinerary ("what's on day 3?")
1. Run `scrape-itinerary.js` — returns `{ days, itemsByDay, stats }` with YYYY-MM-DD keys
2. Answer the user's question from the JSON data

### 2. Add Place ("add Restaurant X to Friday")
**Three-step process — no clicking:**
1. Run `add-place-v2.js` with `__TARGET_DAY__` = `"Friday, January 16"` → focuses the input
2. Use `computer` tool `action=type` with the search query → triggers autocomplete dropdown
3. Use `computer` tool `action=screenshot` to see results, then click first result OR use JS to find and click the correct result element
4. Verify with `scrape-itinerary.js`

**Batch adding:** Repeat steps 1-3 for each place. The `add-place-v2.js` script re-finds the input each time.

### 3. Delete Item ("remove Place X from the trip")
1. Run `scrape-itinerary.js` to get exact item name and date (YYYY-MM-DD)
2. Run `delete-item.js` with `__ITEM_NAME__` and `__DATE__`
3. Verify with `scrape-itinerary.js`

### 4. Reorder Within a Day ("move X to the top of Friday")
**Keyboard drag via react-beautiful-dnd:**
1. Run `scrape-itinerary.js` to get current order and calculate moves needed
2. Run `reorder-item.js` with `__ITEM_NAME__` and `__DATE__` → focuses the drag handle
3. `computer` tool: `key "space"` to lift
4. `computer` tool: `key "ArrowUp"` (or `"ArrowDown"`) with `repeat: N` (N = positions to move)
5. `computer` tool: `key "space"` to drop
6. Verify with `scrape-itinerary.js`

**WARNING:** Calling `onDragEnd` programmatically does NOT work. Only real keyboard events persist the reorder.

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
3. For each approved item: `add-place-v2.js` → `computer type` → select result
4. Reorder items within each day using `reorder-item.js` + keyboard
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
| `onDragEnd()` didn't persist reorder | Called programmatically | Only real keyboard events work: focus → space → arrows → space |
| `add-place.js` couldn't find button | Script searched for `<button>` not `<input>` | Use `add-place-v2.js` which queries `input[placeholder="Add a place"]` |
| Item not in DOM | Off-screen / lazy-loaded | Scroll to day header via JS `scrollIntoView()` first |
