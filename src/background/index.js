// This script runs in the background and handles the side panel/sidebar logic.

const browser = self.browser || self.chrome;

// Use the unified `action.onClicked` for Manifest V3
browser.action.onClicked.addListener(async (tab) => {
  // Chrome uses `sidePanel`
  if (browser.sidePanel) {
    await browser.sidePanel.open({ windowId: tab.windowId });
  }
  // Firefox uses `sidebarAction`
  else if (browser.sidebarAction) {
    await browser.sidebarAction.open();
  }
});

browser.tabs.onCreated.addListener(() => {
  browser.runtime.sendMessage({ tabsChanged: true });
});

browser.tabs.onRemoved.addListener(() => {
  browser.runtime.sendMessage({ tabsChanged: true });
});

browser.tabs.onUpdated.addListener(() => {
  browser.runtime.sendMessage({ tabsChanged: true });
});

browser.tabs.onAttached.addListener(() => {
  browser.runtime.sendMessage({ tabsChanged: true });
});

browser.tabs.onDetached.addListener(() => {
  browser.runtime.sendMessage({ tabsChanged: true });
});

browser.tabs.onMoved.addListener(() => {
  browser.runtime.sendMessage({ tabsChanged: true });
});
