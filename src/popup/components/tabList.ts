/**
 * Tab List UI Components - TypeScript implementation with improved DOM manipulation
 * Handles rendering of both flat and grouped tab lists with proper type safety
 */

import type { Tab, GroupedTabs } from "../../types/index.js";
import {
  formatUrl,
  formatTimeAgo,
  getDomain,
  truncateText,
} from "../utils/index.js";

/**
 * Creates a single tab item element with all necessary event handlers
 * @param tab - The tab object to render
 * @param selectedTabs - Set of currently selected tab IDs
 * @returns HTMLDivElement representing the tab item
 */
const createTabItem = (tab: Tab, selectedTabs: Set<number>): HTMLDivElement => {
  // Main container
  const tabEl = document.createElement("div");
  tabEl.className = "tab-item";
  tabEl.dataset.tabId = tab.id.toString();

  // Checkbox for selection
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "checkbox tab-checkbox";
  checkbox.dataset.tabId = tab.id.toString();
  checkbox.checked = selectedTabs.has(tab.id);
  checkbox.setAttribute("aria-label", `Select tab: ${tab.title || tab.url}`);

  // Favicon with error handling
  const faviconUrl = tab.favIconUrl || "/images/icon16.png";
  const favicon = document.createElement("img");
  favicon.src = faviconUrl;
  favicon.alt = "";
  favicon.className = "favicon";
  favicon.loading = "lazy";

  favicon.addEventListener(
    "error",
    () => {
      if (favicon.src !== "/images/icon16.png") {
        favicon.src = "/images/icon16.png";
      }
    },
    { once: true },
  );

  // Tab information container
  const infoDiv = document.createElement("div");
  infoDiv.className = "tab-info";

  // Tab title
  const titleP = document.createElement("p");
  titleP.className = "tab-title";
  const displayTitle = tab.title || tab.url || "Untitled";
  titleP.title = displayTitle;
  titleP.textContent = truncateText(displayTitle, 100);

  // Tab URL
  const urlP = document.createElement("p");
  urlP.className = "tab-url";
  const formattedUrl = formatUrl(tab.url);
  urlP.title = tab.url;
  urlP.textContent = truncateText(formattedUrl, 80);

  infoDiv.appendChild(titleP);
  infoDiv.appendChild(urlP);

  // Tab actions container
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "tab-actions";

  // Last accessed time
  const timeDiv = document.createElement("div");
  timeDiv.className = "tab-time";
  const lastAccessedDate = new Date(tab.lastAccessed);
  timeDiv.title = `Last accessed: ${lastAccessedDate.toLocaleString()}`;
  timeDiv.textContent = formatTimeAgo(tab.lastAccessed);

  // Pin button
  const pinBtn = document.createElement("button");
  pinBtn.className = `pin-tab-btn ${tab.pinned ? "pinned" : ""}`;
  pinBtn.dataset.tabId = tab.id.toString();
  pinBtn.title = tab.pinned ? "Unpin tab" : "Pin tab";
  pinBtn.textContent = "PIN";
  pinBtn.setAttribute("aria-pressed", tab.pinned.toString());

  // Go to tab button
  const goBtn = document.createElement("button");
  goBtn.className = "go-to-tab-btn";
  goBtn.dataset.tabId = tab.id.toString();
  goBtn.dataset.windowId = tab.windowId.toString();
  goBtn.title = "Switch to this tab";
  goBtn.textContent = "GO";

  // Assemble the tab item
  actionsDiv.appendChild(timeDiv);
  actionsDiv.appendChild(pinBtn);
  actionsDiv.appendChild(goBtn);

  tabEl.appendChild(checkbox);
  tabEl.appendChild(favicon);
  tabEl.appendChild(infoDiv);
  tabEl.appendChild(actionsDiv);

  return tabEl;
};

/**
 * Creates a group header for grouped tab display
 * @param domain - The domain name for this group
 * @param tabs - Array of tabs in this group
 * @param selectedTabs - Set of currently selected tab IDs
 * @param isCollapsed - Whether this group is currently collapsed
 * @returns HTMLDivElement representing the group header
 */
