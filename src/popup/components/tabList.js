// --- Tab List UI Component ---

import { formatUrl, formatTimeAgo, getDomain } from "../utils/index.js";

function createTabItem(tab, selectedTabs) {
  const tabEl = document.createElement("div");
  tabEl.className = "tab-item";
  tabEl.dataset.tabId = tab.id;

  // Checkbox
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "checkbox tab-checkbox";
  checkbox.dataset.tabId = tab.id;
  checkbox.checked = selectedTabs.has(tab.id);
  tabEl.appendChild(checkbox);

  // Favicon
  const faviconUrl = tab.favIconUrl || "/images/icon16.png";
  const favicon = document.createElement("img");
  favicon.src = faviconUrl;
  favicon.alt = "";
  favicon.className = "favicon";
  favicon.addEventListener("error", () => {
    favicon.onerror = null; // Prevent infinite loop if fallback fails
    favicon.src = "/images/icon16.png";
  });
  tabEl.appendChild(favicon);

  // Tab Info
  const infoDiv = document.createElement("div");
  infoDiv.className = "tab-info";

  const titleP = document.createElement("p");
  titleP.className = "tab-title";
  titleP.title = tab.title || tab.url;
  titleP.textContent = tab.title || tab.url;

  const urlP = document.createElement("p");
  urlP.className = "tab-url";
  urlP.title = tab.url;
  urlP.textContent = formatUrl(tab.url);

  infoDiv.appendChild(titleP);
  infoDiv.appendChild(urlP);
  tabEl.appendChild(infoDiv);

  // Tab Actions
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "tab-actions";

  const timeDiv = document.createElement("div");
  timeDiv.className = "tab-time";
  timeDiv.title = `Last accessed on ${new Date(
    tab.lastAccessed,
  ).toLocaleString()}`;
  timeDiv.textContent = formatTimeAgo(tab.lastAccessed);

  const pinBtn = document.createElement("button");
  pinBtn.className = `pin-tab-btn ${tab.pinned ? "pinned" : ""}`;
  pinBtn.dataset.tabId = tab.id;
  pinBtn.title = tab.pinned ? "Unpin tab" : "Pin tab";
  pinBtn.textContent = "PIN";

  const goBtn = document.createElement("button");
  goBtn.className = "go-to-tab-btn";
  goBtn.dataset.tabId = tab.id;
  goBtn.dataset.windowId = tab.windowId;
  goBtn.title = "Go to tab";
  goBtn.textContent = "GO";

  actionsDiv.appendChild(timeDiv);
  actionsDiv.appendChild(pinBtn);
  actionsDiv.appendChild(goBtn);
  tabEl.appendChild(actionsDiv);

  return tabEl;
}

export function renderTabList(tabListDiv, tabsToRender, selectedTabs) {
  tabListDiv.innerHTML = ""; // Clear previous content safely

  if (tabsToRender.length > 0) {
    tabsToRender.forEach((tab) =>
      tabListDiv.appendChild(createTabItem(tab, selectedTabs)),
    );
  } else {
    const messageDiv = document.createElement("div");
    messageDiv.id = "message-area";
    messageDiv.textContent = "No tabs match your filters.";
    tabListDiv.appendChild(messageDiv);
  }
}

export function renderGroupedTabList(
  tabListDiv,
  tabsToRender,
  selectedTabs,
  collapsedGroups,
) {
  const groupedTabs = tabsToRender.reduce((acc, tab) => {
    const domain = getDomain(tab.url);
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(tab);
    return acc;
  }, {});

  const sortedGroups = Object.entries(groupedTabs).sort(
    (a, b) => b[1].length - a[1].length,
  );

  tabListDiv.innerHTML = ""; // Clear previous content safely

  if (sortedGroups.length === 0) {
    const messageDiv = document.createElement("div");
    messageDiv.id = "message-area";
    messageDiv.textContent = "No tabs match your filters.";
    tabListDiv.appendChild(messageDiv);
    return;
  }

  for (const [domain, tabs] of sortedGroups) {
    const isCollapsed = collapsedGroups.has(domain);
    const groupTabIds = tabs.map((t) => t.id);
    const selectedCount = groupTabIds.filter((id) =>
      selectedTabs.has(id),
    ).length;

    const groupContainer = document.createElement("div");
    const groupHeader = document.createElement("div");
    groupHeader.className = "tab-group-header";
    groupHeader.dataset.domain = domain;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "checkbox group-checkbox";
    checkbox.dataset.domain = domain;
    checkbox.checked = selectedCount === tabs.length && tabs.length > 0;
    groupHeader.appendChild(checkbox);

    const domainSpan = document.createElement("span");
    domainSpan.className = "group-domain-name";
    domainSpan.textContent = domain;
    groupHeader.appendChild(domainSpan);

    const countSpan = document.createElement("span");
    countSpan.className = "group-tab-count";
    countSpan.textContent = `${tabs.length} TABS`;
    groupHeader.appendChild(countSpan);

    const groupContent = document.createElement("div");
    groupContent.className = `tab-group-content ${
      isCollapsed ? "collapsed" : ""
    }`;
    groupContent.dataset.domainContent = domain;
    tabs.forEach((tab) =>
      groupContent.appendChild(createTabItem(tab, selectedTabs)),
    );

    groupContainer.appendChild(groupHeader);
    groupContainer.appendChild(groupContent);
    tabListDiv.appendChild(groupContainer);
  }

  document.querySelectorAll(".group-checkbox").forEach((checkbox) => {
    const domain = checkbox.dataset.domain;
    const tabsInGroup = groupedTabs[domain] || [];
    const selectedCount = tabsInGroup.filter((t) =>
      selectedTabs.has(t.id),
    ).length;

    checkbox.indeterminate =
      selectedCount > 0 && selectedCount < tabsInGroup.length;
  });
}
