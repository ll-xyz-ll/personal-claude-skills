// delete-item.js — Delete an item from the itinerary via React fiber onDelete
// Params: __ITEM_NAME__ (exact item name), __DATE__ (YYYY-MM-DD format)
// Returns { status, detail }
(() => {
  const ITEM_NAME = '__ITEM_NAME__';
  const DATE = '__DATE__';
  const res = { status: 'failed', detail: '' };

  const items = document.querySelectorAll('[class*="PictureViewItem__placeInputHeight"]');
  for (const el of items) {
    const fk = Object.keys(el).find(k => k.startsWith('__reactFiber'));
    if (!fk) continue;
    let fiber = el[fk];
    for (let i = 0; i < 15 && fiber; i++) {
      const p = fiber.memoizedProps;
      if (p && p.metadata && p.date === DATE && p.metadata.name === ITEM_NAME) {
        if (typeof p.onDelete === 'function') {
          p.onDelete();
          res.status = 'deleted';
          res.detail = 'Deleted "' + ITEM_NAME + '" from ' + DATE;
          return JSON.stringify(res);
        }
        res.detail = 'No onDelete function found for "' + ITEM_NAME + '"';
        return JSON.stringify(res);
      }
      fiber = fiber.return;
    }
  }

  res.detail = 'Item "' + ITEM_NAME + '" not found on date ' + DATE;
  return JSON.stringify(res);
})()
