// focus-day-input.js — Focus the "Add a place" input for a specific day
// Params: __TARGET_DAY__ (e.g. "Friday, May 8")
// Returns { status, detail }
// After this, use computer tool to type search query, then run click-first-result.js
(() => {
  const TARGET_DAY = '__TARGET_DAY__';
  const dayPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (January|February|March|April|May|June|July|August|September|October|November|December) \d+/;
  const inputs = Array.from(document.querySelectorAll('input[placeholder="Add a place"]'));
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
      input.value = '';
      input.scrollIntoView({ behavior: 'instant', block: 'center' });
      input.focus();
      input.click();
      return JSON.stringify({ status: 'focused', day: TARGET_DAY });
    }
  }
  return JSON.stringify({ status: 'failed', detail: 'Input not found for ' + TARGET_DAY });
})()
