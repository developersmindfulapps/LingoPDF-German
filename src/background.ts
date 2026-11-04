// Background service worker for LingoPDF
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('viewer.html'),
  });
});
