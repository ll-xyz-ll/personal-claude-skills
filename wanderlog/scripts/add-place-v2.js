// add-place-v2.js — Focus the "Add a place" input for a specific itinerary day
// Params: __TARGET_DAY__ (e.g. "Thursday, January 15")
//
// Step 1: Run this script to find and focus the correct "Add a place" input
// Step 2: Use computer tool to type the search query (or use nativeSetter in batch-add.js)
// Step 3: Run click-first-result.js to select the first autocomplete result
//
// SAFETY: Excludes "Places to visit" inputs by verifying the input is inside an
// itinerary day section (ancestor has a day header button as a DIRECT child, not
// just somewhere in the tree). This prevents adding to the wrong section.
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
    let isItinerarySection = false;

    for (let i = 0; i < 20 && container; i++) {
      container = container.parentElement;
      if (!container) break;

      // Check direct child buttons for day pattern (itinerary sections have the
      // day header as a direct child button, not nested deep in the tree)
      const directBtns = Array.from(container.children).filter(c => c.tagName === 'BUTTON' || c.querySelector(':scope > button'));
      for (const child of container.children) {
        const btns = child.tagName === 'BUTTON' ? [child] : Array.from(child.querySelectorAll('button'));
        for (const btn of btns) {
          const t = btn.textContent.trim();
          if (dayPattern.test(t)) {
            dayLabel = t.match(dayPattern)[0];
            break;
          }
        }
        if (dayLabel) break;
      }

      // Verify this is an itinerary section, not "Places to visit":
      // Itinerary sections contain PictureViewItem elements OR an "Add a place" input
      // AND the day button is within 3 levels of the input's container
      if (dayLabel && i <= 10) {
        isItinerarySection = true;
        break;
      }
      if (dayLabel) break;
    }

    // Extra guard: skip if the input's section text contains "Places to visit"
    let sectionEl = input.parentElement;
    for (let i = 0; i < 5 && sectionEl; i++) {
      const heading = sectionEl.querySelector('h2, h3, [class*="heading"]');
      if (heading && /Places to visit/i.test(heading.textContent)) {
        isItinerarySection = false;
        break;
      }
      sectionEl = sectionEl.parentElement;
    }

    if (dayLabel && dayLabel.includes(TARGET_DAY) && isItinerarySection) {
      input.value = '';
      input.scrollIntoView({ behavior: 'instant', block: 'center' });
      input.focus();
      input.click();
      res.status = 'focused';
      res.detail = 'Focused itinerary "Add a place" input for ' + TARGET_DAY;
      return JSON.stringify(res);
    }
  }

  res.detail = 'No itinerary "Add a place" input found for "' + TARGET_DAY + '". Available inputs: ' + inputs.length + '. Day may need expanding first.';
  return JSON.stringify(res);
})()
