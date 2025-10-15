/**
 * Main Popup Script - TypeScript implementation with comprehensive state management
 * Handles the main UI logic for the Man Tab browser extension
 */

import JSZip from "jszip";
import {
  renderTabList,
  renderGroupedTabList,
  updateTabItemState,
} from "./components/tabList.js";
import {
  renderSessionList,
  enableSessionEdit,
  exportSingleSession,
  updateSessionItem,
} from "./components/sessionList.js";
import * as browserService from "./services/browser.js";
import type {
  Tab,
  Session,
  AppState,
  FilterOptions,
  ViewMode,
  SortBy,
  WindowScope,
  ToastOptions,
} from "../types/index.js";
import {
  getDomain,
  getCurrentTimestamp,
  validateSessionName,
  createSafeFilename,
  debounce,
  safeJsonParse,
} from "./utils/index.js";
import {
  ViewMode as ViewModeEnum,
  SortBy as SortByEnum,
  WindowScope as WindowScopeEnum,
  TOAST_DURATION,
  isTabChangeMessage,
} from "../types/index.js";

/**
 * Application state management class
 */
class ManTabApp {
  private state: AppState;
  private elements: Record<string, HTMLElement>;
  private debouncedRender: () => void;

  constructor() {
    this.state = {
      allTabs: [],
      filteredTabs: [],
      selectedTabs: new Set(),
      closeConfirmation: false,
      focusedTabIndex: -1,
      savedSessions: [],
      collapsedGroups: new Set(),
    };

    this.elements = {};
    this.debouncedRender = debounce(() => this.applyFiltersAndRender(), 150);
  }

  /**
   * Initialize the application
   */
  public async init(): Promise<void> {
    try {
      this.cacheElements();
      this.setupEventListeners();
      await this.loadInitialData();
      this.setupMessageListener();

      // Hide MHT functionality if not available
      if (!browserService.isMhtSaveAvailable()) {
        document.body.classList.add("no-mht");
      }

      console.log("Man Tab popup initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Man Tab popup:", error);
      this.showToast({
        message: "Failed to initialize extension",
        isError: true,
      });
    }
  }

