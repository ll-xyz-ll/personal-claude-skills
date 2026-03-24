// scrape-itinerary.js — Read full Wanderlog itinerary from React fiber data → JSON
// No parameters needed. Returns { days, itemsByDay, stats }
// Execute via mcp__Claude_in_Chrome__javascript_tool
(() => {
  const allFound = new Map();
  const items = document.querySelectorAll('[class*="PictureViewItem__placeInputHeight"]');
  for (const el of items) {
    const fk = Object.keys(el).find(k => k.startsWith('__reactFiber'));
    if (!fk) continue;
    let fiber = el[fk];
    for (let i = 0; i < 15 && fiber; i++) {
      const p = fiber.memoizedProps;
      if (p && p.metadata && p.date !== undefined) {
        const key = p.metadata.name + '|' + String(p.date);
        if (!allFound.has(key)) {
          allFound.set(key, {
            name: p.metadata.name,
            date: String(p.date),
            categories: (p.metadata.categories || []).join(', ')
          });
        }
        break;
      }
      fiber = fiber.return;
    }
  }

  // Group by date
  const byDate = {};
  const days = [];
  for (const v of allFound.values()) {
    const d = v.date || 'unscheduled';
    if (!byDate[d]) {
      byDate[d] = [];
      days.push(d);
    }
    byDate[d].push(v.name);
  }

  days.sort();
  const result = {
    days: days,
    itemsByDay: {},
    stats: { totalItems: allFound.size, totalDays: days.length }
  };
  for (const d of days) {
    result.itemsByDay[d] = byDate[d];
  }

  return JSON.stringify(result, null, 2);
})()
