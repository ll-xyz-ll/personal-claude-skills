// batch-add.js — Add multiple places to a specific day in a single script call
// Params: __TARGET_DAY__ (e.g. "Friday, May 1"), __PLACES__ (JSON array of search queries)
//
// Uses nativeSetter + input event to trigger autocomplete (no computer tool needed).
// Clicks first autocomplete result using precise targeting (role="option" or SVG marker).
//
// SAFETY:
// - Excludes "Places to visit" inputs (validates itinerary section)
// - Excludes existing itinerary items from click targets
// - Excludes sidebar elements
// - 1.5s wait for autocomplete, 1s delay between adds
//
// Returns JSON array of { place, ok, text } or { place, error }
(() => {
  const TARGET_DAY = '__TARGET_DAY__';
  const PLACES = __PLACES__;
  const dayPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (January|February|March|April|May|June|July|August|September|October|November|December) \d+/;
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

  function findInput() {
    const inputs = Array.from(document.querySelectorAll('input[placeholder="Add a place"]'));
    for (const input of inputs) {
      let container = input;
      let dayLabel = null;
      let isItinerary = false;
      for (let i = 0; i < 20 && container; i++) {
        container = container.parentElement;
        if (!container) break;
        for (const child of container.children) {
          const btns = child.tagName === 'BUTTON' ? [child] : Array.from(child.querySelectorAll('button'));
          for (const btn of btns) {
            const t = btn.textContent.trim();
            if (dayPattern.test(t)) { dayLabel = t.match(dayPattern)[0]; break; }
          }
          if (dayLabel) break;
        }
        if (dayLabel && i <= 10) { isItinerary = true; break; }
        if (dayLabel) break;
      }
      // Exclude "Places to visit" section
      let sectionEl = input.parentElement;
      for (let i = 0; i < 5 && sectionEl; i++) {
        const heading = sectionEl.querySelector('h2, h3, [class*="heading"]');
        if (heading && /Places to visit/i.test(heading.textContent)) { isItinerary = false; break; }
        sectionEl = sectionEl.parentElement;
      }
      if (dayLabel && dayLabel.includes(TARGET_DAY) && isItinerary) return input;
    }
    return null;
  }

  function isInsideItineraryItem(el) {
    let p = el;
    for (let i = 0; i < 15 && p; i++) {
      if (p.className && typeof p.className === 'string' && p.className.includes('PictureViewItem')) return true;
      p = p.parentElement;
    }
    return false;
  }

  function clickFirstResult(input) {
    return new Promise(resolve => {
      let attempts = 0;
      const inputR = input.getBoundingClientRect();

      function tryClick() {
        // Strategy 1: role="option" elements
        const options = Array.from(document.querySelectorAll('[role="option"]'))
          .filter(el => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            if (isInsideItineraryItem(el)) return false;
            if (r.right < 200) return false; // sidebar
            const freshInputR = input.getBoundingClientRect();
            if (r.top < freshInputR.bottom - 5 || r.top > freshInputR.bottom + 400) return false;
            const t = el.textContent.trim();
            if (/(See result|Add note|Add places from|Chrome extension|Browse all|Recommended)/i.test(t)) return false;
            return t.length > 3;
          })
          .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

        if (options.length > 0) {
          options[0].click();
          resolve({ ok: true, text: options[0].textContent.trim().substring(0, 60) });
          return;
        }

        // Strategy 2: div/a/li with SVG marker icon below input
        const candidates = Array.from(document.querySelectorAll('div, a, li'))
          .filter(el => {
            const r = el.getBoundingClientRect();
            if (r.width < 200 || r.height < 30 || r.height > 80) return false;
            if (isInsideItineraryItem(el)) return false;
            if (r.right < 200) return false;
            const freshInputR = input.getBoundingClientRect();
            if (r.top < freshInputR.bottom - 5 || r.top > freshInputR.bottom + 400) return false;
            if (!el.querySelector('svg')) return false;
            const t = el.textContent.trim();
            if (t.length < 10 || t.length > 200) return false;
            if (/(See result|Add note|Add places from|Chrome extension|Browse all|Recommended)/i.test(t)) return false;
            return true;
          })
          .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

        if (candidates.length > 0) {
          candidates[0].click();
          resolve({ ok: true, text: candidates[0].textContent.trim().substring(0, 60) });
          return;
        }

        if (++attempts >= 20) { resolve({ ok: false, error: 'no autocomplete results after 2s' }); return; }
        setTimeout(tryClick, 100);
      }
      // Wait 1.5s for autocomplete to appear before first check
      setTimeout(tryClick, 1500);
    });
  }

  async function addAll() {
    const results = [];
    for (const place of PLACES) {
      const input = findInput();
      if (!input) { results.push({ place, ok: false, error: 'input not found — day may need expanding' }); continue; }
      input.scrollIntoView({ behavior: 'instant', block: 'center' });
      input.focus();
      input.click();
      nativeSetter.call(input, place);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const res = await clickFirstResult(input);
      results.push({ place, ...res });
      // Wait between adds for UI to settle
      await new Promise(r => setTimeout(r, 1000));
    }
    return JSON.stringify(results);
  }

  return addAll();
})()