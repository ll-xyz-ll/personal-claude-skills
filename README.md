# Personal Claude Skills

A collection of custom [Claude Code](https://claude.ai/claude-code) skills for automating various workflows.

## Skills

### [Wanderlog](./wanderlog/)

Browser-based automation for [Wanderlog](https://wanderlog.com) trip planning. Manage itineraries, add/remove/reorder places, and optimize trip schedules — all through scripted browser interactions via Claude Code's Chrome MCP.

**Capabilities:**
- Query itinerary (scrape full trip data via React fiber)
- Add places to specific days (autocomplete search + select)
- Delete items from the itinerary
- Reorder items within a day (keyboard drag-and-drop)
- Move items between days
- Batch optimize/rearrange trips

**Requirements:**
- Claude Code with Chrome MCP (Claude in Chrome extension)
- Wanderlog trip open in Chrome, logged in

See [wanderlog/SKILL.md](./wanderlog/SKILL.md) for full usage and [wanderlog/lessons.md](./wanderlog/lessons.md) for lessons learned during development.
