// navigate-day.js — Click sidebar day link to navigate to a specific day
// Params: __DAY_TEXT__ (sidebar format e.g. "Fri 5/1", "Mon 5/11")
// Returns { status, detail }
(() => {
  const DAY_TEXT = '__DAY_TEXT__';
  const res = { status: 'failed', detail: '' };

  // Sidebar day links contain short text like "Fri 5/1", "Mon 5/4"
  // They are typically in the left sidebar navigation area
  const candidates = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, div, span, a, button, li'))
    .filter(el => {
      const t = el.textContent.trim();
      return t.includes(DAY_TEXT) && t.length < 60 && el.children.length <= 4
        && el.getBoundingClientRect().width > 0;
    })
    .sort((a, b) => {
      // Prefer elements with shorter text (more specific match)
      return a.textContent.trim().length - b.textContent.trim().length;
    });

  if (candidates.length === 0) {
    res.detail = 'Sidebar link "' + DAY_TEXT + '" not found. The sidebar may not be visible or uses a different format.';
    return JSON.stringify(res);
  }

  // Click the most specific (shortest text) match
  const target = candidates[0];
  target.click();

  res.status = 'navigated';
  res.detail = 'Clicked "' + target.textContent.trim().substring(0, 40) + '" — scrolled to ' + DAY_TEXT;
  return JSON.stringify(res);
})()
