// reorder-item.js — Reorder an item within a day via ShareDB WebSocket `lm` ops
// Params: __ITEM_NAME__ (exact item name), __DATE__ (YYYY-MM-DD), __TARGET_INDEX__ (0-based)
//
// Prereq: Run ws-capture.js first, then user must interact with page once.
//
// How it works:
//   1. Subscribes to the trip doc via ShareDB to get current version + structure
//   2. Finds the section matching __DATE__ and block matching __ITEM_NAME__
//   3. Sends a ShareDB `lm` (list move) op to reorder
//
// NOTE: Keyboard drag via react-beautiful-dnd is unreliable (lift ~50%, drop
// never persists). Programmatic onDragEnd is silently ignored. ShareDB `lm`
// ops are the only reliable reorder method.
//
// Returns { status, detail, fromIndex, toIndex, sectionIndex }
(() => {
  const ITEM_NAME = '__ITEM_NAME__';
  const DATE = '__DATE__';
  const TARGET_INDEX = __TARGET_INDEX__;
  const res = { status: 'failed', detail: '' };

  const ws = window.__liveWS;
  if (!ws || ws.readyState !== 1) {
    res.detail = 'No live WebSocket captured. Run ws-capture.js first, then interact with the page.';
    return JSON.stringify(res);
  }

  const match = location.pathname.match(/\/plan\/([a-z0-9]+)/);
  if (!match) {
    res.detail = 'Could not extract trip ID from URL';
    return JSON.stringify(res);
  }
  const tripId = match[1];

  const seqId = Date.now() % 100000;
  const responses = [];
  const handler = (event) => {
    try { responses.push(JSON.parse(event.data)); } catch(e) {}
  };
  ws.addEventListener('message', handler);
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
      if (!doc.itinerary?.sections) {
        ws.removeEventListener('message', handler);
        res.detail = 'No itinerary sections in doc';
        resolve(JSON.stringify(res));
        return;
      }

      // Find the section matching DATE and block matching ITEM_NAME
      let sectionIndex = -1, blockIndex = -1;
      for (let si = 0; si < doc.itinerary.sections.length; si++) {
        const sec = doc.itinerary.sections[si];
        if (!sec.blocks) continue;

        // Match section to DATE via the section's date field or startDate
        const secDate = sec.date || sec.startDate || '';
        if (DATE && secDate && !secDate.includes(DATE)) continue;

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

      // Fallback: if date filtering found nothing, search all sections
      if (sectionIndex < 0) {
        for (let si = 0; si < doc.itinerary.sections.length; si++) {
          const sec = doc.itinerary.sections[si];
          if (!sec.blocks) continue;
          for (let bi = 0; bi < sec.blocks.length; bi++) {
            const name = sec.blocks[bi].place?.name || sec.blocks[bi].place?.googlePlace?.name || '';
            if (name === ITEM_NAME) { sectionIndex = si; blockIndex = bi; break; }
          }
          if (sectionIndex >= 0) break;
        }
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
        resolve(JSON.stringify(res));
        return;
      }

      ws.send(JSON.stringify({
        a: 'op', c: 'TripPlans', d: tripId,
        v: version, seq: seqId, x: {},
        op: [{ p: ['itinerary', 'sections', sectionIndex, 'blocks', blockIndex], lm: TARGET_INDEX }]
      }));

      setTimeout(() => {
        ws.removeEventListener('message', handler);
        // Match ack by our seq number
        const ack = responses.find(r => r.a === 'op' && r.seq === seqId);
        if (ack && !ack.error) {
          res.status = 'reordered';
          res.detail = 'Moved "' + ITEM_NAME + '" from index ' + blockIndex + ' to ' + TARGET_INDEX + ' in section ' + sectionIndex;
          res.fromIndex = blockIndex;
          res.toIndex = TARGET_INDEX;
          res.sectionIndex = sectionIndex;
        } else {
          res.detail = 'Op failed: ' + (ack?.error || 'no ack for seq ' + seqId);
        }
        resolve(JSON.stringify(res));
      }, 2000);
    }, 3000);
  });
})()
