// ws-capture.js — Capture Wanderlog's live WebSocket for ShareDB operations
// No params. Must be run BEFORE the user performs any action on the page.
// After running, the user must click/interact with the trip once to flush a WS send.
// Then check window.__liveWS for the captured instance.
//
// Returns { status, detail }
//
// Usage flow:
//   1. Run this script (patches WebSocket.prototype.send)
//   2. Ask user to click any item on the trip
//   3. Check: window.__liveWS?.readyState === 1
//   4. Use ws-reorder.js or send ShareDB ops directly
(() => {
  const res = { status: 'failed', detail: '' };

  try {
    const origSend = WebSocket.prototype.send;
    Object.defineProperty(WebSocket.prototype, 'send', {
      value: function(data) {
        if (this.readyState === 1) {
          window.__liveWS = this;
          window.__wsSendCount = (window.__wsSendCount || 0) + 1;
        }
        return origSend.call(this, data);
      },
      writable: false,
      configurable: false
    });
    window.__wsSendCount = 0;
    res.status = 'patched';
    res.detail = 'WebSocket.prototype.send patched (non-configurable). User must interact with the trip to capture the WS instance.';
  } catch (e) {
    if (e.message.includes('configurable')) {
      res.status = 'already_patched';
      res.detail = 'Patch already applied. Check window.__liveWS.';
    } else {
      res.detail = 'Patch failed: ' + e.message;
    }
  }

  return JSON.stringify(res);
})()
