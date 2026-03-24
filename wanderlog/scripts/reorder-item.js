// reorder-item.js — Focus an item's drag handle for keyboard reordering
// Params: __ITEM_NAME__ (exact item name), __DATE__ (YYYY-MM-DD format)
//
// Step 1: Run this script to focus the drag handle
// Step 2: Use computer tool: key "space" to lift
// Step 3: Use computer tool: key "ArrowUp" or "ArrowDown" with repeat N
// Step 4: Use computer tool: key "space" to drop
//
// Returns { status, dragId, currentIndex }
(() => {
  const ITEM_NAME = '__ITEM_NAME__';
  const DATE = '__DATE__';
  const res = { status: 'failed', detail: '' };

  const draggables = document.querySelectorAll('[data-rbd-draggable-id]');
  for (const el of draggables) {
    const dragId = el.getAttribute('data-rbd-draggable-id');
    const itemEl = el.querySelector('[class*="PictureViewItem__placeInputHeight"]');
    if (!itemEl) continue;

    const fk = Object.keys(itemEl).find(k => k.startsWith('__reactFiber'));
    if (!fk) continue;
    let fiber = itemEl[fk];
    for (let i = 0; i < 15 && fiber; i++) {
      const p = fiber.memoizedProps;
      if (p && p.metadata && p.date === DATE && p.metadata.name === ITEM_NAME) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.focus();
        res.status = 'focused';
        res.dragId = dragId;
        res.currentIndex = p.index;
        res.detail = 'Focused "' + ITEM_NAME + '" (index ' + p.index + '). Now: space → ArrowUp/Down × N → space';
        return JSON.stringify(res);
      }
      fiber = fiber.return;
    }
  }

  res.detail = 'Item "' + ITEM_NAME + '" not found on date ' + DATE;
  return JSON.stringify(res);
})()
