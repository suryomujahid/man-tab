// This script runs in the background and handles the side panel logic.

chrome.action.onClicked.addListener(async (tab) => {
  const { windowId } = tab;
  await chrome.sidePanel.open({ windowId });
});
