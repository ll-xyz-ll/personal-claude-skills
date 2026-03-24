// close-panel.js — Close the right-side detail panel
// No parameters. Sends Escape key to close any open panel/dropdown.
// Returns { status, detail }
(() => {
  // Close any open dropdown first
  const dd = document.querySelector('.dropdown-menu.show');
  if (dd) {
    document.body.click();
  }

  // Press Escape to close the panel
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));

  // Verify panel closed — check if "Added" button is still visible
  const addedBtn = Array.from(document.querySelectorAll('button'))
    .find(b => (b.textContent.trim() === 'Added' || b.textContent.trim().includes('Added to'))
      && b.getBoundingClientRect().width > 0 && b.getBoundingClientRect().width < 200);

  return JSON.stringify({
    status: addedBtn ? 'still_open' : 'closed',
    detail: addedBtn
      ? 'Panel may still be open (Added button visible). Try clicking outside the panel area or pressing Escape again.'
      : 'Panel closed'
  });
})()
