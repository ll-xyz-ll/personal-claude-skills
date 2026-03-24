// find-items.js — Batch-find items in DOM by name, return positions
// Params: __ITEM_NAMES__ (JSON array of strings, e.g. ["Place A","Place B","Place C"])
// Returns { found: [{name, y, visible}], notFound: [...] }
(() => {
  const ITEM_NAMES = __ITEM_NAMES__;
  const found = [];
  const notFound = [];

  for (const name of ITEM_NAMES) {
    const el = Array.from(document.querySelectorAll('span, h3, h4, h5, p, a'))
      .find(e => e.textContent.trim() === name && e.children.length === 0);

    if (el) {
      const r = el.getBoundingClientRect();
      found.push({
        name: name,
        y: Math.round(r.y),
        visible: r.y >= 0 && r.y <= window.innerHeight && r.width > 0
      });
    } else {
      notFound.push(name);
    }
  }

  return JSON.stringify({ found, notFound, summary: found.length + '/' + ITEM_NAMES.length + ' found' });
})()
