import { renderTabList, renderGroupedTabList } from "./components/tabList.js";
import { renderSessionList } from "./components/sessionList.js";
import * as chromeService from "./services/chrome.js";
import { getDomain, getCurrentTimestamp } from "./utils/index.js";

// --- DOM Elements ---
const tabListDiv = document.getElementById("tab-list");
const selectAllCheckbox = document.getElementById("select-all");
const closeBtn = document.getElementById("close-btn");
const bookmarkBtn = document.getElementById("bookmark-btn");
const mhtBtn = document.getElementById("mht-btn");
const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toast-message");
const searchInput = document.getElementById("search-input");
const timeFilterSelect = document.getElementById("time-filter");
const windowScopeSelect = document.getElementById("window-scope");
const tabCountSpan = document.getElementById("tab-count");
const selectedCountSpan = document.getElementById("selected-count");
const viewModeSelect = document.getElementById("view-mode");
const sortBySelect = document.getElementById("sort-by");
const sessionNameInput = document.getElementById("session-name-input");
const saveSessionBtn = document.getElementById("save-session-btn");
const sessionListDiv = document.getElementById("session-list");
const importSessionsBtn = document.getElementById("import-sessions-btn");
const exportSessionsBtn = document.getElementById("export-sessions-btn");

// --- State ---
let allTabs = [];
let filteredTabs = [];
let selectedTabs = new Set();
let closeConfirmation = false;
let focusedTabIndex = -1;
let savedSessions = [];
let collapsedGroups = new Set();

