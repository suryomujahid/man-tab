// This script runs in the background and handles the side panel logic.

chrome.action.onClicked.addListener(async (tab) => {
  const { windowId } = tab;
  await chrome.sidePanel.open({ windowId });
});

chrome.tabs.onCreated.addListener(() => {
  chrome.runtime.sendMessage({ tabsChanged: true });
});

chrome.tabs.onRemoved.addListener(() => {
  chrome.runtime.sendMessage({ tabsChanged: true });
});

chrome.tabs.onUpdated.addListener(() => {
  chrome.runtime.sendMessage({ tabsChanged: true });
});

chrome.tabs.onAttached.addListener(() => {
  chrome.runtime.sendMessage({ tabsChanged: true });
});

chrome.tabs.onDetached.addListener(() => {
  chrome.runtime.sendMessage({ tabsChanged: true });
});

chrome.tabs.onMoved.addListener(() => {
  chrome.runtime.sendMessage({ tabsChanged: true });
});