const createGroupHeader = (
  domain: string,
  tabs: Tab[],
  selectedTabs: Set<number>,
  isCollapsed: boolean,
): HTMLDivElement => {
  const groupTabIds = tabs.map((tab) => tab.id);
  const selectedCount = groupTabIds.filter((id) => selectedTabs.has(id)).length;
  const totalCount = tabs.length;

  const groupHeader = document.createElement("div");
  groupHeader.className = "tab-group-header";
  groupHeader.dataset.domain = domain;
  groupHeader.setAttribute("role", "button");
  groupHeader.setAttribute("aria-expanded", (!isCollapsed).toString());
  groupHeader.setAttribute("tabindex", "0");

  // Group selection checkbox
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "checkbox group-checkbox";
  checkbox.dataset.domain = domain;
  checkbox.checked = selectedCount === totalCount && totalCount > 0;
  checkbox.indeterminate = selectedCount > 0 && selectedCount < totalCount;
  checkbox.setAttribute("aria-label", `Select all tabs in ${domain}`);

  // Collapse/expand indicator
  const expandIcon = document.createElement("span");
  expandIcon.className = `expand-icon ${isCollapsed ? "collapsed" : "expanded"}`;
  expandIcon.textContent = isCollapsed ? "▶" : "▼";
  expandIcon.setAttribute("aria-hidden", "true");

  // Domain name
  const domainSpan = document.createElement("span");
  domainSpan.className = "group-domain-name";
  domainSpan.textContent = domain;

  // Tab count and selection info
  const countSpan = document.createElement("span");
  countSpan.className = "group-tab-count";
  if (selectedCount > 0) {
    countSpan.textContent = `${selectedCount}/${totalCount} TABS`;
  } else {
    countSpan.textContent = `${totalCount} TABS`;
  }

  groupHeader.appendChild(checkbox);
  groupHeader.appendChild(expandIcon);
  groupHeader.appendChild(domainSpan);
  groupHeader.appendChild(countSpan);

  // Add keyboard support for expand/collapse
  groupHeader.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      groupHeader.click();
    }
  });

  return groupHeader;
};

/**
 * Creates a group content container
 * @param domain - The domain name for this group
 * @param tabs - Array of tabs in this group
 * @param selectedTabs - Set of currently selected tab IDs
 * @param isCollapsed - Whether this group should start collapsed
 * @returns HTMLDivElement representing the group content
 */
const createGroupContent = (
  domain: string,
  tabs: Tab[],
  selectedTabs: Set<number>,
  isCollapsed: boolean,
): HTMLDivElement => {
  const groupContent = document.createElement("div");
  groupContent.className = `tab-group-content ${isCollapsed ? "collapsed" : ""}`;
  groupContent.dataset.domainContent = domain;

  // Add tabs to group content
  tabs.forEach((tab) => {
    groupContent.appendChild(createTabItem(tab, selectedTabs));
  });

  return groupContent;
};

/**
 * Renders a flat list of tabs
 * @param container - Container element to render tabs into
 * @param tabsToRender - Array of tabs to render
 * @param selectedTabs - Set of currently selected tab IDs
 */
export const renderTabList = (
  container: HTMLElement,
  tabsToRender: Tab[],
  selectedTabs: Set<number>,
): void => {
  try {
    // Clear previous content
    container.innerHTML = "";

    if (!Array.isArray(tabsToRender)) {
      throw new Error("Invalid tabs array provided");
    }

    if (tabsToRender.length === 0) {
      const messageDiv = document.createElement("div");
      messageDiv.id = "message-area";
      messageDiv.className = "empty-state";
      messageDiv.textContent = "No tabs match your filters.";
      messageDiv.setAttribute("role", "status");
      container.appendChild(messageDiv);
      return;
    }

    // Create tab items
    const fragment = document.createDocumentFragment();
    tabsToRender.forEach((tab) => {
      if (tab && typeof tab.id === "number") {
        fragment.appendChild(createTabItem(tab, selectedTabs));
      }
    });

    container.appendChild(fragment);

    // Set ARIA attributes
    container.setAttribute("role", "list");
    container.setAttribute("aria-label", `${tabsToRender.length} tabs`);
  } catch (error) {
    console.error("Error rendering tab list:", error);
    container.innerHTML = '<div class="error-message">Error loading tabs</div>';
  }
};

/**
 * Groups tabs by domain
 * @param tabs - Array of tabs to group
 * @returns Object with domain keys and tab arrays as values
 */
const groupTabsByDomain = (tabs: Tab[]): GroupedTabs => {
  return tabs.reduce<GroupedTabs>((groups, tab) => {
    if (!tab?.url) return groups;

    const domain = getDomain(tab.url);
    if (!groups[domain]) {
      groups[domain] = [];
    }
    groups[domain].push(tab);
    return groups;
  }, {});
};

/**
 * Renders tabs grouped by domain with collapsible sections
 * @param container - Container element to render tabs into
 * @param tabsToRender - Array of tabs to render
 * @param selectedTabs - Set of currently selected tab IDs
 * @param collapsedGroups - Set of domain names that should be collapsed
 */
