// click-first-result.js — Click the first place result in the autocomplete dropdown
// No params. Run after typing a search query into "Add a place" input.
// Retries up to 3 seconds waiting for results to appear.
//
// SAFETY: Only targets autocomplete dropdown items. Excludes:
// - Existing itinerary items (PictureViewItem ancestors)
// - Sidebar elements (x < 200px)
// - Recommended places / "Browse all" / map panel elements
// - "See result(s) on map" links
//
// Returns { status, clickedText } or { status: 'timeout' }
(() => {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 30; // 30 x 100ms = 3 seconds

    function isInsideItineraryItem(el) {
      let parent = el;
      for (let i = 0; i < 15 && parent; i++) {
        if (parent.className && typeof parent.className === 'string' &&
            parent.className.includes('PictureViewItem')) return true;
        parent = parent.parentElement;
      }
      return false;
    }

    function isInsideSidebar(el) {
      const r = el.getBoundingClientRect();
      return r.right < 200;
    }

    function tryClick() {
      const activeInput = document.activeElement;
      const inputR = activeInput?.getBoundingClientRect();

      // Strategy 1: Look for role="option" elements near the input
      // These are the most specific autocomplete indicators
      const options = Array.from(document.querySelectorAll('[role="option"]'))
        .filter(el => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return false;
          if (isInsideItineraryItem(el)) return false;
          if (isInsideSidebar(el)) return false;
          // Must be below the input
          if (inputR && (r.top < inputR.bottom - 5 || r.top > inputR.bottom + 400)) return false;
          // Exclude known non-result elements
          const t = el.textContent.trim();
          if (/(See result|Add note|Add places from|Chrome extension|Browse all|Recommended)/i.test(t)) return false;
          return t.length > 3;
        })
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

      if (options.length > 0) {
        const first = options[0];
        const text = first.textContent.trim().substring(0, 80);
        first.click();
        resolve(JSON.stringify({ status: 'clicked', clickedText: text, method: 'role_option' }));
        return;
      }

      // Strategy 2: Look for elements with pin/marker icon that contain address text
      // The autocomplete dropdown items have a marker SVG + place name + address
      const candidates = Array.from(document.querySelectorAll('div, a, li'))
        .filter(el => {
          const r = el.getBoundingClientRect();
          if (r.width < 200 || r.height < 30 || r.height > 80) return false;
          if (isInsideItineraryItem(el)) return false;
          if (isInsideSidebar(el)) return false;
          if (inputR && (r.top < inputR.bottom - 5 || r.top > inputR.bottom + 400)) return false;
          // Must contain an SVG (marker icon) as a child
          if (!el.querySelector('svg')) return false;
          const t = el.textContent.trim();
          if (t.length < 10 || t.length > 200) return false;
          if (/(See result|Add note|Add places from|Chrome extension|Browse all|Recommended)/i.test(t)) return false;
          return true;
        })
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

      if (candidates.length > 0) {
        const first = candidates[0];
        const text = first.textContent.trim().substring(0, 80);
        first.click();
        resolve(JSON.stringify({ status: 'clicked', clickedText: text, method: 'svg_marker' }));
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        resolve(JSON.stringify({ status: 'timeout', detail: 'No autocomplete results found after 3s' }));
        return;
      }

      setTimeout(tryClick, 100);
    }

    tryClick();
  });
})()