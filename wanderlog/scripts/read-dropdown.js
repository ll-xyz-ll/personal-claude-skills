// read-dropdown.js — Read which days are checked in the currently open dropdown
// No parameters. Dropdown must already be open (run open-panel.js then toggle click).
// Returns { checked: [...], unchecked: [...], allDays: [...] }
// Checked items have 2 SVGs (pin + checkmark), unchecked have 1 SVG (pin only).
(() => {
  const dd = document.querySelector('.dropdown-menu.show');
  if (!dd) {
    return JSON.stringify({
      status: 'no_dropdown',
      error: 'No dropdown is currently open. Open the panel first, then click the toggle button.',
      checked: [], unchecked: [], allDays: []
    });
  }

  const items = Array.from(dd.querySelectorAll('li, .SplitDropdown__option, .DropdownItem, [role="option"]'));
  const checked = [];
  const unchecked = [];
  const allDays = [];

  for (const el of items) {
    const text = el.textContent.trim();
    if (!text || text.length > 60) continue;
    const svgCount = el.querySelectorAll('svg').length;
    const isChecked = svgCount > 1;
    const entry = { day: text.substring(0, 45), svgs: svgCount, checked: isChecked };
    allDays.push(entry);
    if (isChecked) checked.push(text.substring(0, 45));
    else unchecked.push(text.substring(0, 45));
  }

  return JSON.stringify({
    status: 'ok',
    checked,
    unchecked,
    allDays,
    summary: 'Item is on ' + checked.length + ' day(s): ' + checked.join(', ')
  });
})()
