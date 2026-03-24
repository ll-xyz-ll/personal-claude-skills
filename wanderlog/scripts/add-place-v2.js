// add-place-v2.js — Add a place to a specific day
// Params: __TARGET_DAY__ (e.g. "Thursday, January 15"), __SEARCH_QUERY__ (e.g. "Ramen Shop Tokyo")
//
// Step 1: Run this script to find and focus the correct "Add a place" input
// Step 2: Use computer tool to type the search query (keyboard events trigger autocomplete)
// Step 3: Use computer tool to click the correct search result
//
// Returns { status, detail }
(() => {
  const TARGET_DAY = '__TARGET_DAY__';
  const res = { status: 'failed', detail: '' };

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
        if (dayPattern.test(t)) {
          dayLabel = t.match(dayPattern)[0];
          break;
        }
      }
      if (dayLabel) break;
    }
    if (dayLabel && dayLabel.includes(TARGET_DAY)) {
      input.value = '';
      input.scrollIntoView({ behavior: 'instant', block: 'center' });
      input.focus();
      input.click();
      res.status = 'focused';
      res.detail = 'Focused "Add a place" input for ' + TARGET_DAY + '. Now use computer tool to type search query.';
      return JSON.stringify(res);
    }
  }

  res.detail = 'No "Add a place" input found for "' + TARGET_DAY + '". Available inputs: ' + inputs.length;
  return JSON.stringify(res);
})()
