// ws-reorder.js — Reorder an item within a day via ShareDB WebSocket ops
// Params: __ITEM_NAME__ (exact name), __DATE__ (YYYY-MM-DD), __TARGET_INDEX__ (0-based target position)
// Prereq: ws-capture.js must have been run AND user must have interacted with the page
//         so that window.__liveWS is available
//
// How it works:
//   1. Subscribes to the trip doc via ShareDB to get current version + section structure
//   2. Finds the correct section index and block index for the item
//   3. Sends a ShareDB `lm` (list move) operation to move the block
//
// Returns { status, detail, fromIndex, toIndex, sectionIndex }
(() => {
  const ITEM_NAME = '__ITEM_NAME__';
  const DATE = '__DATE__';
  const TARGET_INDEX = __TARGET_INDEX__;
  const res = { status: 'failed', detail: '' };

  const ws = window.__liveWS;
  if (!ws || ws.readyState !== 1) {
    res.detail = 'No live WebSocket. Run ws-capture.js first, then interact with the page.';
    return JSON.stringify(res);
  }

  // Get trip ID from URL
  const match = location.pathname.match(/\/plan\/([a-z0-9]+)/);
  if (!match) {
    res.detail = 'Could not extract trip ID from URL: ' + location.pathname;
    return JSON.stringify(res);
  }
  const tripId = match[1];

  const responses = [];
  const handler = (event) => {
    try { responses.push(JSON.parse(event.data)); } catch(e) {}
  };
  ws.addEventListener('message', handler);

  // Subscribe to get full doc snapshot
  ws.send(JSON.stringify({ a: 's', c: 'TripPlans', d: tripId, v: null }));

  return new Promise(resolve => {
    setTimeout(() => {
      const snap = responses.find(r => r.data);
      if (!snap) {
        ws.removeEventListener('message', handler);
        res.detail = 'No snapshot received from ShareDB';
        resolve(JSON.stringify(res));
        return;
      }

      const doc = snap.data.data || snap.data;
      const version = snap.data.v || snap.v;

      if (!doc.itinerary || !doc.itinerary.sections) {
        ws.removeEventListener('message', handler);
        res.detail = 'No itinerary.sections in doc';
        resolve(JSON.stringify(res));
        return;
      }

      // Find the section containing ITEM_NAME
      let sectionIndex = -1;
      let blockIndex = -1;
      const sections = doc.itinerary.sections;

      for (let si = 0; si < sections.length; si++) {
        const sec = sections[si];
        if (!sec.blocks) continue;
        for (let bi = 0; bi < sec.blocks.length; bi++) {
          const b = sec.blocks[bi];
          const name = b.place?.name || b.place?.googlePlace?.name || '';
          if (name === ITEM_NAME) {
            sectionIndex = si;
            blockIndex = bi;
            break;
          }
        }
        if (sectionIndex >= 0) break;
      }

      if (sectionIndex < 0) {
        ws.removeEventListener('message', handler);
        res.detail = 'Item "' + ITEM_NAME + '" not found in any section';
        resolve(JSON.stringify(res));
        return;
      }

      if (blockIndex === TARGET_INDEX) {
        ws.removeEventListener('message', handler);
        res.status = 'no_change';
        res.detail = '"' + ITEM_NAME + '" is already at index ' + TARGET_INDEX;
        res.sectionIndex = sectionIndex;
        resolve(JSON.stringify(res));
        return;
      }

      // Send lm (list move) operation
      const op = [{ p: ['itinerary', 'sections', sectionIndex, 'blocks', blockIndex], lm: TARGET_INDEX }];
      ws.send(JSON.stringify({
        a: 'op', c: 'TripPlans', d: tripId,
        v: version, seq: Date.now() % 100000, x: {},
        op: op
      }));

      // Wait for ack
      setTimeout(() => {
        ws.removeEventListener('message', handler);
        const ack = responses.find(r => r.a === 'op' || r.v !== undefined);
        if (ack && !ack.error) {
          res.status = 'reordered';
          res.detail = 'Moved "' + ITEM_NAME + '" from index ' + blockIndex + ' to ' + TARGET_INDEX + ' in section ' + sectionIndex;
          res.fromIndex = blockIndex;
          res.toIndex = TARGET_INDEX;
          res.sectionIndex = sectionIndex;
        } else {
          res.detail = 'Op failed: ' + (ack?.error || 'no ack received');
        }
        resolve(JSON.stringify(res));
      }, 2000);
    }, 3000);
  });
})()
