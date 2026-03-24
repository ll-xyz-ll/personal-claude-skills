// verify-move.js — Verify current panel state after a move
// No parameters. Panel must be open.
// Returns { status, counter, buttonText, singleDay }
(() => {
  const addedBtn = Array.from(document.querySelectorAll('button'))
    .find(b => (b.textContent.trim() === 'Added' || b.textContent.trim().includes('Added to'))
      && b.getBoundingClientRect().width > 0 && b.getBoundingClientRect().width < 200);

  const counter = document.body.innerText.match(/(\d+) of (\d+)/);
  const btnText = addedBtn ? addedBtn.textContent.trim() : null;

  return JSON.stringify({
    status: addedBtn ? 'panel_open' : 'no_panel',
    counter: counter ? counter[0] : null,
    buttonText: btnText,
    singleDay: btnText === 'Added',
    multiDay: btnText ? btnText.includes('lists') : false,
    detail: !addedBtn
      ? 'No panel open — run open-panel.js first'
      : btnText === 'Added'
        ? 'Item is on exactly 1 day'
        : 'Item is on multiple days — may need to uncheck source day'
  });
})()
