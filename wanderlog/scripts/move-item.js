// move-item.js — Full 6-step move: open dropdown → add target day → verify → reopen → uncheck source
// Params: __TARGET_DAY__ (dropdown format e.g. "Sun, May 3rd"), __SOURCE_DAY__ (e.g. "Fri, May 1st")
// IMPORTANT: Panel must already be open for this item (run open-panel.js first)
// Returns { status, step, detail }
//
// This script runs steps 3-6 synchronously. Steps 1-2 (open panel) must be done separately via open-panel.js.
// If any step fails, it stops and returns the failing step number for diagnosis.
(() => {
  const TARGET_DAY = '__TARGET_DAY__';
  const SOURCE_DAY = '__SOURCE_DAY__';

  const res = { status: 'failed', step: 0, detail: '' };

  // Helper: find the "Added" button
  function findAddedBtn() {
    return Array.from(document.querySelectorAll('button'))
      .find(b => (b.textContent.trim() === 'Added' || b.textContent.trim().includes('Added to'))
        && b.getBoundingClientRect().width > 0
        && b.getBoundingClientRect().width < 200);
  }

  // Helper: find the dropdown toggle (empty button right of "Added")
  function findToggle(addedBtn) {
    const rect = addedBtn.getBoundingClientRect();
    return Array.from(document.querySelectorAll('button')).find(b => {
      const r = b.getBoundingClientRect();
      return r.x > rect.x + rect.width
        && r.x < rect.x + rect.width + 60
        && Math.abs(r.y - rect.y) < 10
        && b.textContent.trim() === ''
        && r.width > 0;
    });
  }

  // Helper: find a day item in the open dropdown
  function findDayInDropdown(dayText) {
    const dd = document.querySelector('.dropdown-menu.show');
    if (!dd) return null;
    const items = Array.from(dd.querySelectorAll('li, .SplitDropdown__option, .DropdownItem, [role="option"]'));
    return items.find(el => el.textContent.trim().includes(dayText));
  }

  // STEP 3: Open dropdown toggle
  res.step = 3;
  const addedBtn1 = findAddedBtn();
  if (!addedBtn1) {
    res.detail = 'No "Added" button found — panel may not be open. Run open-panel.js first.';
    return JSON.stringify(res);
  }
  const toggle1 = findToggle(addedBtn1);
  if (!toggle1) {
    res.detail = 'Dropdown toggle not found. Added text: "' + addedBtn1.textContent.trim() + '"';
    return JSON.stringify(res);
  }
  toggle1.click();

  // STEP 4: Click target day to ADD item there
  res.step = 4;
  const targetEl = findDayInDropdown(TARGET_DAY);
  if (!targetEl) {
    const dd = document.querySelector('.dropdown-menu.show');
    const available = dd
      ? Array.from(dd.querySelectorAll('li, .SplitDropdown__option, .DropdownItem, [role="option"]'))
          .map(el => el.textContent.trim().substring(0, 40)).join(' | ')
      : 'dropdown not open';
    res.detail = 'Target day "' + TARGET_DAY + '" not found. Available: ' + available;
    return JSON.stringify(res);
  }
  // Check if target is already checked (2 svgs)
  const targetAlreadyChecked = targetEl.querySelectorAll('svg').length > 1;
  if (targetAlreadyChecked) {
    res.detail = 'Target day "' + TARGET_DAY + '" is already checked — item may already be on this day. Skipping to uncheck source.';
    // Close dropdown first, then proceed to uncheck source
    document.body.click(); // close dropdown
  } else {
    targetEl.click();
  }

  // STEP 5: Verify "Added to 2 lists" and reopen dropdown
  res.step = 5;
  const addedBtn2 = findAddedBtn();
  if (!addedBtn2) {
    res.detail = 'Added button disappeared after step 4';
    return JSON.stringify(res);
  }
  const btnText = addedBtn2.textContent.trim();
  // If source and target are different, we should see "Added to 2 lists" (or more)
  if (!btnText.includes('2 lists') && !btnText.includes('3 lists') && !targetAlreadyChecked) {
    res.detail = 'STOP — after adding target day, button shows "' + btnText + '" instead of "Added to 2 lists". Step 4 may not have registered. Do NOT uncheck source — retry this script.';
    res.status = 'partial';
    return JSON.stringify(res);
  }
  const toggle2 = findToggle(addedBtn2);
  if (!toggle2) {
    res.detail = 'Toggle not found for step 5 reopen. Added text: "' + btnText + '"';
    return JSON.stringify(res);
  }
  toggle2.click();

  // STEP 6: Uncheck source day
  res.step = 6;
  const sourceEl = findDayInDropdown(SOURCE_DAY);
  if (!sourceEl) {
    res.detail = 'Source day "' + SOURCE_DAY + '" not found in dropdown';
    return JSON.stringify(res);
  }
  const sourceSvgs = sourceEl.querySelectorAll('svg').length;
  if (sourceSvgs < 2) {
    res.detail = 'Source day "' + SOURCE_DAY + '" is not checked (' + sourceSvgs + ' svgs) — item may already be removed from this day';
    res.status = 'partial';
    return JSON.stringify(res);
  }
  sourceEl.click();

  // Final verification
  const finalBtn = findAddedBtn();
  const finalText = finalBtn ? finalBtn.textContent.trim() : 'none';
  const counter = document.body.innerText.match(/(\d+) of (\d+)/);

  res.status = 'moved';
  res.step = 6;
  res.detail = 'Move complete. Button: "' + finalText + '", Counter: ' + (counter ? counter[0] : 'none');
  return JSON.stringify(res);
})()
