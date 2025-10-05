// --- Session List UI Component ---

function createSessionItem(session, index) {
  const sessionEl = document.createElement("div");
  sessionEl.className = "session-item";
  sessionEl.dataset.sessionIndex = index;

  sessionEl.innerHTML = `
        <div class="session-info">
            <p class="session-name" title="${session.name}">${session.name}</p>
            <p class="session-meta">${session.tabs.length} TABS / ${new Date(session.date).toLocaleDateString()}</p>
        </div>
        <div class="session-actions">
            <button class="session-btn restore-session-btn" title="Restore Session">RESTORE</button>
            <button class="session-btn delete-session-btn" title="Delete Session">DELETE</button>
        </div>
    `;
  return sessionEl;
}

export function renderSessionList(sessionListDiv, savedSessions) {
  sessionListDiv.innerHTML = "";
  if (savedSessions.length === 0) {
    sessionListDiv.innerHTML =
      '<p class="no-sessions-message">NO SAVED SESSIONS.</p>';
    return;
  }
  savedSessions.forEach((session, index) => {
    sessionListDiv.appendChild(createSessionItem(session, index));
  });
}
