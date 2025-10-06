// --- Browser API Service ---

const browser = self.browser || self.chrome;

/**
 * Fetches tabs from the browser.
 * @param {string} scope - 'current' for current window, 'all' for all windows.
 * @returns {Promise<Array>} A promise that resolves to an array of tabs.
 */
export async function getAllTabs(scope = "current") {
  const queryOptions = scope === "current" ? { currentWindow: true } : {};
  return browser.tabs.query(queryOptions);
}

/**
 * Retrieves saved sessions from local storage.
 * @returns {Promise<Array>} A promise that resolves to an array of saved sessions.
 */
export async function getSavedSessions() {
  const data = await browser.storage.local.get("sessions");
  return data.sessions || [];
}

/**
 * Saves the provided sessions to local storage.
 * @param {Array} sessions - The array of sessions to save.
 * @returns {Promise<void>}
 */
export async function saveSessions(sessions) {
  return browser.storage.local.set({ sessions });
}

/**
 * Creates a new window with the URLs from a given session.
 * @param {Object} session - The session object to restore.
 * @returns {Promise<void>}
 */
export async function restoreSession(session) {
  if (!session.tabs || session.tabs.length === 0) {
    return;
  }

  const validUrls = [];
  const invalidUrls = [];

  for (const tab of session.tabs) {
    if (
      tab.url &&
      (tab.url.startsWith("http:") || tab.url.startsWith("https://"))
    ) {
      validUrls.push(tab.url);
    } else {
      invalidUrls.push(tab.url || "<i>No URL found</i>");
    }
  }

  let newWindow = null;

  if (validUrls.length > 0) {
    newWindow = await browser.windows.create({ url: validUrls });
  }

  if (invalidUrls.length > 0) {
    const listItems = invalidUrls
      .map(
        (url) => `<li>${url.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</li>`,
      )
      .join("");
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unrestored Tabs</title>
        <style>
          body { font-family: monospace; background-color: #dddddd; color: #000000; padding: 2em; }
          h1 { font-size: 24px; border-bottom: 2px solid #000; padding-bottom: 8px; }
          ul { list-style-type: none; padding-left: 0; }
          li { background-color: #ffffff; border: 2px solid #000000; padding: 0.5em; margin-bottom: 0.5em; word-wrap: break-word; }
        </style>
      </head>
      <body>
        <h1>Unrestored Tabs</h1>
        <p>The following tabs could not be restored because their URL type is not supported in this browser (e.g., internal pages like chrome://):</p>
        <ul>${listItems}</ul>
      </body>
      </html>
    `;
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;

    if (newWindow) {
      await browser.tabs.create({
        windowId: newWindow.id,
        url: dataUrl,
        active: true,
      });
    } else {
      await browser.windows.create({ url: dataUrl });
    }
  }
}

/**
 * Updates a tab's pinned state.
 * @param {number} tabId - The ID of the tab to update.
 * @param {boolean} pinned - The new pinned state.
 * @returns {Promise<void>}
 */
export async function pinTab(tabId, pinned) {
  return browser.tabs.update(tabId, { pinned });
}

/**
 * Switches to a specific tab.
 * @param {number} tabId - The ID of the tab to go to.
 * @param {number} windowId - The ID of the window containing the tab.
 * @returns {Promise<void>}
 */
export async function goToTab(tabId, windowId) {
  await browser.windows.update(windowId, { focused: true });
  await browser.tabs.update(tabId, { active: true });
}

/**
 * Closes a set of tabs.
 * @param {Set<number>} tabIds - A set of tab IDs to close.
 * @returns {Promise<void>}
 */
export async function closeTabs(tabIds) {
  return browser.tabs.remove([...tabIds]);
}

/**
 * Bookmarks a set of tabs in a new folder.
 * @param {Array} tabsToBookmark - An array of tab objects to bookmark.
 * @returns {Promise<void>}
 */
export async function bookmarkTabs(tabsToBookmark) {
  const folderTitle = `TABS ${new Date().toISOString().split("T")[0]}`;
  const newFolder = await browser.bookmarks.create({ title: folderTitle });
  const bookmarkPromises = tabsToBookmark.map((tab) =>
    browser.bookmarks.create({
      parentId: newFolder.id,
      title: tab.title,
      url: tab.url,
    }),
  );
  await Promise.all(bookmarkPromises);
}

/**
 * Checks if the MHTML capture API is available.
 * @returns {boolean}
 */
export function isMhtSaveAvailable() {
  return (
    browser.pageCapture && typeof browser.pageCapture.saveAsMHTML === "function"
  );
}

/**
 * Captures a tab as MHTML.
 * @param {number} tabId - The ID of the tab to capture.
 * @returns {Promise<Blob>} A promise that resolves to a Blob containing the MHTML data.
 */
export function saveAsMht(tabId) {
  if (!isMhtSaveAvailable()) {
    return Promise.reject(
      new Error("MHTML capture is not supported in this browser."),
    );
  }
  return new Promise((resolve, reject) => {
    browser.pageCapture.saveAsMHTML({ tabId }, (mht) => {
      if (browser.runtime.lastError) {
        return reject(browser.runtime.lastError);
      }
      resolve(mht);
    });
  });
}
