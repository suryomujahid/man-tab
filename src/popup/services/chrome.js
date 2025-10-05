// --- Chrome API Service ---

/**
 * Fetches all tabs from the browser.
 * @returns {Promise<Array>} A promise that resolves to an array of tabs.
 */
export async function getAllTabs() {
  return chrome.tabs.query({});
}

/**
 * Retrieves saved sessions from local storage.
 * @returns {Promise<Array>} A promise that resolves to an array of saved sessions.
 */
export async function getSavedSessions() {
  const data = await chrome.storage.local.get("sessions");
  return data.sessions || [];
}

/**
 * Saves the provided sessions to local storage.
 * @param {Array} sessions - The array of sessions to save.
 * @returns {Promise<void>}
 */
export async function saveSessions(sessions) {
  return chrome.storage.local.set({ sessions });
}

/**
 * Creates a new window with the URLs from a given session.
 * @param {Object} session - The session object to restore.
 * @returns {Promise<void>}
 */
export async function restoreSession(session) {
  const urls = session.tabs.map((tab) => tab.url);
  return chrome.windows.create({ url: urls });
}

/**
 * Updates a tab's pinned state.
 * @param {number} tabId - The ID of the tab to update.
 * @param {boolean} pinned - The new pinned state.
 * @returns {Promise<void>}
 */
export async function pinTab(tabId, pinned) {
  return chrome.tabs.update(tabId, { pinned });
}

/**
 * Switches to a specific tab.
 * @param {number} tabId - The ID of the tab to go to.
 * @param {number} windowId - The ID of the window containing the tab.
 * @returns {Promise<void>}
 */
export async function goToTab(tabId, windowId) {
  await chrome.windows.update(windowId, { focused: true });
  await chrome.tabs.update(tabId, { active: true });
}

/**
 * Closes a set of tabs.
 * @param {Set<number>} tabIds - A set of tab IDs to close.
 * @returns {Promise<void>}
 */
export async function closeTabs(tabIds) {
  return chrome.tabs.remove([...tabIds]);
}

/**
 * Bookmarks a set of tabs in a new folder.
 * @param {Array} tabsToBookmark - An array of tab objects to bookmark.
 * @returns {Promise<void>}
 */
export async function bookmarkTabs(tabsToBookmark) {
  const folderTitle = `TABS ${new Date().toISOString().split("T")[0]}`;
  const newFolder = await chrome.bookmarks.create({ title: folderTitle });
  const bookmarkPromises = tabsToBookmark.map((tab) =>
    chrome.bookmarks.create({
      parentId: newFolder.id,
      title: tab.title,
      url: tab.url,
    }),
  );
  await Promise.all(bookmarkPromises);
}

/**
 * Captures a tab as MHTML.
 * @param {number} tabId - The ID of the tab to capture.
 * @returns {Promise<Blob>} A promise that resolves to a Blob containing the MHTML data.
 */
export function saveAsMht(tabId) {
  return new Promise((resolve, reject) => {
    chrome.pageCapture.saveAsMHTML({ tabId }, (mht) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(mht);
    });
  });
}
