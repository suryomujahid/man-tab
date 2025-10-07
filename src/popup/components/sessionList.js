// --- Session List UI Component ---

function createSessionItem(session, index) {
  const sessionEl = document.createElement("div");
  sessionEl.className = "session-item";
  sessionEl.dataset.sessionIndex = index;

  const infoDiv = document.createElement("div");
  infoDiv.className = "session-info";

  const nameP = document.createElement("p");
  nameP.className = "session-name";
  nameP.title = session.name;
  nameP.textContent = session.name;

  const metaP = document.createElement("p");
  metaP.className = "session-meta";
  metaP.textContent = `${session.tabs.length} TABS / ${new Date(
    session.date,
  ).toLocaleDateString()}`;

  infoDiv.appendChild(nameP);
  infoDiv.appendChild(metaP);

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "session-actions";

  const restoreBtn = document.createElement("button");
  restoreBtn.className = "session-btn restore-session-btn";
  restoreBtn.title = "Restore Session";
  restoreBtn.textContent = "RESTORE";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "session-btn delete-session-btn";
  deleteBtn.title = "Delete Session";
  deleteBtn.textContent = "DELETE";

  actionsDiv.appendChild(restoreBtn);
  actionsDiv.appendChild(deleteBtn);

  sessionEl.appendChild(infoDiv);
  sessionEl.appendChild(actionsDiv);

  return sessionEl;
}

export function renderSessionList(sessionListDiv, savedSessions) {
  sessionListDiv.innerHTML = ""; // Clear previous content safely
  if (savedSessions.length === 0) {
    const messageP = document.createElement("p");
    messageP.className = "no-sessions-message";
    messageP.textContent = "NO SAVED SESSIONS.";
    sessionListDiv.appendChild(messageP);
    return;
  }
  savedSessions.forEach((session, index) => {
    sessionListDiv.appendChild(createSessionItem(session, index));
  });
}
