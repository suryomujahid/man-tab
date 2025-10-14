/**
 * Browser API Service - Handles all browser extension API interactions
 * Provides type-safe wrappers around Chrome/Firefox extension APIs
 */

import type {
  Tab,
  Session,
  SessionTab,
  SavedSessionData,
  BrowserService,
} from "../../types/index.js";
import {
  WindowScope,
  BrowserApiError,
  SessionError,
} from "../../types/index.js";
import {
  validateUrl,
  validateSessionName,
  escapeHtml,
} from "../utils/index.js";

// Cross-browser compatibility
const browserApi = (globalThis as any).browser || (globalThis as any).chrome;

/**
 * Fetches tabs from the browser with proper error handling
 * @param scope - 'current' for current window, 'all' for all windows
 * @returns Promise that resolves to an array of tabs with lastAccessed property
 */
export const getAllTabs = async (
  scope: WindowScope = WindowScope.CURRENT,
): Promise<Tab[]> => {
  try {
    if (!browserApi?.tabs?.query) {
      throw new BrowserApiError("Tabs API not available");
    }

    const queryOptions =
      scope === WindowScope.CURRENT ? { currentWindow: true } : {};
    const tabs = await browserApi.tabs.query(queryOptions);

    if (!Array.isArray(tabs)) {
      throw new BrowserApiError("Invalid tabs response from browser API");
    }

    // Ensure each tab has required properties and add lastAccessed if missing
    return tabs.map(
      (tab: chrome.tabs.Tab): Tab => ({
        id: tab.id ?? -1,
        title: tab.title ?? "Untitled",
        url: tab.url ?? "",
        favIconUrl: tab.favIconUrl,
        pinned: tab.pinned ?? false,
        windowId: tab.windowId ?? -1,
        active: tab.active ?? false,
        lastAccessed: tab.lastAccessed ?? Date.now(),
        index: tab.index,
      }),
    );
  } catch (error) {
    console.error("Error fetching tabs:", error);
    throw new BrowserApiError(
      `Failed to fetch tabs: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Retrieves saved sessions from local storage with validation
 * @returns Promise that resolves to an array of validated sessions
 */
export const getSavedSessions = async (): Promise<Session[]> => {
  try {
    if (!browserApi?.storage?.local?.get) {
      throw new BrowserApiError("Storage API not available");
    }

    const data: SavedSessionData =
      await browserApi.storage.local.get("sessions");
    const sessions = data.sessions ?? [];

    if (!Array.isArray(sessions)) {
      console.warn(
        "Invalid sessions data found in storage, returning empty array",
      );
      return [];
    }

    // Validate and filter sessions
    return sessions.filter((session: unknown): session is Session => {
      if (!session || typeof session !== "object") return false;

      const s = session as Session;
      return (
        typeof s.name === "string" &&
        Array.isArray(s.tabs) &&
        typeof s.date === "number" &&
        s.tabs.every((tab: unknown): tab is SessionTab => {
          const t = tab as SessionTab;
          return (
            typeof t.url === "string" &&
            typeof t.title === "string" &&
            validateUrl(t.url).isValid
          );
        })
      );
    });
  } catch (error) {
    console.error("Error retrieving saved sessions:", error);
    throw new SessionError(
      `Failed to retrieve sessions: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Saves sessions to local storage with validation
 * @param sessions - Array of sessions to save
 */
export const saveSessions = async (sessions: Session[]): Promise<void> => {
  try {
    if (!Array.isArray(sessions)) {
      throw new SessionError("Sessions must be an array");
    }

    if (!browserApi?.storage?.local?.set) {
      throw new BrowserApiError("Storage API not available");
    }

    // Validate all sessions before saving
    const validationErrors: string[] = [];
    sessions.forEach((session, index) => {
      const nameValidation = validateSessionName(session.name);
      if (!nameValidation.isValid) {
        validationErrors.push(`Session ${index + 1}: ${nameValidation.error}`);
      }

      if (!Array.isArray(session.tabs) || session.tabs.length === 0) {
        validationErrors.push(
          `Session ${index + 1}: Must have at least one tab`,
        );
      }

      session.tabs.forEach((tab, tabIndex) => {
        const urlValidation = validateUrl(tab.url);
        if (!urlValidation.isValid) {
          validationErrors.push(
            `Session ${index + 1}, Tab ${tabIndex + 1}: ${urlValidation.error}`,
          );
        }
      });
    });

    if (validationErrors.length > 0) {
      throw new SessionError(
        `Validation failed: ${validationErrors.join(", ")}`,
      );
    }

    await browserApi.storage.local.set({ sessions });
  } catch (error) {
    console.error("Error saving sessions:", error);
    if (error instanceof SessionError) {
      throw error;
    }
    throw new SessionError(
      `Failed to save sessions: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Creates a new window with the URLs from a session
 * @param session - The session object to restore
 */
export const restoreSession = async (session: Session): Promise<void> => {
  try {
    if (!session?.tabs || session.tabs.length === 0) {
      throw new SessionError("Session has no tabs to restore");
    }

    if (
      !browserApi?.windows?.create ||
      !browserApi?.tabs?.create ||
      !browserApi?.tabs?.discard
    ) {
      throw new BrowserApiError("Windows, Tabs, or Discard API not available");
    }

    const validUrls: string[] = [];
    const invalidUrls: string[] = [];

    for (const tab of session.tabs) {
      if (!tab?.url) {
        invalidUrls.push("<No URL found>");
        continue;
      }

      const validation = validateUrl(tab.url);
      if (
        validation.isValid &&
        (tab.url.startsWith("http:") || tab.url.startsWith("https://"))
      ) {
        validUrls.push(tab.url);
      } else {
        invalidUrls.push(tab.url);
      }
    }

    let newWindow: chrome.windows.Window | null = null;

    if (validUrls.length > 0) {
      newWindow = await browserApi.windows.create({ url: validUrls[0] });

      if (!newWindow?.id) {
        throw new BrowserApiError("Failed to create new window");
      }

      for (let i = 1; i < validUrls.length; i++) {
        try {
          // 1. Create the tab as inactive
          const newTab = await browserApi.tabs.create({
            windowId: newWindow.id,
            url: validUrls[i],
            active: false,
          });

          if (newTab.id) {
            await new Promise<void>((resolve) => {
              const listener = (
                tabId: number,
                changeInfo: chrome.tabs.TabChangeInfo,
              ) => {
                if (tabId === newTab.id && changeInfo.status === "complete") {
                  browserApi.tabs.onUpdated.removeListener(listener);
                  resolve();
                }
              };
              browserApi.tabs.onUpdated.addListener(listener);
            });

            await browserApi.tabs.discard(newTab.id);
          }
        } catch (tabError) {
          console.warn(
            `Failed to create or discard tab for URL: ${validUrls[i]}`,
            tabError,
          );
        }
      }
    }

    if (invalidUrls.length > 0) {
      const listItems = invalidUrls
        .map((url) => `<li>${escapeHtml(url)}</li>`)
        .join("");

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unrestored Tabs - Man Tab</title>
          <meta charset="utf-8">
        </head>
        <body>
            <h2>Unrestored Tabs</h1>
            <h4>
              The following tabs could not be restored because their URL type is not supported
              in this browser (e.g., internal pages like chrome:// or invalid URLs):
            </h4>
            <ul>${listItems}</ul>
            <p><strong>Total unrestored:</strong> ${invalidUrls.length} tab(s)</p>
        </body>
        </html>
      `;

      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(
        htmlContent,
      )}`;

      try {
        if (newWindow?.id) {
          await browserApi.tabs.create({
            windowId: newWindow.id,
            url: dataUrl,
            active: true,
          });
        } else {
          await browserApi.windows.create({ url: dataUrl });
        }
      } catch (error) {
        console.warn("Failed to create unrestored tabs info page:", error);
      }
    }

    if (validUrls.length === 0 && invalidUrls.length === 0) {
      throw new SessionError("No valid tabs found in session");
    }
  } catch (error) {
    console.error("Error restoring session:", error);
    if (error instanceof SessionError || error instanceof BrowserApiError) {
      throw error;
    }
    throw new SessionError(
      `Failed to restore session: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
};

/**
 * Updates a tab's pinned state
 * @param tabId - The ID of the tab to update
 * @param pinned - The new pinned state
 */
export const pinTab = async (tabId: number, pinned: boolean): Promise<void> => {
  try {
    if (typeof tabId !== "number" || tabId < 0) {
      throw new BrowserApiError("Invalid tab ID");
    }

    if (!browserApi?.tabs?.update) {
      throw new BrowserApiError("Tabs API not available");
    }

    await browserApi.tabs.update(tabId, { pinned });
  } catch (error) {
    console.error("Error updating tab pin state:", error);
    throw new BrowserApiError(
      `Failed to ${pinned ? "pin" : "unpin"} tab: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Switches to a specific tab in a specific window
 * @param tabId - The ID of the tab to switch to
 * @param windowId - The ID of the window containing the tab
 */
export const goToTab = async (
  tabId: number,
  windowId: number,
): Promise<void> => {
  try {
    if (typeof tabId !== "number" || tabId < 0) {
      throw new BrowserApiError("Invalid tab ID");
    }
    if (typeof windowId !== "number" || windowId < 0) {
      throw new BrowserApiError("Invalid window ID");
    }

    if (!browserApi?.windows?.update || !browserApi?.tabs?.update) {
      throw new BrowserApiError("Windows or Tabs API not available");
    }

    await browserApi.windows.update(windowId, { focused: true });
    await browserApi.tabs.update(tabId, { active: true });
  } catch (error) {
    console.error("Error switching to tab:", error);
    throw new BrowserApiError(
      `Failed to switch to tab: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Closes a set of tabs
 * @param tabIds - Set of tab IDs to close
 */
export const closeTabs = async (tabIds: Set<number>): Promise<void> => {
  try {
    if (tabIds.size === 0) {
      throw new BrowserApiError("No tabs specified for closing");
    }

    if (!browserApi?.tabs?.remove) {
      throw new BrowserApiError("Tabs API not available");
    }

    const tabIdArray = Array.from(tabIds).filter(
      (id) => typeof id === "number" && id >= 0,
    );
    if (tabIdArray.length === 0) {
      throw new BrowserApiError("No valid tab IDs provided");
    }

    await browserApi.tabs.remove(tabIdArray);
  } catch (error) {
    console.error("Error closing tabs:", error);
    throw new BrowserApiError(
      `Failed to close tabs: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Bookmarks a set of tabs in a new folder
 * @param tabsToBookmark - Array of tab objects to bookmark
 */
export const bookmarkTabs = async (tabsToBookmark: Tab[]): Promise<void> => {
  try {
    if (!Array.isArray(tabsToBookmark) || tabsToBookmark.length === 0) {
      throw new BrowserApiError("No tabs provided for bookmarking");
    }

    if (!browserApi?.bookmarks?.create) {
      throw new BrowserApiError("Bookmarks API not available");
    }

    const validTabs = tabsToBookmark.filter(
      (tab) => tab?.url && tab.title && validateUrl(tab.url).isValid,
    );

    if (validTabs.length === 0) {
      throw new BrowserApiError("No valid tabs to bookmark");
    }

    const folderTitle = `Man Tab - ${new Date().toISOString().split("T")[0]}`;
    const newFolder = await browserApi.bookmarks.create({ title: folderTitle });

    if (!newFolder?.id) {
      throw new BrowserApiError("Failed to create bookmark folder");
    }

    const bookmarkPromises = validTabs.map((tab) =>
      browserApi.bookmarks
        .create({
          parentId: newFolder.id,
          title: tab.title || "Untitled",
          url: tab.url,
        })
        .catch((error: Error) => {
          console.warn(`Failed to bookmark tab: ${tab.title}`, error);
          return null;
        }),
    );

    const results = await Promise.allSettled(bookmarkPromises);
    const failedCount = results.filter(
      (result) => result.status === "rejected",
    ).length;

    if (failedCount > 0) {
      console.warn(`${failedCount} bookmarks failed to create`);
    }
  } catch (error) {
    console.error("Error bookmarking tabs:", error);
    throw new BrowserApiError(
      `Failed to bookmark tabs: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Checks if the MHTML capture API is available
 * @returns Boolean indicating if MHTML save is supported
 */
export const isMhtSaveAvailable = (): boolean => {
  return !!browserApi?.pageCapture?.saveAsMHTML;
};

/**
 * Captures a tab as MHTML
 * @param tabId - The ID of the tab to capture
 * @returns Promise that resolves to a Blob containing the MHTML data
 */
export const saveAsMht = async (tabId: number): Promise<Blob> => {
  try {
    if (!isMhtSaveAvailable()) {
      throw new BrowserApiError(
        "MHTML capture is not supported in this browser",
      );
    }

    if (typeof tabId !== "number" || tabId < 0) {
      throw new BrowserApiError("Invalid tab ID");
    }

    return new Promise<Blob>((resolve, reject) => {
      browserApi.pageCapture.saveAsMHTML({ tabId }, (mht: Blob) => {
        if (browserApi.runtime.lastError) {
          reject(
            new BrowserApiError(
              `MHTML capture failed: ${browserApi.runtime.lastError.message}`,
            ),
          );
          return;
        }

        if (!mht) {
          reject(new BrowserApiError("No MHTML data received"));
          return;
        }

        resolve(mht);
      });
    });
  } catch (error) {
    console.error("Error capturing tab as MHTML:", error);
    if (error instanceof BrowserApiError) {
      throw error;
    }
    throw new BrowserApiError(
      `Failed to capture tab as MHTML: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

// Export the browser service as a complete object
export const browserService: BrowserService = {
  getAllTabs,
  getSavedSessions,
  saveSessions,
  restoreSession,
  pinTab,
  goToTab,
  closeTabs,
  bookmarkTabs,
  saveAsMht,
  isMhtSaveAvailable,
};
