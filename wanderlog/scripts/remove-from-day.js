// remove-from-day.js — Remove item from a specific day via dropdown
// Params: __DAY_TO_REMOVE__ (dropdown format e.g. "Fri, May 1st")
// IMPORTANT: Panel must already be open (run open-panel.js first)
// Returns { status, detail }
(() => {
  const DAY_TO_REMOVE = '__DAY_TO_REMOVE__';
  const res = { status: 'failed', detail: '' };

  // Find "Added" button
  const addedBtn = Array.from(document.querySelectorAll('button'))
    .find(b => (b.textContent.trim() === 'Added' || b.textContent.trim().includes('Added to'))
      && b.getBoundingClientRect().width > 0 && b.getBoundingClientRect().width < 200);

  if (!addedBtn) {
    res.detail = 'No "Added" button — panel not open. Run open-panel.js first.';
    return JSON.stringify(res);
  }

  // Find toggle
  const rect = addedBtn.getBoundingClientRect();
  const toggle = Array.from(document.querySelectorAll('button')).find(b => {
    const r = b.getBoundingClientRect();
    return r.x > rect.x + rect.width && r.x < rect.x + rect.width + 60
      && Math.abs(r.y - rect.y) < 10 && b.textContent.trim() === '' && r.width > 0;
  });

  if (!toggle) {
    res.detail = 'Toggle not found. Added text: "' + addedBtn.textContent.trim() + '"';
    return JSON.stringify(res);
  }

  // Open dropdown
  toggle.click();

  // Find the day and check it's currently checked
  const dd = document.querySelector('.dropdown-menu.show');
  if (!dd) {
    res.detail = 'Dropdown did not open after clicking toggle';
    return JSON.stringify(res);
  }

  const items = Array.from(dd.querySelectorAll('li, .SplitDropdown__option, .DropdownItem, [role="option"]'));
  const dayEl = items.find(el => el.textContent.trim().includes(DAY_TO_REMOVE));

  if (!dayEl) {
    res.detail = 'Day "' + DAY_TO_REMOVE + '" not found in dropdown. Available: ' +
      items.map(el => el.textContent.trim().substring(0, 40)).join(' | ');
    return JSON.stringify(res);
  }

  const svgCount = dayEl.querySelectorAll('svg').length;
  if (svgCount < 2) {
    res.status = 'not_on_day';
    res.detail = 'Item is not assigned to "' + DAY_TO_REMOVE + '" (' + svgCount + ' svgs — unchecked). Nothing to remove.';
    return JSON.stringify(res);
  }

  // Uncheck the day
  dayEl.click();

  // Verify
  const finalBtn = Array.from(document.querySelectorAll('button'))
    .find(b => (b.textContent.trim() === 'Added' || b.textContent.trim().includes('Added to'))
      && b.getBoundingClientRect().width > 0 && b.getBoundingClientRect().width < 200);

  res.status = 'removed';
  res.detail = 'Unchecked "' + DAY_TO_REMOVE + '". Button now: "' + (finalBtn ? finalBtn.textContent.trim() : 'none') + '"';
  return JSON.stringify(res);
})()