  /**
   * Cache DOM elements for performance
   */
  private cacheElements(): void {
    const elementIds = [
      "tab-list",
      "select-all",
      "close-btn",
      "bookmark-btn",
      "mht-btn",
      "toast",
      "toast-message",
      "search-input",
      "time-filter",
      "window-scope",
      "tab-count",
      "selected-count",
      "view-mode",
      "sort-by",
      "session-name-input",
      "save-session-btn",
      "session-list",
      "import-sessions-btn",
      "export-sessions-btn",
      "toggle-filters-btn",
      "collapsible-filters",
      "resizer",
    ];

    elementIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        this.elements[id] = element;
      } else {
        this.showToast({
          message: `Element with ID '${id}' not found`,
          isError: true,
        });
      }
    });
  }

  /**
   * Set up all event listeners
   */
  private setupEventListeners(): void {
    this.setupResizer();

    // Filter controls
    this.elements["search-input"]?.addEventListener("input", () =>
      this.debouncedRender(),
    );
    this.elements["time-filter"]?.addEventListener("change", () =>
      this.applyFiltersAndRender(),
    );
    this.elements["view-mode"]?.addEventListener("change", () =>
      this.applyFiltersAndRender(),
    );
    this.elements["sort-by"]?.addEventListener("change", () =>
      this.applyFiltersAndRender(),
    );
    this.elements["window-scope"]?.addEventListener("change", () =>
      this.loadInitialData(),
    );

    // Action buttons
    this.elements["close-btn"]?.addEventListener("click", () =>
      this.handleCloseTabs(),
    );
    this.elements["bookmark-btn"]?.addEventListener("click", () =>
      this.handleBookmarkTabs(),
    );
    this.elements["mht-btn"]?.addEventListener("click", () =>
      this.handleSaveAsMht(),
    );
    this.elements["save-session-btn"]?.addEventListener("click", () =>
      this.handleSaveSession(),
    );
    this.elements["toggle-filters-btn"]?.addEventListener("click", () =>
      this.toggleFilters(),
    );
    this.elements["select-all"]?.addEventListener("change", (e) =>
      this.handleSelectAll(e as Event),
    );
    this.elements["export-sessions-btn"]?.addEventListener("click", () =>
      this.handleExportSessions(),
    );
    this.elements["import-sessions-btn"]?.addEventListener("click", () =>
      this.handleImportSessions(),
    );

    // Tab list event delegation
    this.elements["tab-list"]?.addEventListener("click", (e) =>
      this.handleTabListClick(e),
    );
    this.elements["tab-list"]?.addEventListener("change", (e) =>
      this.handleTabListChange(e),
    );

    // Session list event delegation
    this.elements["session-list"]?.addEventListener("click", (e) =>
      this.handleSessionListClick(e),
    );

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) =>
      this.handleKeyboardShortcuts(e),
    );

    // Session name input enter key
    const sessionInput = this.elements[
      "session-name-input"
    ] as HTMLInputElement;
    sessionInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.handleSaveSession();
      }
    });
  }

  /**
   * Setup the resizer element to allow resizing of the tab list and session containers.
   */
  private setupResizer(): void {
    const resizer = this.elements["resizer"];
    const tabListContainer = this.elements["tab-list"]
      ?.parentElement as HTMLElement;
    const sessionContainer = this.elements["session-list"]
      ?.parentElement as HTMLElement;

    if (!resizer || !tabListContainer || !sessionContainer) {
      return;
    }

    sessionContainer.style.flex = "1 1 auto";
    tabListContainer.style.flexShrink = "0";

    const savedHeight = localStorage.getItem("tabListHeight");
    if (savedHeight) {
      tabListContainer.style.height = savedHeight;
    } else {
      const appContainer = resizer.parentElement as HTMLElement;
      if (appContainer) {
        const header = appContainer.querySelector(
          ".header-container",
        ) as HTMLElement;
        const controls = appContainer.querySelector(
          ".controls-container",
        ) as HTMLElement;
        const footer = appContainer.querySelector(
          ".footer-container",
        ) as HTMLElement;

        const fixedElementsHeight =
          (header?.offsetHeight || 0) +
          (controls?.offsetHeight || 0) +
          (footer?.offsetHeight || 0) +
          resizer.offsetHeight;

        const gapsHeight = 5 * 12;
        const availableHeight =
          appContainer.clientHeight - fixedElementsHeight - gapsHeight;

        const initialTabListHeight = Math.max(100, availableHeight * 0.6);
        tabListContainer.style.height = `${initialTabListHeight}px`;
      }
    }

    const mouseDownHandler = (e: MouseEvent) => {
      e.preventDefault();

      const startY = e.clientY;
      const startHeight = tabListContainer.offsetHeight;
      const parentElement = resizer.parentElement as HTMLElement;

      const mouseMoveHandler = (e: MouseEvent) => {
        const dy = e.clientY - startY;
        const newHeight = startHeight + dy;

        const minTabListHeight = 100;
        const minSessionHeight = 120;

        const header = parentElement.querySelector(
          ".header-container",
        ) as HTMLElement;
        const controls = parentElement.querySelector(
          ".controls-container",
        ) as HTMLElement;
        const footer = parentElement.querySelector(
          ".footer-container",
        ) as HTMLElement;

        const fixedElementsHeight =
          (header?.offsetHeight || 0) +
          (controls?.offsetHeight || 0) +
          (footer?.offsetHeight || 0) +
          resizer.offsetHeight;

        const gapsHeight = 5 * 12;
        ``;

        const maxHeight =
          parentElement.offsetHeight -
          fixedElementsHeight -
          gapsHeight -
          minSessionHeight;

        if (newHeight > minTabListHeight && newHeight < maxHeight) {
          tabListContainer.style.height = `${newHeight}px`;
        }
      };

      const mouseUpHandler = () => {
        localStorage.setItem("tabListHeight", tabListContainer.style.height);
        document.removeEventListener("mousemove", mouseMoveHandler);
        document.removeEventListener("mouseup", mouseUpHandler);
      };

      document.addEventListener("mousemove", mouseMoveHandler);
      document.addEventListener("mouseup", mouseUpHandler);
    };

    resizer.addEventListener("mousedown", mouseDownHandler);
  }

  /**
   * Load initial data (tabs and sessions)
   */
  private async loadInitialData(): Promise<void> {
    try {
      const scopeSelect = this.elements["window-scope"] as HTMLSelectElement;
      const scope =
        (scopeSelect?.value as WindowScope) || WindowScopeEnum.CURRENT;

      const [tabs, sessions] = await Promise.all([
        browserService.getAllTabs(scope),
        browserService.getSavedSessions(),
      ]);

      this.state.allTabs = tabs.map((tab) => ({
        ...tab,
        lastAccessed: tab.lastAccessed || Date.now(),
      }));

      this.state.savedSessions = sessions;
      this.applyFiltersAndRender();
      this.renderSessionList();
      this.updateCounts();
    } catch (error) {
      console.error("Error loading initial data:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      this.showToast({
        message: `Error loading data: ${errorMsg}`,
        isError: true,
      });
    }
  }

  /**
   * Apply filters and render tab list
   */
  private applyFiltersAndRender(): void {
    try {
      this.state.focusedTabIndex = -1;
      this.resetCloseButtonState();

      const filters = this.getFilterOptions();
      this.state.filteredTabs = this.applyFilters(this.state.allTabs, filters);

      const viewMode = (this.elements["view-mode"] as HTMLSelectElement)
        ?.value as ViewMode;
      const tabListDiv = this.elements["tab-list"];

      if (!tabListDiv) {
        console.error("Tab list container not found");
        return;
      }

      if (viewMode === ViewModeEnum.GROUPED) {
        renderGroupedTabList(
          tabListDiv,
          this.state.filteredTabs,
          this.state.selectedTabs,
          this.state.collapsedGroups,
        );
      } else {
        renderTabList(
          tabListDiv,
          this.state.filteredTabs,
          this.state.selectedTabs,
        );
      }

      this.updateSelectAllCheckboxState();
      this.updateCounts();
    } catch (error) {
      console.error("Error applying filters and rendering:", error);
    }
  }

  /**
   * Get current filter options from UI
   */
  private getFilterOptions(): FilterOptions {
    const timeFilterSelect = this.elements["time-filter"] as HTMLSelectElement;
    const searchInput = this.elements["search-input"] as HTMLInputElement;
    const viewModeSelect = this.elements["view-mode"] as HTMLSelectElement;
    const sortBySelect = this.elements["sort-by"] as HTMLSelectElement;
    const windowScopeSelect = this.elements[
      "window-scope"
    ] as HTMLSelectElement;

    return {
      timeFilter: parseInt(timeFilterSelect?.value || "0", 10),
      searchTerm: searchInput?.value?.trim()?.toUpperCase() || "",
      viewMode: (viewModeSelect?.value as ViewMode) || ViewModeEnum.LIST,
      sortBy: (sortBySelect?.value as SortBy) || SortByEnum.LAST_ACCESSED,
      windowScope:
        (windowScopeSelect?.value as WindowScope) || WindowScopeEnum.CURRENT,
    };
  }

  /**
   * Toggle filters visibility
   */
  private toggleFilters(): void {
    const filters = this.elements["collapsible-filters"];
    if (filters) {
      if (filters.style.display === "none") {
        filters.style.display = "flex";
        // Timeout to allow display property to be applied before adding class for transition
        setTimeout(() => {
          filters.classList.add("open");
        }, 10);
      } else {
        filters.classList.remove("open");
        // The timeout allows the animation to complete before setting display to none
        setTimeout(() => {
          filters.style.display = "none";
        }, 300); // This should match the transition duration in your CSS
      }
    }
  }

  /**
   * Apply filters to tab array
   */
  private applyFilters(tabs: Tab[], filters: FilterOptions): Tab[] {
    const now = Date.now();

    const filtered = tabs.filter((tab) => {
      // Time filter
      if (
        filters.timeFilter > 0 &&
        now - tab.lastAccessed < filters.timeFilter
      ) {
        return false;
      }

      // Search filter
      if (filters.searchTerm) {
        const title = tab.title?.toUpperCase() || "";
        const url = tab.url?.toUpperCase() || "";
        if (
          !title.includes(filters.searchTerm) &&
          !url.includes(filters.searchTerm)
        ) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    switch (filters.sortBy) {
      case SortByEnum.TITLE:
        filtered.sort((a, b) =>
          (a.title || a.url).localeCompare(b.title || b.url),
        );
        break;
      case SortByEnum.URL:
        filtered.sort((a, b) => a.url.localeCompare(b.url));
        break;
      default:
        filtered.sort((a, b) => b.lastAccessed - a.lastAccessed);
        break;
    }

    return filtered;
  }

  /**
   * Update tab and selection counts in UI
   */
  private updateCounts(): void {
    const tabCountSpan = this.elements["tab-count"];
    const selectedCountSpan = this.elements["selected-count"];

    if (tabCountSpan)
      tabCountSpan.textContent = this.state.allTabs.length.toString();
    if (selectedCountSpan)
      selectedCountSpan.textContent = this.state.selectedTabs.size.toString();

    const hasSelection = this.state.selectedTabs.size > 0;

    // Enable/disable action buttons
    const actionButtons = [
      "close-btn",
      "bookmark-btn",
      "save-session-btn",
      "mht-btn",
    ];
    actionButtons.forEach((buttonId) => {
      const button = this.elements[buttonId] as HTMLButtonElement;
      if (button) {
        button.disabled = !hasSelection;
      }
    });

    if (!hasSelection) {
      this.resetCloseButtonState();
    }
  }

  /**
   * Update select all checkbox state
   */
  private updateSelectAllCheckboxState(): void {
    const selectAllCheckbox = this.elements["select-all"] as HTMLInputElement;
    if (!selectAllCheckbox) return;

    if (this.state.filteredTabs.length === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
      return;
    }

    const selectedCount = this.state.filteredTabs.filter((tab) =>
      this.state.selectedTabs.has(tab.id),
    ).length;

    selectAllCheckbox.checked =
      selectedCount === this.state.filteredTabs.length;
    selectAllCheckbox.indeterminate =
      selectedCount > 0 && selectedCount < this.state.filteredTabs.length;
  }

  /**
   * Reset close button to normal state
   */
  private resetCloseButtonState(): void {
    const closeBtn = this.elements["close-btn"] as HTMLButtonElement;
    if (closeBtn) {
      closeBtn.textContent = "Close Tabs";
      closeBtn.classList.remove("confirm-close");
    }
    this.state.closeConfirmation = false;
  }

  /**
   * Handle tab list click events
   */
  private handleTabListClick(event: Event): void {
    const target = event.target as HTMLElement;

    if (target.classList.contains("pin-tab-btn")) {
      this.handlePinTab(event);
    } else if (target.classList.contains("go-to-tab-btn")) {
      this.handleGoToTab(target);
    } else if (
      target.closest(".tab-group-header") &&
      !target.classList.contains("group-checkbox")
    ) {
      this.handleGroupHeaderClick(target);
    }
  }

  /**
   * Handle tab list change events (checkboxes)
   */
  private handleTabListChange(event: Event): void {
    const target = event.target as HTMLInputElement;

    if (target.classList.contains("tab-checkbox")) {
      this.handleTabSelectionChange(target);
    } else if (target.classList.contains("group-checkbox")) {
      this.handleGroupSelectionChange(target);
    }
  }

  /**
   * Handle individual tab selection change
   */
  private handleTabSelectionChange(checkbox: HTMLInputElement): void {
    const tabId = parseInt(checkbox.dataset.tabId || "0", 10);

    if (checkbox.checked) {
      this.state.selectedTabs.add(tabId);
    } else {
      this.state.selectedTabs.delete(tabId);
    }

    this.updateCounts();
    this.updateSelectAllCheckboxState();
    this.resetCloseButtonState();
  }

  /**
   * Handle group selection change
   */
  private handleGroupSelectionChange(checkbox: HTMLInputElement): void {
    const domain = checkbox.dataset.domain;
    if (!domain) return;

    const tabsInGroup = this.state.filteredTabs.filter(
      (tab) => getDomain(tab.url) === domain,
    );

    tabsInGroup.forEach((tab) => {
      if (checkbox.checked) {
        this.state.selectedTabs.add(tab.id);
      } else {
        this.state.selectedTabs.delete(tab.id);
      }
    });

    this.applyFiltersAndRender();
    this.resetCloseButtonState();
  }

  /**
   * Handle group header click (expand/collapse)
   */
  private handleGroupHeaderClick(target: HTMLElement): void {
    const header = target.closest(".tab-group-header") as HTMLElement;
    if (!header) return;

    const domain = header.dataset.domain;
    if (!domain) return;

    const content = this.elements["tab-list"]?.querySelector(
      `.tab-group-content[data-domain-content="${domain}"]`,
    ) as HTMLElement;

    if (content) {
      content.classList.toggle("collapsed");
      const isCollapsed = content.classList.contains("collapsed");

      if (isCollapsed) {
        this.state.collapsedGroups.add(domain);
      } else {
        this.state.collapsedGroups.delete(domain);
      }

      // Update expand icon
      const expandIcon = header.querySelector(".expand-icon") as HTMLElement;
      if (expandIcon) {
        expandIcon.textContent = isCollapsed ? "▶" : "▼";
        expandIcon.className = `expand-icon ${isCollapsed ? "collapsed" : "expanded"}`;
      }

      header.setAttribute("aria-expanded", (!isCollapsed).toString());
    }
  }

  /**
   * Handle pin tab button click
   */
  private async handlePinTab(event: Event): Promise<void> {
    const target = event.target as HTMLElement;
    const tabId = parseInt(target.dataset.tabId || "0", 10);
    const tab = this.state.allTabs.find((t) => t.id === tabId);

    if (!tab) return;

    try {
      await browserService.pinTab(tabId, !tab.pinned);
      tab.pinned = !tab.pinned;

      // Update UI
      const tabListElement = this.elements["tab-list"];
      if (tabListElement) {
        updateTabItemState(tabListElement, tabId, {
          pinned: tab.pinned,
        });
      }

      this.showToast({
        message: tab.pinned ? "TAB PINNED" : "TAB UNPINNED",
      });

      this.resetCloseButtonState();
    } catch (error) {
      console.error("Error pinning tab:", error);
      this.showToast({
        message: "ERROR: COULD NOT PIN TAB",
        isError: true,
      });
    }
  }

  /**
   * Handle go to tab button click
   */
  private async handleGoToTab(target: HTMLElement): Promise<void> {
    const tabId = parseInt(target.dataset.tabId || "0", 10);
    const windowId = parseInt(target.dataset.windowId || "0", 10);

    if (tabId && windowId) {
      try {
        await browserService.goToTab(tabId, windowId);
      } catch (error) {
        console.error("Error switching to tab:", error);
        this.showToast({
          message: "ERROR: COULD NOT SWITCH TO TAB",
          isError: true,
        });
      }
    }
  }

  /**
   * Handle select all checkbox change
   */
  private handleSelectAll(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.resetCloseButtonState();

    this.state.filteredTabs.forEach((tab) => {
      if (checkbox.checked) {
        this.state.selectedTabs.add(tab.id);
      } else {
        this.state.selectedTabs.delete(tab.id);
      }
    });

    this.applyFiltersAndRender();
  }

  /**
   * Handle close tabs button click
   */
  private async handleCloseTabs(): Promise<void> {
    if (!this.state.closeConfirmation) {
      const closeBtn = this.elements["close-btn"] as HTMLButtonElement;
      if (closeBtn) {
        closeBtn.textContent = "Confirm?";
        closeBtn.classList.add("confirm-close");
      }
      this.state.closeConfirmation = true;

      setTimeout(() => this.resetCloseButtonState(), 3000);
      return;
    }

    if (this.state.selectedTabs.size === 0) return;

    try {
      await browserService.closeTabs(this.state.selectedTabs);
      this.showToast({
        message: `CLOSED ${this.state.selectedTabs.size} TAB(S)`,
      });

      this.state.selectedTabs.clear();
      await this.loadInitialData();
    } catch (error) {
      console.error("Error closing tabs:", error);
      this.showToast({
        message: "ERROR: COULD NOT CLOSE TABS",
        isError: true,
      });
    } finally {
      this.resetCloseButtonState();
    }
  }

  /**
   * Handle bookmark tabs button click
   */
  private async handleBookmarkTabs(): Promise<void> {
    this.resetCloseButtonState();

    if (this.state.selectedTabs.size === 0) return;

    try {
      const tabsToBookmark = this.state.allTabs.filter((tab) =>
        this.state.selectedTabs.has(tab.id),
      );

      await browserService.bookmarkTabs(tabsToBookmark);
      this.showToast({
        message: `BOOKMARKED ${tabsToBookmark.length} TAB(S)`,
      });
    } catch (error) {
      console.error("Error bookmarking tabs:", error);
      this.showToast({
        message: "ERROR: COULD NOT BOOKMARK TABS",
        isError: true,
      });
    }
  }

  /**
   * Handle save as MHT button click
   */
  private async handleSaveAsMht(): Promise<void> {
    this.resetCloseButtonState();

    if (this.state.selectedTabs.size === 0) return;

    const tabsToSave = this.state.allTabs.filter((tab) =>
      this.state.selectedTabs.has(tab.id),
    );

    if (tabsToSave.length === 1 && tabsToSave[0]) {
      await this.saveSingleTabAsMht(tabsToSave[0]);
    } else {
      await this.saveMultipleTabsAsZip(tabsToSave);
    }
  }

  /**
   * Save single tab as MHT
   */
  private async saveSingleTabAsMht(tab: Tab): Promise<void> {
    try {
      const mht = await browserService.saveAsMht(tab.id);
      const url = URL.createObjectURL(mht);
      const filename = createSafeFilename(
        `${tab.title || "page"}_${getCurrentTimestamp()}.mht`,
      );

      this.downloadFile(url, filename);
      this.showToast({ message: "SAVED TAB AS MHT" });
    } catch (error) {
      console.error("Error saving tab as MHT:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      this.showToast({
        message: `ERROR: COULD NOT SAVE "${tab.title}": ${errorMsg}`,
        isError: true,
      });
    }
  }

  /**
   * Save multiple tabs as ZIP
   */
  private async saveMultipleTabsAsZip(tabs: Tab[]): Promise<void> {
    const zip = new JSZip();
    let successCount = 0;

    for (const tab of tabs) {
      try {
        const mht = await browserService.saveAsMht(tab.id);
        const filename = createSafeFilename(`${tab.title || "page"}.mht`);
        zip.file(filename, mht);
        successCount++;
      } catch (error) {
        console.error(`Error saving tab "${tab.title}" as MHT:`, error);
        // Continue with other tabs
      }
    }

    if (successCount === 0) {
      this.showToast({
        message: "ERROR: COULD NOT SAVE ANY TABS",
        isError: true,
      });
      return;
    }

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const filename = `tabs_${getCurrentTimestamp()}.zip`;

      this.downloadFile(url, filename);
      this.showToast({
        message:
          successCount < tabs.length
            ? `SAVED ${successCount}/${tabs.length} TABS AS ZIP`
            : "SAVED TABS AS ZIP",
      });
    } catch (error) {
      console.error("Error creating ZIP file:", error);
      this.showToast({
        message: "ERROR: COULD NOT CREATE ZIP FILE",
        isError: true,
      });
    }
  }

  /**
   * Download file helper
   */
  private downloadFile(url: string, filename: string): void {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  /**
   * Handle save session button click
   */
  private async handleSaveSession(): Promise<void> {
    const sessionInput = this.elements[
      "session-name-input"
    ] as HTMLInputElement;
    const sessionName = sessionInput?.value?.trim() || getCurrentTimestamp();

    if (this.state.selectedTabs.size === 0) {
      this.showToast({
        message: "SELECT TABS TO SAVE",
        isError: true,
      });
      return;
    }

    const validation = validateSessionName(sessionName);
    if (!validation.isValid) {
      this.showToast({
        message: validation.error || "INVALID SESSION NAME",
        isError: true,
      });
      return;
    }

    try {
      const tabsToSave = this.state.allTabs
        .filter((tab) => this.state.selectedTabs.has(tab.id))
        .map((tab) => ({
          url: tab.url,
          title: tab.title || tab.url,
        }));

      const newSession: Session = {
        name: sessionName,
        tabs: tabsToSave,
        date: Date.now(),
      };

      this.state.savedSessions.unshift(newSession);
      await browserService.saveSessions(this.state.savedSessions);

      this.showToast({
        message: `SAVED SESSION: ${sessionName}`,
      });

      if (sessionInput) sessionInput.value = "";
      this.renderSessionList();
    } catch (error) {
      console.error("Error saving session:", error);
      this.showToast({
        message: "ERROR: COULD NOT SAVE SESSION",
        isError: true,
      });
    }
  }

  /**
   * Handle session list click events
   */
  private handleSessionListClick(event: Event): void {
    const target = event.target as HTMLElement;

    if (target.classList.contains("restore-session-btn")) {
      this.handleRestoreSession(target);
    } else if (target.classList.contains("delete-session-btn")) {
      this.handleDeleteSession(target);
    } else if (target.classList.contains("edit-session-btn")) {
      this.handleEditSession(target);
    } else if (target.classList.contains("export-session-btn")) {
      this.handleExportSession(target);
    }
  }

  /**
   * Handle restore session button click
   */
  private async handleRestoreSession(target: HTMLElement): Promise<void> {
    const sessionElement = target.closest(".session-item") as HTMLElement;
    const sessionIndex = parseInt(
      sessionElement?.dataset.sessionIndex || "0",
      10,
    );

    const session = this.state.savedSessions[sessionIndex];
    if (!session) return;

    try {
      await browserService.restoreSession(session);
      this.showToast({
        message: `RESTORED SESSION: ${session.name}`,
      });
    } catch (error) {
      console.error("Error restoring session:", error);
      this.showToast({
        message: "ERROR: COULD NOT RESTORE SESSION",
        isError: true,
      });
    }
  }

  /**
   * Handle delete session button click
   */
  private async handleDeleteSession(target: HTMLElement): Promise<void> {
    const sessionElement = target.closest(".session-item") as HTMLElement;
    const sessionIndex = parseInt(
      sessionElement?.dataset.sessionIndex || "0",
      10,
    );

    const session = this.state.savedSessions[sessionIndex];
    if (!session) return;

    // Simple confirmation
    if (!confirm(`Delete session "${session.name}"?`)) {
      return;
    }

    try {
      const sessionName = session.name;
      this.state.savedSessions.splice(sessionIndex, 1);

      await browserService.saveSessions(this.state.savedSessions);
      this.showToast({
        message: `DELETED SESSION: ${sessionName}`,
      });

      this.renderSessionList();
    } catch (error) {
      console.error("Error deleting session:", error);
      this.showToast({
        message: "ERROR: COULD NOT DELETE SESSION",
        isError: true,
      });
    }
  }

  /**
   * Handle edit session button click
   */
  private handleEditSession(target: HTMLElement): void {
    const sessionElement = target.closest(".session-item") as HTMLElement;
    const sessionIndex = parseInt(
      sessionElement?.dataset.sessionIndex || "0",
      10,
    );

    const session = this.state.savedSessions[sessionIndex];
    if (!session) return;

    const sessionListElement = this.elements["session-list"];
    if (sessionListElement) {
      enableSessionEdit(
        sessionListElement,
        sessionIndex,
        session,
        async (newName: string) => {
          await this.saveSessionNameEdit(sessionIndex, newName);
        },
        () => {
          this.renderSessionList();
        },
      );
    }
  }

  /**
   * Save session name edit
   */
  private async saveSessionNameEdit(
    sessionIndex: number,
    newName: string,
  ): Promise<void> {
    try {
      const session = this.state.savedSessions[sessionIndex];
      if (!session) return;

      session.name = newName;
      await browserService.saveSessions(this.state.savedSessions);

      this.showToast({
        message: `UPDATED SESSION NAME: ${newName}`,
      });

      const sessionListElement = this.elements["session-list"];
      if (sessionListElement) {
        updateSessionItem(sessionListElement, sessionIndex, session);
      }
    } catch (error) {
      console.error("Error updating session name:", error);
      this.showToast({
        message: "ERROR: COULD NOT UPDATE SESSION NAME",
        isError: true,
      });
      this.renderSessionList();
    }
  }

  /**
   * Handle export session button click
   */
  private handleExportSession(target: HTMLElement): void {
    const sessionElement = target.closest(".session-item") as HTMLElement;
    const sessionIndex = parseInt(
      sessionElement?.dataset.sessionIndex || "0",
      10,
    );

    const session = this.state.savedSessions[sessionIndex];
    if (!session) return;

    try {
      exportSingleSession(session);
      this.showToast({
        message: `EXPORTED SESSION: ${session.name}`,
      });
    } catch (error) {
      console.error("Error exporting session:", error);
      this.showToast({
        message: "ERROR: COULD NOT EXPORT SESSION",
        isError: true,
      });
    }
  }

  /**
   * Handle export all sessions button click
   */
  private handleExportSessions(): void {
    if (this.state.savedSessions.length === 0) {
      this.showToast({
        message: "NO SESSIONS TO EXPORT",
        isError: true,
      });
      return;
    }

    try {
      const exportData = {
        sessions: this.state.savedSessions,
        exportedAt: Date.now(),
        version: "1.0",
        exportedBy: "Man Tab Extension",
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const filename = `man-tab-sessions_${getCurrentTimestamp()}.json`;

      this.downloadFile(url, filename);
      this.showToast({ message: "SESSIONS EXPORTED" });
    } catch (error) {
      console.error("Error exporting sessions:", error);
      this.showToast({
        message: "ERROR: COULD NOT EXPORT SESSIONS",
        isError: true,
      });
    }
  }

  /**
   * Handle import sessions button click
   */
  private handleImportSessions(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.style.display = "none";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        await this.processImportFile(file);
      } catch (error) {
        console.error("Error importing sessions:", error);
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        this.showToast({
          message: `ERROR: ${errorMsg}`,
          isError: true,
        });
      }
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  /**
   * Process imported file
   */
  private async processImportFile(file: File): Promise<void> {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = async (event) => {
        try {
          const result = event.target?.result;
          if (typeof result !== "string") {
            throw new Error("Failed to read file");
          }

          const importedData = safeJsonParse<{
            sessions?: Session[];
            version?: string;
          }>(result);

          if (!importedData) {
            throw new Error("Invalid JSON format");
          }

          // Handle both old format (array) and new format (object with sessions)
          let importedSessions: Session[] = [];
          if (Array.isArray(importedData)) {
            importedSessions = importedData;
          } else if (Array.isArray(importedData.sessions)) {
            importedSessions = importedData.sessions;
          } else {
            throw new Error("No valid sessions found in file");
          }

          if (importedSessions.some((s) => !s?.name || !s?.tabs)) {
            throw new Error("Invalid session format");
          }

          const existingSessionNames = new Set(
            this.state.savedSessions.map((s) => s.name),
          );
          const newSessions = importedSessions.filter(
            (s) => !existingSessionNames.has(s.name),
          );

          if (newSessions.length === 0) {
            this.showToast({ message: "NO NEW SESSIONS TO IMPORT" });
            resolve();
            return;
          }

          this.state.savedSessions.unshift(...newSessions);
          await browserService.saveSessions(this.state.savedSessions);
          this.renderSessionList();

          this.showToast({
            message: `IMPORTED ${newSessions.length} SESSION(S)`,
          });

          resolve();
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Render session list
   */
  private renderSessionList(): void {
    const sessionListElement = this.elements["session-list"];
    if (sessionListElement) {
      renderSessionList(sessionListElement, this.state.savedSessions, {
        showStats: true,
        onEdit: async (sessionIndex: number, newName: string) => {
          await this.saveSessionNameEdit(sessionIndex, newName);
        },
        onExport: (sessionIndex: number) => {
          const exportBtn = sessionListElement.querySelector(
            `[data-session-index="${sessionIndex}"] .export-session-btn`,
          ) as HTMLElement;
          if (exportBtn) {
            this.handleExportSession(exportBtn);
          }
        },
      });
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  private handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Only handle shortcuts when not typing in inputs
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    switch (event.key) {
      case "a":
      case "A":
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          const selectAllCheckbox = this.elements[
            "select-all"
          ] as HTMLInputElement;
          if (selectAllCheckbox) {
            selectAllCheckbox.checked = !selectAllCheckbox.checked;
            const event = new Event("change");
            Object.defineProperty(event, "target", {
              value: selectAllCheckbox,
            });
            this.handleSelectAll(event);
          }
        }
        break;
      case "Delete":
      case "Backspace":
        if (this.state.selectedTabs.size > 0) {
          event.preventDefault();
          this.handleCloseTabs();
        }
        break;
      case "Escape":
        this.state.selectedTabs.clear();
        this.applyFiltersAndRender();
        break;
    }
  }

  /**
   * Show toast notification
   */
  private showToast(options: ToastOptions): void {
    const toast = this.elements["toast"];
    const toastMessage = this.elements["toast-message"];

    if (!toast || !toastMessage) {
      console.warn("Toast elements not found");
      return;
    }

    toastMessage.textContent = options.message;
    toast.className = "toast"; // Reset classes
    toast.classList.add(options.isError ? "bg-red-500" : "bg-green-500");
    toast.classList.add("show");

    const duration = options.duration || TOAST_DURATION.MEDIUM;
    setTimeout(() => {
      toast.classList.remove("show");
    }, duration);
  }

  /**
   * Setup message listener for tab changes
   */
  private setupMessageListener(): void {
    const browserApi =
      (globalThis as any).browser || (globalThis as any).chrome;
    if (browserApi?.runtime?.onMessage) {
      browserApi.runtime.onMessage.addListener((message: unknown) => {
        if (isTabChangeMessage(message)) {
          this.loadInitialData().catch((error) => {
            console.error("Error reloading data after tab change:", error);
          });
        }
        // Don't call sendResponse for async handling
      });
    }
  }
}

// Initialize the application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const app = new ManTabApp();
  app.init().catch((error) => {
    console.error("Failed to initialize Man Tab:", error);
  });
});
