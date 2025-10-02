// --- Tab List UI Component ---

import { formatUrl, formatTimeAgo, getDomain } from "../utils/index.js";

function createTabItem(tab, selectedTabs) {
  const tabEl = document.createElement("div");
  tabEl.className = "tab-item";
  tabEl.dataset.tabId = tab.id;

  const faviconUrl = tab.favIconUrl || "/src/assets/images/icon16.png";

  const favicon = document.createElement("img");
  favicon.src = faviconUrl;
  favicon.alt = "";
  favicon.className = "favicon";
  favicon.addEventListener("error", () => {
    favicon.onerror = null; // Prevent infinite loop if fallback fails
    favicon.src = "/src/assets/images/icon16.png";
  });

  tabEl.innerHTML = `
        <input type="checkbox" class="checkbox tab-checkbox" data-tab-id="${tab.id}" ${selectedTabs.has(tab.id) ? "checked" : ""}>
    `;

  tabEl.appendChild(favicon);

  tabEl.innerHTML += `
        <div class="tab-info">
            <p class="tab-title" title="${tab.title}">${tab.title || tab.url}</p>
            <p class="tab-url" title="${tab.url}">${formatUrl(tab.url)}</p>
        </div>
        <div class="tab-actions">
            <div class="tab-time" title="Last accessed on ${new Date(tab.lastAccessed).toLocaleString()}">
                ${formatTimeAgo(tab.lastAccessed)}
            </div>
            <button class="pin-tab-btn ${tab.pinned ? "pinned" : ""}" data-tab-id="${tab.id}" title="${tab.pinned ? "Unpin tab" : "Pin tab"}">PIN</button>
            <button class="go-to-tab-btn" data-tab-id="${tab.id}" data-window-id="${tab.windowId}" title="Go to tab">GO</button>
        </div>
    `;
  return tabEl;
}

export function renderTabList(tabListDiv, tabsToRender, selectedTabs) {
  tabListDiv.innerHTML = "";

  if (tabsToRender.length > 0) {
    tabsToRender.forEach((tab) =>
      tabListDiv.appendChild(createTabItem(tab, selectedTabs)),
    );
  } else {
    tabListDiv.innerHTML =
      '<div id="message-area">No tabs match your filters.</div>';
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

  if (sortedGroups.length === 0) {
    tabListDiv.innerHTML =
      '<div id="message-area">No tabs match your filters.</div>';
    return;
  }

  tabListDiv.innerHTML = "";

  for (const [domain, tabs] of sortedGroups) {
    const isCollapsed = collapsedGroups.has(domain);
    const groupTabIds = tabs.map((t) => t.id);
    const selectedCount = groupTabIds.filter((id) =>
      selectedTabs.has(id),
    ).length;

    let checkboxState =
      selectedCount === tabs.length && tabs.length > 0 ? "checked" : "";

    const groupContainer = document.createElement("div");
    const groupHeader = document.createElement("div");
    groupHeader.className = "tab-group-header";
    groupHeader.dataset.domain = domain;
    groupHeader.innerHTML = `
            <input type="checkbox" class="checkbox group-checkbox" data-domain="${domain}" ${checkboxState}>
            <span class="group-domain-name">${domain}</span>
            <span class="group-tab-count">${tabs.length} TABS</span>
        `;

    const groupContent = document.createElement("div");
    groupContent.className = `tab-group-content ${isCollapsed ? "collapsed" : ""}`;
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