// --- Utility ---
function showToast(message, isError = false) {
  toastMessage.textContent = message;
  toast.className = "toast"; // Reset classes
  toast.classList.add(isError ? "bg-red-500" : "bg-green-500");
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function resetCloseButtonState() {
  closeBtn.textContent = "Close Tabs";
  closeBtn.classList.remove("confirm-close");
  closeConfirmation = false;
}

// --- Rendering ---
function applyFiltersAndRender() {
  focusedTabIndex = -1;
  resetCloseButtonState();
  const timeFilter = parseInt(timeFilterSelect.value, 10);
  const searchTerm = searchInput.value.toUpperCase().trim();
  const viewMode = viewModeSelect.value;
  const sortBy = sortBySelect.value;
  const now = new Date().getTime();

  filteredTabs = allTabs.filter((tab) => {
    if (timeFilter > 0 && now - tab.lastAccessed < timeFilter) return false;
    if (
      searchTerm &&
      !tab.title.toUpperCase().includes(searchTerm) &&
      !tab.url.toUpperCase().includes(searchTerm)
    )
      return false;
    return true;
  });

  if (sortBy === "title") {
    filteredTabs.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === "url") {
    filteredTabs.sort((a, b) => a.url.localeCompare(b.url));
  } else {
    filteredTabs.sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  if (viewMode === "grouped") {
    renderGroupedTabList(
      tabListDiv,
      filteredTabs,
      selectedTabs,
      collapsedGroups,
    );
  } else {
    renderTabList(tabListDiv, filteredTabs, selectedTabs);
  }
  updateSelectAllCheckboxState();
}

function updateCounts(total, selected) {
  tabCountSpan.textContent = total;
  selectedCountSpan.textContent = selected;
  const hasSelection = selected > 0;
  closeBtn.disabled = !hasSelection;
  bookmarkBtn.disabled = !hasSelection;
  saveSessionBtn.disabled = !hasSelection;
  mhtBtn.disabled = !hasSelection;
  if (!hasSelection) {
    resetCloseButtonState();
  }
}

function updateSelectAllCheckboxState() {
  if (filteredTabs.length === 0) {
    selectAllCheckbox.checked = false;
    return;
  }
  const allDisplayedSelected = filteredTabs.every((tab) =>
    selectedTabs.has(tab.id),
  );
  selectAllCheckbox.checked = allDisplayedSelected;
}

// --- Event Handlers ---
async function handleSaveSession() {
  const sessionName = sessionNameInput.value.trim();
  if (selectedTabs.size === 0) {
    showToast("SELECT TABS TO SAVE.", true);
    return;
  }
  if (!sessionName) {
    showToast("ENTER A SESSION NAME.", true);
    return;
  }

  const tabsToSave = allTabs
    .filter((tab) => selectedTabs.has(tab.id))
    .map((tab) => ({ url: tab.url, title: tab.title }));

  const newSession = {
    name: sessionName,
    tabs: tabsToSave,
    date: new Date().getTime(),
  };

  savedSessions.unshift(newSession);
  try {
    await chromeService.saveSessions(savedSessions);
    showToast(`SAVED SESSION: ${sessionName}`);
    sessionNameInput.value = "";
    renderSessionList(sessionListDiv, savedSessions);
  } catch (error) {
    showToast("ERROR: COULD NOT SAVE SESSION.", true);
  }
}

async function handleRestoreSession(event) {
  const sessionIndex = parseInt(
    event.target.closest(".session-item").dataset.sessionIndex,
    10,
  );
  const session = savedSessions[sessionIndex];
  if (!session) return;

  try {
    await chromeService.restoreSession(session);
    showToast(`RESTORED SESSION: ${session.name}`);
  } catch (error) {
    showToast("ERROR: COULD NOT RESTORE.", true);
  }
}

async function handleDeleteSession(event) {
  const sessionIndex = parseInt(
    event.target.closest(".session-item").dataset.sessionIndex,
    10,
  );
  const sessionName = savedSessions[sessionIndex].name;

  savedSessions.splice(sessionIndex, 1);

  try {
    await chromeService.saveSessions(savedSessions);
    showToast(`DELETED SESSION: ${sessionName}`);
    renderSessionList(sessionListDiv, savedSessions);
  } catch (error) {
    showToast("ERROR: COULD NOT DELETE.", true);
  }
}

function handleSelectionChange(event) {
  const tabId = parseInt(event.target.dataset.tabId, 10);
  if (event.target.checked) selectedTabs.add(tabId);
  else selectedTabs.delete(tabId);
  updateCounts(allTabs.length, selectedTabs.size);
  updateSelectAllCheckboxState();
  resetCloseButtonState();
}

async function handlePinTab(event) {
  const tabId = parseInt(event.target.dataset.tabId, 10);
  const tab = allTabs.find((t) => t.id === tabId);
  if (!tab) return;

  try {
    await chromeService.pinTab(tabId, !tab.pinned);
    tab.pinned = !tab.pinned;
    event.target.classList.toggle("pinned");
    event.target.title = tab.pinned ? "Unpin tab" : "Pin tab";
    showToast(tab.pinned ? "TAB PINNED." : "TAB UNPINNED.");
    resetCloseButtonState();
  } catch (error) {
    showToast("ERROR: COULD NOT PIN TAB.", true);
  }
}

function handleSelectAll(event) {
  resetCloseButtonState();
  const isChecked = event.target.checked;

  filteredTabs.forEach((tab) => {
    if (isChecked) selectedTabs.add(tab.id);
    else selectedTabs.delete(tab.id);
  });
  applyFiltersAndRender();
  updateCounts(allTabs.length, selectedTabs.size);
}

async function handleCloseTabs() {
  if (!closeConfirmation) {
    closeBtn.textContent = "Confirm?";
    closeBtn.classList.add("confirm-close");
    closeConfirmation = true;
    setTimeout(resetCloseButtonState, 3000);
    return;
  }

  if (selectedTabs.size === 0) return;
  try {
    await chromeService.closeTabs(selectedTabs);
    showToast(`CLOSED ${selectedTabs.size} TAB(S).`);
    selectedTabs.clear();
    await initialize();
  } catch (error) {
    showToast("ERROR: COULD NOT CLOSE.", true);
  } finally {
    resetCloseButtonState();
  }
}

async function handleBookmarkTabs() {
  resetCloseButtonState();
  if (selectedTabs.size === 0) return;
  try {
    const tabsToBookmark = allTabs.filter((tab) => selectedTabs.has(tab.id));
    await chromeService.bookmarkTabs(tabsToBookmark);
    showToast(`BOOKMARKED ${tabsToBookmark.length} TAB(S).`);
  } catch (error) {
    showToast("ERROR: COULD NOT BOOKMARK.", true);
  }
}

async function handleSaveAsMht() {
  resetCloseButtonState();
  if (selectedTabs.size === 0) return;

  const tabsToSave = allTabs.filter((tab) => selectedTabs.has(tab.id));

  if (tabsToSave.length === 1) {
    const tab = tabsToSave[0];
    try {
      const mht = await chromeService.saveAsMht(tab.id);
      const url = URL.createObjectURL(mht);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tab.title || "page"}_${getCurrentTimestamp()}.mht`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("SAVED TAB AS MHT.");
    } catch (error) {
      showToast(
        `ERROR: COULD NOT SAVE "${tab.title}". DETAIL: ${error.message}`,
        true,
      );
    }
  } else {
    const zip = new JSZip();
    for (const tab of tabsToSave) {
      try {
        const mht = await chromeService.saveAsMht(tab.id);
        zip.file(`${tab.title || "page"}.mht`, mht);
      } catch (error) {
        showToast(
          `ERROR: COULD NOT SAVE "${tab.title}". DETAIL: ${error.message}`,
          true,
        );

        return;
      }
    }

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tabs_${getCurrentTimestamp()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("SAVED TABS AS ZIP.");
    } catch (error) {
      showToast("ERROR: COULD NOT SAVE ZIP.", true);
    }
  }
}

async function handleExportSessions() {
  if (savedSessions.length === 0) {
    showToast("NO SESSIONS TO EXPORT.", true);
    return;
  }

  const dataStr = JSON.stringify(savedSessions, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `man-tab-sessions_${getCurrentTimestamp()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("SESSIONS EXPORTED.");
}

function handleImportSessions() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedSessions = JSON.parse(event.target.result);

        if (
          !Array.isArray(importedSessions) ||
          importedSessions.some((s) => !s.name || !s.tabs)
        ) {
          throw new Error("Invalid file format.");
        }

        const existingSessionNames = new Set(savedSessions.map((s) => s.name));
        const newSessions = importedSessions.filter(
          (s) => !existingSessionNames.has(s.name),
        );

        if (newSessions.length === 0) {
          showToast("NO NEW SESSIONS TO IMPORT.");
          return;
        }

        savedSessions.unshift(...newSessions);
        await chromeService.saveSessions(savedSessions);
        renderSessionList(sessionListDiv, savedSessions);
        showToast(`IMPORTED ${newSessions.length} SESSION(S).`);
      } catch (error) {
        showToast(`ERROR: ${error.message}`, true);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// --- Event Listeners ---
function setupEventListeners() {
  searchInput.addEventListener("input", applyFiltersAndRender);
  timeFilterSelect.addEventListener("change", applyFiltersAndRender);
  viewModeSelect.addEventListener("change", applyFiltersAndRender);
  sortBySelect.addEventListener("change", applyFiltersAndRender);
  windowScopeSelect.addEventListener("change", initialize);

  closeBtn.addEventListener("click", handleCloseTabs);
  bookmarkBtn.addEventListener("click", handleBookmarkTabs);
  mhtBtn.addEventListener("click", handleSaveAsMht);
  saveSessionBtn.addEventListener("click", handleSaveSession);
  selectAllCheckbox.addEventListener("change", handleSelectAll);
  exportSessionsBtn.addEventListener("click", handleExportSessions);
  importSessionsBtn.addEventListener("click", handleImportSessions);

  tabListDiv.addEventListener("click", (event) => {
    const target = event.target;
    if (target.classList.contains("pin-tab-btn")) handlePinTab(event);
    else if (target.classList.contains("go-to-tab-btn")) {
      const tabId = parseInt(target.dataset.tabId, 10);
      const windowId = parseInt(target.dataset.windowId, 10);
      if (tabId && windowId) chromeService.goToTab(tabId, windowId);
    } else if (
      target.closest(".tab-group-header") &&
      !target.classList.contains("group-checkbox")
    ) {
      const header = target.closest(".tab-group-header");
      const domain = header.dataset.domain;
      const content = tabListDiv.querySelector(
        `.tab-group-content[data-domain-content="${domain}"]`,
      );
      if (content) {
        content.classList.toggle("collapsed");
        if (content.classList.contains("collapsed"))
          collapsedGroups.add(domain);
        else collapsedGroups.delete(domain);
      }
    }
  });

  tabListDiv.addEventListener("change", (event) => {
    const target = event.target;
    if (target.classList.contains("tab-checkbox")) {
      handleSelectionChange(event);
    } else if (target.classList.contains("group-checkbox")) {
      const domain = target.dataset.domain;
      const isChecked = target.checked;
      const tabsInGroup = filteredTabs.filter(
        (tab) => getDomain(tab.url) === domain,
      );
      tabsInGroup.forEach((tab) => {
        if (isChecked) selectedTabs.add(tab.id);
        else selectedTabs.delete(tab.id);
      });
      applyFiltersAndRender();
      updateCounts(allTabs.length, selectedTabs.size);
      resetCloseButtonState();
    }
  });

  sessionListDiv.addEventListener("click", (event) => {
    if (event.target.classList.contains("restore-session-btn"))
      handleRestoreSession(event);
    else if (event.target.classList.contains("delete-session-btn"))
      handleDeleteSession(event);
  });
}

// --- Initialization ---
async function initialize() {
  try {
    const scope = windowScopeSelect.value;
    const [tabs, sessions] = await Promise.all([
      chromeService.getAllTabs(scope),
      chromeService.getSavedSessions(),
    ]);
    allTabs = tabs.map((t) => ({
      ...t,
      lastAccessed: t.lastActiveTime || Date.now(),
    }));
    savedSessions = sessions;
    applyFiltersAndRender();
    renderSessionList(sessionListDiv, savedSessions);
    updateCounts(allTabs.length, selectedTabs.size);
  } catch (error) {
    console.error("Error initializing extension:", error);
    tabListDiv.innerHTML = '<div id="message-area">Error loading tabs.</div>';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initialize();
  setupEventListeners();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.tabsChanged) {
    initialize();
  }
});
