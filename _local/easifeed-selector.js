'use strict';

(() => {
  const field = document.getElementById('horseNameInput');
  const start = document.getElementById('startBtn');
  if (!field || !start) return;

  function openSelector() {
    const name = field.value.trim();
    if (!name) {
      window.alert("Please enter a horse's name to continue.");
      field.focus();
      return;
    }

    const url = 'https://prydes.feedxl.com/au?language=en&name=' + encodeURIComponent(name);
    window.open(url, '_blank', 'noopener');
  }

  start.addEventListener('click', openSelector);
  field.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    if (!event.repeat) openSelector();
  });
})();
