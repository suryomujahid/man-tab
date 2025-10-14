/**
 * Session List UI Component - TypeScript implementation
 * Handles rendering and management of saved tab sessions
 */

import type { Session } from "../../types/index.js";
import { truncateText, validateSessionName } from "../utils/index.js";

/**
 * Creates a session item element with proper event handling
 * @param session - The session object to render
 * @param index - Index of the session in the list
 * @returns HTMLDivElement representing the session item
 */
const createSessionItem = (session: Session, index: number): HTMLDivElement => {
  const sessionEl = document.createElement("div");
  sessionEl.className = "session-item";
  sessionEl.dataset.sessionIndex = index.toString();
  sessionEl.setAttribute("role", "listitem");

  // Session info container
  const infoDiv = document.createElement("div");
  infoDiv.className = "session-info";

  // Session name
  const nameP = document.createElement("p");
  nameP.className = "session-name";
  const displayName = session.name || "Untitled Session";
  nameP.title = displayName;
  nameP.textContent = truncateText(displayName, 50);

  // Session metadata
  const metaP = document.createElement("p");
  metaP.className = "session-meta";

  const tabCount = session.tabs?.length || 0;
  const sessionDate = new Date(session.date);
  const isValidDate = !isNaN(sessionDate.getTime());

  let metaText = `${tabCount} TAB${tabCount !== 1 ? "S" : ""}`;
  if (isValidDate) {
    metaText += ` • ${sessionDate.toLocaleDateString()}`;
  }

  metaP.textContent = metaText;
  metaP.title = isValidDate
    ? `Created: ${sessionDate.toLocaleString()}`
    : "Creation date unknown";

  // Session preview (first few tab titles)
  if (session.tabs && session.tabs.length > 0) {
    const previewP = document.createElement("p");
    previewP.className = "session-preview";

    const previewTabs = session.tabs
      .slice(0, 3)
      .map((tab) => tab.title || tab.url || "Untitled")
      .join(", ");

    const hasMore = session.tabs.length > 3;
    const previewText = hasMore
      ? `${previewTabs}${session.tabs.length > 3 ? `, +${session.tabs.length - 3} more` : ""}`
      : previewTabs;

    previewP.textContent = truncateText(previewText, 80);
    previewP.title = session.tabs.map((tab) => tab.title || tab.url).join("\n");

    infoDiv.appendChild(nameP);
    infoDiv.appendChild(metaP);
    infoDiv.appendChild(previewP);
  } else {
    infoDiv.appendChild(nameP);
    infoDiv.appendChild(metaP);
  }

  // Session actions container
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "session-actions";

  // Restore button
  const restoreBtn = document.createElement("button");
  restoreBtn.className = "session-btn restore-session-btn";
  restoreBtn.title = `Restore session: ${displayName}`;
  restoreBtn.textContent = "RESTORE";
  restoreBtn.setAttribute("aria-label", `Restore session ${displayName}`);
  restoreBtn.disabled = !session.tabs || session.tabs.length === 0;

  // Edit button
  const editBtn = document.createElement("button");
  editBtn.className = "session-btn edit-session-btn";
  editBtn.title = "Edit session name";
  editBtn.textContent = "EDIT";
  editBtn.setAttribute("aria-label", `Edit session ${displayName}`);

  // Export button
  const exportBtn = document.createElement("button");
  exportBtn.className = "session-btn export-session-btn";
  exportBtn.title = "Export session to JSON";
  exportBtn.textContent = "EXPORT";
  exportBtn.setAttribute("aria-label", `Export session ${displayName}`);

  // Delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "session-btn delete-session-btn danger";
  deleteBtn.title = `Delete session: ${displayName}`;
  deleteBtn.textContent = "DELETE";
  deleteBtn.setAttribute("aria-label", `Delete session ${displayName}`);

  actionsDiv.appendChild(restoreBtn);
  actionsDiv.appendChild(editBtn);
  actionsDiv.appendChild(exportBtn);
  actionsDiv.appendChild(deleteBtn);

  sessionEl.appendChild(infoDiv);
  sessionEl.appendChild(actionsDiv);

  return sessionEl;
};

/**
 * Creates an editable session item for name editing
 * @param session - The session being edited
 * @param index - Index of the session in the list
 * @param onSave - Callback when save is clicked
 * @param onCancel - Callback when cancel is clicked
 * @returns HTMLDivElement representing the editable session item
 */
