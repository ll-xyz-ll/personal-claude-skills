# Wanderlog Trip Manager — Claude Code Skill

Automate [Wanderlog](https://wanderlog.com) trip planning through scripted browser interactions. No manual clicking — everything runs through JavaScript scripts executed via Claude Code's Chrome MCP.

## Setup

1. Install the [Claude in Chrome](https://chromewebstore.google.com/detail/claude-in-chrome/) extension
2. Open your Wanderlog trip in Chrome and log in
3. Copy the skill files to `~/.claude/commands/wanderlog/`
4. Invoke with `/wanderlog` in Claude Code

## Scripts

| Script | Purpose |
|---|---|
| `scrape-itinerary.js` | Read full itinerary via React fiber → JSON |
| `add-place-v2.js` | Focus "Add a place" input for a specific day |
| `add-place-full.js` | Complete add-place flow with MutationObserver |
| `click-first-result.js` | Click first autocomplete result |
| `focus-day-input.js` | Focus day input by day name |
| `delete-item.js` | Delete item via React fiber `onDelete` |
| `reorder-item.js` | Focus drag handle for keyboard reorder |
| `open-panel.js` | Open item detail panel |
| `move-item.js` | Move item between days |
| `close-panel.js` | Close the right panel |
| `navigate-day.js` | Navigate to a day via sidebar |
| `find-items.js` | Batch-find items in DOM |
| `read-dropdown.js` | Read checked days in dropdown |
| `verify-move.js` | Verify panel state after move |
| `remove-from-day.js` | Remove item from a day |

## Key Principles

1. **Script-first, click-never.** All interactions go through JS scripts. The `computer` tool is only for keyboard input (typing search queries, Space/Arrow for drag-reorder).
2. **React fiber is the source of truth.** Use `__reactFiber` traversal for item metadata.
3. **Two-step add pattern.** JS focuses input → `computer` types query → select from dropdown.
4. **Verify after every batch.** Run `scrape-itinerary.js` after changes to confirm state.

## Lessons Learned

See [lessons.md](./lessons.md) for detailed failure modes and fixes discovered during development.
