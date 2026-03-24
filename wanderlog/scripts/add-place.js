// add-place.js — Click "Add a place" for a specific day, type search query
// Params: __DAY_SIDEBAR__ (sidebar format e.g. "Fri 5/1"), __SEARCH_QUERY__ (place name to search)
// Returns { status, detail, searchInputFound }
//
// This script:
// 1. Finds the day section in the DOM
// 2. Clicks the "Add a place" button within that section
// 3. Types the search query into the search input
// 4. Returns — the agent must then read search results and select one
(() => {
  const DAY_SIDEBAR = '__DAY_SIDEBAR__';
  const SEARCH_QUERY = '__SEARCH_QUERY__';

  const res = { status: 'failed', detail: '', searchInputFound: false };

  // Step 1: Find the day section header
  const allEls = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, div, span, section, p'));
  let dayHeader = allEls.find(el => {
    const t = el.textContent.trim();
    return t.includes(DAY_SIDEBAR) && el.children.length <= 5 && t.length < 60;
  });

  if (!dayHeader) {
    res.detail = 'Day header "' + DAY_SIDEBAR + '" not found in DOM. Navigate to it first via navigate-day.js.';
    return JSON.stringify(res);
  }

  // Step 2: Find "Add a place" button near this day section
  // Walk siblings/descendants after the day header to find the button
  let addBtn = null;
  let current = dayHeader;

  // Walk up to find a container, then search within it
  for (let i = 0; i < 5; i++) {
    if (current.parentElement) current = current.parentElement;
  }

  // Search within the parent container for "Add a place"
  const buttons = Array.from(current.querySelectorAll('button'));
  addBtn = buttons.find(b => b.textContent.trim() === 'Add a place' && b.getBoundingClientRect().width > 0);

  if (!addBtn) {
    // Fallback: find the nearest visible "Add a place" button to the day header's Y position
    const headerY = dayHeader.getBoundingClientRect().top;
    const allAddBtns = Array.from(document.querySelectorAll('button'))
      .filter(b => b.textContent.trim() === 'Add a place' && b.getBoundingClientRect().width > 0)
      .map(b => ({ el: b, y: b.getBoundingClientRect().top, dist: Math.abs(b.getBoundingClientRect().top - headerY) }))
      .sort((a, b) => a.dist - b.dist);

    if (allAddBtns.length > 0 && allAddBtns[0].y > headerY) {
      addBtn = allAddBtns[0].el;
    }
  }

  if (!addBtn) {
    res.detail = 'No visible "Add a place" button found near "' + DAY_SIDEBAR + '". The day section may be collapsed or off-screen.';
    return JSON.stringify(res);
  }

  addBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
  addBtn.click();

  // Step 3: Find the search input that appeared and type the query
  // Wanderlog opens a search modal/inline input after clicking "Add a place"
  const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="search"], input:not([type])'))
    .filter(i => i.getBoundingClientRect().width > 0);

  // Look for a search-like input (placeholder contains "search" or is focused)
  let searchInput = inputs.find(i =>
    (i.placeholder || '').toLowerCase().includes('search') ||
    (i.placeholder || '').toLowerCase().includes('place') ||
    (i.placeholder || '').toLowerCase().includes('add')
  );

  // Fallback: use the most recently visible input
  if (!searchInput && inputs.length > 0) {
    searchInput = inputs[inputs.length - 1];
  }

  if (!searchInput) {
    res.status = 'add_clicked';
    res.detail = '"Add a place" clicked but no search input found yet. The modal may need a moment to render. Re-run or use the agent to find the input.';
    return JSON.stringify(res);
  }

  // Focus and type the search query
  searchInput.focus();
  searchInput.value = '';
  // Use native input setter to trigger React state update
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeInputValueSetter.call(searchInput, SEARCH_QUERY);
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  searchInput.dispatchEvent(new Event('change', { bubbles: true }));

  res.status = 'search_typed';
  res.detail = 'Typed "' + SEARCH_QUERY + '" into search input. Wait briefly then read search results to select the correct one.';
  res.searchInputFound = true;
  return JSON.stringify(res);
})()
