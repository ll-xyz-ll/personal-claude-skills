// add-place-full.js — Complete add-place flow for Wanderlog
// Params: __TARGET_DAY__ (e.g. "Friday, January 16"), __SEARCH_QUERY__ (e.g. "Ramen Shop Tokyo")
//
// Flow:
// 1. Find and focus the correct day's "Add a place" input
// 2. Type the search query using execCommand (triggers React events)
// 3. Use MutationObserver to watch for suggestions appearing
// 4. Click the first place result (not "See results on map")
//
// Returns Promise<{ status, detail }>
(() => {
  const TARGET_DAY = '__TARGET_DAY__';
  const SEARCH_QUERY = '__SEARCH_QUERY__';

  const dayPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (January|February|March|April|May|June|July|August|September|October|November|December) \d+/;
  const inputs = Array.from(document.querySelectorAll('input[placeholder="Add a place"]'));

  let targetInput = null;
  let autosuggestContainer = null;

  for (const input of inputs) {
    let container = input;
    let dayLabel = null;
    for (let i = 0; i < 20 && container; i++) {
      container = container.parentElement;
      if (!container) break;
      const btns = container.querySelectorAll('button');
      for (const btn of btns) {
        const t = btn.textContent.trim();
        if (dayPattern.test(t)) { dayLabel = t.match(dayPattern)[0]; break; }
      }
      if (dayLabel) break;
    }
    if (dayLabel && dayLabel.includes(TARGET_DAY)) {
      targetInput = input;
      // Find the react-autosuggest__container ancestor
      let el = input;
      for (let i = 0; i < 5; i++) {
        el = el.parentElement;
        if (el && el.className.toString().includes('react-autosuggest__container')) {
          autosuggestContainer = el;
          break;
        }
      }
      break;
    }
  }

  if (!targetInput) {
    return JSON.stringify({ status: 'failed', detail: 'Input not found for ' + TARGET_DAY });
  }

  if (!autosuggestContainer) {
    return JSON.stringify({ status: 'failed', detail: 'Autosuggest container not found' });
  }

  // Set up MutationObserver BEFORE typing to catch the dropdown appearing
  return new Promise((resolve) => {
    const suggestionsContainer = autosuggestContainer.querySelector('.react-autosuggest__suggestions-container');

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        observer.disconnect();
        resolve(JSON.stringify({ status: 'timeout', detail: 'Suggestions did not appear within 5s' }));
      }
    }, 5000);

    const observer = new MutationObserver(() => {
      if (resolved) return;

      // Check if suggestions appeared
      const items = suggestionsContainer.querySelectorAll('li');
      const visible = Array.from(items).filter(li => li.getBoundingClientRect().height > 0);

      if (visible.length > 0) {
        // Find the first PLACE result (has pin icon, not "See results on map" or "Add note")
        const placeResult = visible.find(li => {
          const t = li.textContent.trim();
          return !/(See result|Add note|Add places from|Chrome extension)/i.test(t) && t.length > 5;
        });

        if (placeResult) {
          resolved = true;
          observer.disconnect();
          clearTimeout(timeout);

          const text = placeResult.textContent.trim().substring(0, 80);
          placeResult.click();
          resolve(JSON.stringify({ status: 'added', clickedText: text }));
        }
      }
    });

    observer.observe(suggestionsContainer, { childList: true, subtree: true, attributes: true });

    // Now type the search query
    targetInput.scrollIntoView({ behavior: 'instant', block: 'center' });
    targetInput.focus();
    targetInput.click();
    targetInput.select();
    document.execCommand('delete');
    document.execCommand('insertText', false, SEARCH_QUERY);
  });
})()
