/**
 * Background script for Man Tab extension
 * Handles browser action clicks and tab change events
 */

import type { TabChangeMessage } from "../types/index.js";

// Cross-browser compatibility
const browserApi = (globalThis as any).browser || (globalThis as any).chrome;

/**
 * Handles browser action click to open side panel or sidebar
 */
const handleActionClick = async (tab: chrome.tabs.Tab): Promise<void> => {
  try {
    if (!tab.windowId) {
      console.error("Tab window ID is not available");
      return;
    }

    // Chrome uses sidePanel API
    if (browserApi.sidePanel?.open) {
      await browserApi.sidePanel.open({ windowId: tab.windowId });
    }
    // Firefox uses sidebarAction API
    else if (browserApi.sidebarAction?.open) {
      await browserApi.sidebarAction.open();
    } else {
      console.warn("Neither sidePanel nor sidebarAction API is available");
    }
  } catch (error) {
    console.error("Failed to open side panel/sidebar:", error);
  }
};

/**
 * Sends tab change notification to popup
 */
const notifyTabsChanged = (): void => {
  try {
    const message: TabChangeMessage = { tabsChanged: true };
    browserApi.runtime.sendMessage(message).catch((error: Error) => {
      // Ignore errors when no listeners are present
      if (!error.message.includes("Could not establish connection")) {
        console.error("Failed to send tabs changed message:", error);
      }
    });
  } catch (error) {
    console.error("Error creating tabs changed message:", error);
  }
};

/**
 * Set up event listeners for browser extension
 */
const setupEventListeners = (): void => {
  // Handle browser action clicks
  if (browserApi.action?.onClicked) {
    browserApi.action.onClicked.addListener(handleActionClick);
  }

  // Listen for tab events and notify popup
  const tabEvents = [
    "onCreated",
    "onRemoved",
    "onUpdated",
    "onAttached",
    "onDetached",
    "onMoved",
  ] as const;

  tabEvents.forEach((eventName) => {
    const event = browserApi.tabs[eventName];
    if (event?.addListener) {
      event.addListener(notifyTabsChanged);
    }
  });
};

/**
 * Initialize background script
 */
const initialize = (): void => {
  try {
    setupEventListeners();
    console.log("Man Tab background script initialized");
  } catch (error) {
    console.error("Failed to initialize background script:", error);
  }
};

// Initialize when script loads
initialize();

// Handle extension startup/install
if (browserApi.runtime?.onStartup) {
  browserApi.runtime.onStartup.addListener(initialize);
}

if (browserApi.runtime?.onInstalled) {
  browserApi.runtime.onInstalled.addListener(initialize);
}