export const renderGroupedTabList = (
  container: HTMLElement,
  tabsToRender: Tab[],
  selectedTabs: Set<number>,
  collapsedGroups: Set<string>,
): void => {
  try {
    // Clear previous content
    container.innerHTML = "";

    if (!Array.isArray(tabsToRender)) {
      throw new Error("Invalid tabs array provided");
    }

    if (tabsToRender.length === 0) {
      const messageDiv = document.createElement("div");
      messageDiv.id = "message-area";
      messageDiv.className = "empty-state";
      messageDiv.textContent = "No tabs match your filters.";
      messageDiv.setAttribute("role", "status");
      container.appendChild(messageDiv);
      return;
    }

    // Group tabs by domain
    const groupedTabs = groupTabsByDomain(tabsToRender);

    // Sort groups by tab count (descending)
    const sortedGroups = Object.entries(groupedTabs).sort(
      ([, tabsA], [, tabsB]) => tabsB.length - tabsA.length,
    );

    if (sortedGroups.length === 0) {
      const messageDiv = document.createElement("div");
      messageDiv.id = "message-area";
      messageDiv.className = "empty-state";
      messageDiv.textContent = "No valid tabs to display.";
      container.appendChild(messageDiv);
      return;
    }

    // Create groups
    const fragment = document.createDocumentFragment();

    sortedGroups.forEach(([domain, tabs]) => {
      if (!domain || !Array.isArray(tabs) || tabs.length === 0) {
        return;
      }

      const isCollapsed = collapsedGroups.has(domain);

      // Create group container
      const groupContainer = document.createElement("div");
      groupContainer.className = "tab-group";
      groupContainer.dataset.domain = domain;

      // Create group header
      const groupHeader = createGroupHeader(
        domain,
        tabs,
        selectedTabs,
        isCollapsed,
      );

      // Create group content
      const groupContent = createGroupContent(
        domain,
        tabs,
        selectedTabs,
        isCollapsed,
      );

      groupContainer.appendChild(groupHeader);
      groupContainer.appendChild(groupContent);
      fragment.appendChild(groupContainer);
    });

    container.appendChild(fragment);

    // Set ARIA attributes
    container.setAttribute("role", "tree");
    container.setAttribute("aria-label", `${sortedGroups.length} tab groups`);

    // Update group checkbox states
    updateGroupCheckboxStates(container, groupedTabs, selectedTabs);
  } catch (error) {
    console.error("Error rendering grouped tab list:", error);
    container.innerHTML =
      '<div class="error-message">Error loading tab groups</div>';
  }
};

/**
 * Updates the indeterminate state of group checkboxes
 * @param container - Container element containing the groups
 * @param groupedTabs - Object with grouped tabs
 * @param selectedTabs - Set of currently selected tab IDs
 */
const updateGroupCheckboxStates = (
  container: HTMLElement,
  groupedTabs: GroupedTabs,
  selectedTabs: Set<number>,
): void => {
  try {
    const groupCheckboxes =
      container.querySelectorAll<HTMLInputElement>(".group-checkbox");

    groupCheckboxes.forEach((checkbox) => {
      const domain = checkbox.dataset.domain;
      if (!domain || !groupedTabs[domain]) return;

      const tabsInGroup = groupedTabs[domain];
      const selectedCount = tabsInGroup.filter((tab) =>
        selectedTabs.has(tab.id),
      ).length;
      const totalCount = tabsInGroup.length;

      checkbox.checked = selectedCount === totalCount && totalCount > 0;
      checkbox.indeterminate = selectedCount > 0 && selectedCount < totalCount;
    });
  } catch (error) {
    console.error("Error updating group checkbox states:", error);
  }
};

/**
 * Utility function to get tab element by ID
 * @param container - Container to search in
 * @param tabId - Tab ID to find
 * @returns HTMLElement if found, null otherwise
 */
export const getTabElementById = (
  container: HTMLElement,
  tabId: number,
): HTMLElement | null => {
  try {
    return container.querySelector(`[data-tab-id="${tabId}"]`);
  } catch (error) {
    console.error("Error finding tab element:", error);
    return null;
  }
};

/**
 * Updates the visual state of a tab item (e.g., pin status)
 * @param container - Container containing the tab
 * @param tabId - ID of the tab to update
 * @param updates - Object with properties to update
 */
export const updateTabItemState = (
  container: HTMLElement,
  tabId: number,
  updates: { pinned?: boolean; selected?: boolean },
): void => {
  try {
    const tabElement = getTabElementById(container, tabId);
    if (!tabElement) return;

    if (updates.pinned !== undefined) {
      const pinBtn =
        tabElement.querySelector<HTMLButtonElement>(".pin-tab-btn");
      if (pinBtn) {
        pinBtn.className = `pin-tab-btn ${updates.pinned ? "pinned" : ""}`;
        pinBtn.title = updates.pinned ? "Unpin tab" : "Pin tab";
        pinBtn.setAttribute("aria-pressed", updates.pinned.toString());
      }
    }

    if (updates.selected !== undefined) {
      const checkbox =
        tabElement.querySelector<HTMLInputElement>(".tab-checkbox");
      if (checkbox) {
        checkbox.checked = updates.selected;
      }
    }
  } catch (error) {
    console.error("Error updating tab item state:", error);
  }
};
