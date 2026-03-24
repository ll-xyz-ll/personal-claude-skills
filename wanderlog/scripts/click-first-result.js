// click-first-result.js — Click the first place result in the autocomplete dropdown
// No params. Run after typing a search query into "Add a place" input.
// Retries up to 2 seconds waiting for results to appear.
// Returns { status, detail, clickedText }
(() => {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 20; // 20 x 100ms = 2 seconds

    function tryClick() {
      // Wanderlog autocomplete results are typically the first items below the input
      // They have a pin icon and address text. Look for elements with class containing
      // "Autosuggest" or similar, or just find clickable items near the focused input.

      // Strategy: find all visible elements that look like place suggestions
      // They typically contain an address (city, ward, Japan) and are inside a dropdown
      const activeInput = document.activeElement;
      if (!activeInput || activeInput.placeholder !== 'Add a place') {
        // Input lost focus, try to find the dropdown anyway
      }

      // Look for suggestion items - they're typically in a container right after/near the input
      const candidates = Array.from(document.querySelectorAll('a, div, li, button, span'))
        .filter(el => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return false;
          const t = el.textContent.trim();
          // Must contain location info (Japan, Ward, etc.) but not be a header/button
          if (t.length < 10 || t.length > 200) return false;
          // Must be near the input (within 400px below it)
          if (activeInput) {
            const inputR = activeInput.getBoundingClientRect();
            if (r.top < inputR.bottom - 5 || r.top > inputR.bottom + 400) return false;
          }
          // Should contain Japan/Ward/city address markers
          if (/Japan|Ward|Chome|Prefecture/i.test(t) && !/(See result|Add note|Add places from|Chrome extension)/i.test(t)) {
            return true;
          }
          return false;
        })
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

      if (candidates.length > 0) {
        const first = candidates[0];
        const text = first.textContent.trim().substring(0, 80);
        first.click();
        resolve(JSON.stringify({ status: 'clicked', clickedText: text }));
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        resolve(JSON.stringify({ status: 'timeout', detail: 'No place results found after 2s' }));
        return;
      }

      setTimeout(tryClick, 100);
    }

    tryClick();
  });
})()