const createEditableSessionItem = (
  session: Session,
  index: number,
  onSave: (newName: string) => void,
  onCancel: () => void,
): HTMLDivElement => {
  const sessionEl = document.createElement("div");
  sessionEl.className = "session-item editing";
  sessionEl.dataset.sessionIndex = index.toString();

  // Edit form container
  const editDiv = document.createElement("div");
  editDiv.className = "session-edit-form";

  // Name input
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "session-name-input";
  nameInput.value = session.name;
  nameInput.maxLength = 100;
  nameInput.placeholder = "Enter session name";
  nameInput.setAttribute("aria-label", "Session name");

  // Validation message
  const validationMsg = document.createElement("div");
  validationMsg.className = "validation-message";
  validationMsg.setAttribute("role", "alert");
  validationMsg.style.display = "none";

  // Character counter
  const charCounter = document.createElement("div");
  charCounter.className = "char-counter";
  charCounter.textContent = `${nameInput.value.length}/100`;

  // Update character counter and validation
  const updateValidation = (): boolean => {
    const validation = validateSessionName(nameInput.value);
    charCounter.textContent = `${nameInput.value.length}/100`;

    if (!validation.isValid) {
      validationMsg.textContent = validation.error || "Invalid name";
      validationMsg.style.display = "block";
      nameInput.classList.add("error");
      return false;
    } else {
      validationMsg.style.display = "none";
      nameInput.classList.remove("error");
      return true;
    }
  };

  nameInput.addEventListener("input", updateValidation);
  nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && updateValidation()) {
      event.preventDefault();
      onSave(nameInput.value.trim());
    } else if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  });

  // Action buttons
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "session-edit-actions";

  const saveBtn = document.createElement("button");
  saveBtn.className = "session-btn save-btn";
  saveBtn.textContent = "SAVE";
  saveBtn.addEventListener("click", () => {
    if (updateValidation()) {
      onSave(nameInput.value.trim());
    }
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "session-btn cancel-btn";
  cancelBtn.textContent = "CANCEL";
  cancelBtn.addEventListener("click", onCancel);

  actionsDiv.appendChild(saveBtn);
  actionsDiv.appendChild(cancelBtn);

  editDiv.appendChild(nameInput);
  editDiv.appendChild(validationMsg);
  editDiv.appendChild(charCounter);
  editDiv.appendChild(actionsDiv);

  sessionEl.appendChild(editDiv);

  // Focus the input
  setTimeout(() => {
    nameInput.focus();
    nameInput.select();
  }, 0);

  return sessionEl;
};

/**
 * Creates a session statistics summary element
 * @param sessions - Array of all sessions
 * @returns HTMLDivElement containing session statistics
 */
const createSessionStats = (sessions: Session[]): HTMLDivElement => {
  const statsDiv = document.createElement("div");
  statsDiv.className = "session-stats";

  if (sessions.length === 0) {
    return statsDiv;
  }

  const totalTabs = sessions.reduce(
    (sum, session) => sum + (session.tabs?.length || 0),
    0,
  );

  const avgTabsPerSession = Math.round(totalTabs / sessions.length);

  // Find oldest and newest sessions
  const dates = sessions
    .map((s) => s.date)
    .filter((date) => !isNaN(date))
    .sort((a, b) => a - b);

  let dateRange = "";
  if (dates.length > 0) {
    const oldest = new Date(dates[0]!);
    const newest = new Date(dates[dates.length - 1]!);

    if (dates.length === 1) {
      dateRange = oldest.toLocaleDateString();
    } else {
      dateRange = `${oldest.toLocaleDateString()} - ${newest.toLocaleDateString()}`;
    }
  }

  const statsText = [
    `${sessions.length} session${sessions.length !== 1 ? "s" : ""}`,
    `${totalTabs} total tabs`,
    `${avgTabsPerSession} avg per session`,
    dateRange && `Created: ${dateRange}`,
  ]
    .filter(Boolean)
    .join(" • ");

  statsDiv.textContent = statsText;
  statsDiv.title = "Session collection statistics";

  return statsDiv;
};

/**
 * Main session list rendering function
 * @param container - Container element to render sessions into
 * @param savedSessions - Array of saved sessions
 * @param options - Rendering options
 */
export const renderSessionList = (
  container: HTMLElement,
  savedSessions: Session[],
  options: {
    showStats?: boolean;
    onEdit?: (sessionIndex: number, newName: string) => void;
    onExport?: (sessionIndex: number) => void;
  } = {},
): void => {
  try {
    // Clear previous content
    container.innerHTML = "";

    if (!Array.isArray(savedSessions)) {
      throw new Error("Invalid sessions array provided");
    }

    // Add statistics if requested and sessions exist
    if (options.showStats && savedSessions.length > 0) {
      container.appendChild(createSessionStats(savedSessions));
    }

    if (savedSessions.length === 0) {
      const messageP = document.createElement("p");
      messageP.className = "no-sessions-message";
      messageP.textContent = "NO SAVED SESSIONS.";
      messageP.setAttribute("role", "status");
      container.appendChild(messageP);
      return;
    }

    // Create session list
    const sessionList = document.createElement("div");
    sessionList.className = "session-list-content";
    sessionList.setAttribute("role", "list");
    sessionList.setAttribute(
      "aria-label",
      `${savedSessions.length} saved sessions`,
    );

    const fragment = document.createDocumentFragment();

    savedSessions.forEach((session, index) => {
      if (session && typeof session === "object") {
        fragment.appendChild(createSessionItem(session, index));
      }
    });

    sessionList.appendChild(fragment);
    container.appendChild(sessionList);
  } catch (error) {
    console.error("Error rendering session list:", error);
    container.innerHTML =
      '<div class="error-message">Error loading sessions</div>';
  }
};

/**
 * Enables editing mode for a specific session
 * @param container - Container containing the sessions
 * @param sessionIndex - Index of the session to edit
 * @param session - The session object being edited
 * @param onSave - Callback when save is successful
 * @param onCancel - Callback when edit is cancelled
 */
export const enableSessionEdit = (
  container: HTMLElement,
  sessionIndex: number,
  session: Session,
  onSave: (newName: string) => void,
  onCancel: () => void,
): void => {
  try {
    const sessionElement = container.querySelector(
      `[data-session-index="${sessionIndex}"]`,
    ) as HTMLElement;

    if (!sessionElement) {
      console.warn(`Session element not found for index ${sessionIndex}`);
      return;
    }

    // Replace with editable version
    const editableItem = createEditableSessionItem(
      session,
      sessionIndex,
      onSave,
      onCancel,
    );

    sessionElement.replaceWith(editableItem);
  } catch (error) {
    console.error("Error enabling session edit:", error);
    onCancel();
  }
};

/**
 * Exports a single session to JSON file
 * @param session - Session to export
 * @param filename - Optional custom filename
 */
export const exportSingleSession = (
  session: Session,
  filename?: string,
): void => {
  try {
    if (!session) {
      throw new Error("No session provided for export");
    }

    const sessionData = {
      name: session.name,
      tabs: session.tabs,
      date: session.date,
      exportedAt: Date.now(),
      version: "1.0",
    };

    const dataStr = JSON.stringify(sessionData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download =
      filename ||
      `man-tab-session-${session.name.replace(/[<>:"/\\|?*]/g, "_")}.json`;
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting session:", error);
    throw new Error(
      `Failed to export session: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Gets session element by index
 * @param container - Container to search in
 * @param sessionIndex - Session index to find
 * @returns HTMLElement if found, null otherwise
 */
export const getSessionElementByIndex = (
  container: HTMLElement,
  sessionIndex: number,
): HTMLElement | null => {
  try {
    return container.querySelector(`[data-session-index="${sessionIndex}"]`);
  } catch (error) {
    console.error("Error finding session element:", error);
    return null;
  }
};

/**
 * Updates session item display after modification
 * @param container - Container containing the session
 * @param sessionIndex - Index of the session to update
 * @param updatedSession - Updated session data
 */
export const updateSessionItem = (
  container: HTMLElement,
  sessionIndex: number,
  updatedSession: Session,
): void => {
  try {
    const sessionElement = getSessionElementByIndex(container, sessionIndex);
    if (!sessionElement) return;

    const newSessionItem = createSessionItem(updatedSession, sessionIndex);
    sessionElement.replaceWith(newSessionItem);
  } catch (error) {
    console.error("Error updating session item:", error);
  }
};
