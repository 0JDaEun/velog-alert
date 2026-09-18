document.querySelector('#mobileOptionsButton')?.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
