// open-panel.js — Open item detail panel by clicking title text
// Params: __ITEM_NAME__ (exact match)
// Returns { status, panelButton, counter }
// NEVER click images — always click the title text element
(() => {
  const ITEM_NAME = '__ITEM_NAME__';

  // Find leaf text element matching the item name exactly
  const el = Array.from(document.querySelectorAll('span, h3, h4, h5, p, a'))
    .find(e => e.textContent.trim() === ITEM_NAME && e.children.length === 0);

  if (!el) {
    return JSON.stringify({
      status: 'not_found',
      error: '"' + ITEM_NAME + '" not found in DOM. Item may be off-screen — try navigate-day.js first, or scroll down.',
      panelButton: null,
      counter: null
    });
  }

  // Scroll into view and click
  el.scrollIntoView({ behavior: 'instant', block: 'center' });
  el.click();

  // Brief sync check — look for "Added" button (panel indicator)
  const addedBtn = Array.from(document.querySelectorAll('button'))
    .find(b => (b.textContent.trim() === 'Added' || b.textContent.trim().includes('Added to'))
      && b.getBoundingClientRect().width > 0
      && b.getBoundingClientRect().width < 200);

  const counter = document.body.innerText.match(/(\d+) of (\d+)/);

  return JSON.stringify({
    status: addedBtn ? 'open' : 'clicked_waiting',
    detail: addedBtn ? 'Panel open' : 'Clicked title — panel may need a moment to render. Re-run verify-move.js to confirm.',
    panelButton: addedBtn ? addedBtn.textContent.trim() : null,
    counter: counter ? counter[0] : null,
    itemY: Math.round(el.getBoundingClientRect().y)
  });
})()
