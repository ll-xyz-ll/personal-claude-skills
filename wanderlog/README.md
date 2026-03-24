# Wanderlog Trip Manager — Claude Code Skill

Automate [Wanderlog](https://wanderlog.com) trip planning through scripted browser interactions. No manual clicking — everything runs through JavaScript scripts executed via Claude Code's Chrome MCP.

## What It Does

- **Query** your full itinerary (scrapes all days/items via React fiber)
- **Add places** to specific days (autocomplete search + auto-select)
- **Delete items** from any day (instant, via React fiber `onDelete`)
- **Reorder items** within a day (via ShareDB WebSocket `lm` ops — the only reliable method)
- **Move items** between days (cross-day panel-based flow)
- **Batch optimize** trips (analyze overloaded days, suggest and execute rearrangements)
- **Plan from scratch** (web search for restaurants/attractions, add to itinerary)

## Prerequisites

- [Claude Code](https://claude.ai/claude-code) CLI
- [Claude in Chrome](https://chromewebstore.google.com/detail/claude-in-chrome/) browser extension
- A Wanderlog trip open in Chrome, logged in

## Installation

Copy the skill folder to your Claude Code commands directory:

```bash
# macOS/Linux
cp -r wanderlog/ ~/.claude/commands/wanderlog/

# Windows
xcopy /E wanderlog\ %USERPROFILE%\.claude\commands\wanderlog\
```

## Usage

1. Open your Wanderlog trip in Chrome and log in
2. In Claude Code, run `/wanderlog`
3. Provide the trip URL when asked (e.g. `https://wanderlog.com/plan/XXXXXXXX`)

### Example Commands

```
/wanderlog what's on each day of my trip?
/wanderlog add Ichiran Ramen to Friday
/wanderlog remove the museum from Saturday
/wanderlog move the temple to the top of Thursday
/wanderlog spread out the food places across days
/wanderlog plan a 3-day Tokyo food trip
```

## How It Works

### Architecture

The skill uses **three layers** to interact with Wanderlog:

| Layer | Used For | Mechanism |
|---|---|---|
| **React Fiber** | Reading data (scrape, find items) | Walk `__reactFiber` tree from DOM elements to get item metadata (name, date, index) |
| **DOM Automation** | Adding places, deleting items | Focus inputs via JS, type via keyboard events, call `onDelete` from fiber props |
| **ShareDB WebSocket** | Reordering items | Capture live WS, subscribe to trip doc, send `lm` (list move) OT operations |

### Why ShareDB?

Wanderlog uses [ShareDB](https://github.com/share/sharedb) for real-time collaboration — no REST API, no Firebase. The trip document is synced over WebSocket using operational transforms. This means:

- **Reordering** can't be done via the UI (keyboard drag is unreliable through automation)
- **Reordering** can't be done via `onDragEnd` (rbd silently ignores programmatic calls)
- **Reordering works** by sending `lm` ops directly to ShareDB over the WebSocket

### Script Flow Examples

**Adding a place:**
```
add-place-v2.js (focus input) → computer type (search query) → click-first-result.js (select)
```

**Reordering:**
```
ws-capture.js (patch WS) → user click (capture instance) → reorder-item.js (send lm op)
```

**Deleting:**
```
scrape-itinerary.js (get name + date) → delete-item.js (call onDelete)
```

## Scripts Reference

### Core Scripts

| Script | Purpose | Params |
|---|---|---|
| `scrape-itinerary.js` | Read full itinerary → JSON | none |
| `add-place-v2.js` | Focus "Add a place" input for a day | `__TARGET_DAY__` |
| `click-first-result.js` | Click first autocomplete result | none |
| `delete-item.js` | Delete item via fiber `onDelete` | `__ITEM_NAME__`, `__DATE__` |
| `ws-capture.js` | Capture live WebSocket instance | none |
| `reorder-item.js` | Reorder via ShareDB `lm` op | `__ITEM_NAME__`, `__DATE__`, `__TARGET_INDEX__` |

### Legacy Scripts (Cross-Day Moves)

| Script | Purpose | Params |
|---|---|---|
| `open-panel.js` | Open item detail panel | `__ITEM_NAME__` |
| `move-item.js` | Move item between days | `__TARGET_DAY__`, `__SOURCE_DAY__` |
| `remove-from-day.js` | Remove item from a day | `__DAY_TO_REMOVE__` |
| `find-items.js` | Batch-find items in DOM | `__ITEM_NAMES__` |
| `navigate-day.js` | Scroll to a day (unreliable) | `__DAY_TEXT__` |
| `close-panel.js` | Close the right panel | none |
| `verify-move.js` | Check panel state after move | none |
| `read-dropdown.js` | Read checked days in dropdown | none |

## Key Principles

1. **Script-first, click-never.** All interactions go through JS scripts. The `computer` tool is only for keyboard input (typing search queries).
2. **React fiber for reading, ShareDB for writing.** Read item data via fiber. Write changes via ShareDB ops. Delete via fiber's `onDelete`.
3. **Non-destructive operations only.** Never delete items to reorder — use ShareDB `lm` ops. Items carry notes, expenses, and attachments that are lost on delete.
4. **Verify after every batch.** Run `scrape-itinerary.js` after changes to confirm state.
5. **Understand the data layer before fighting the UI.** When UI automation fails, investigate the app's data persistence mechanism and operate at that level.

## Lessons Learned

See [references/lessons.md](./references/lessons.md) for detailed failure analysis and discoveries from development, including why keyboard drag doesn't work and how the ShareDB WebSocket approach was discovered.
