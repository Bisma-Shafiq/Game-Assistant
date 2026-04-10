const SESSION_KEY = "gddai_sessions";
const CURRENT_KEY = "gddai_current";

// ── helpers ───────────────────────────────────────────────────────────────────

function loadSessions() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "[]"); }
    catch { return []; }
}

function saveSessions(sessions) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
}

// ── public API ────────────────────────────────────────────────────────────────

/** Save or overwrite a session by id. Auto-generates id + timestamp if new. */
export function saveSession(data, existingId = null) {
    const sessions = loadSessions();
    const id = existingId || `session_${Date.now()}`;
    const entry = {
        id,
        title: data.report?.game_title || "Untitled",
        genre: data.report?.genre || "",
        savedAt: new Date().toISOString(),
        data,
    };
    const idx = sessions.findIndex(s => s.id === id);
    if (idx !== -1) sessions[idx] = entry;
    else sessions.unshift(entry); // newest first
    saveSessions(sessions);
    localStorage.setItem(CURRENT_KEY, id);
    return id;
}

/** Load all saved sessions (metadata only — data included). */
export function getSessions() {
    return loadSessions();
}

/** Load a single session by id. */
export function getSession(id) {
    return loadSessions().find(s => s.id === id) || null;
}

/** Delete a session by id. */
export function deleteSession(id) {
    const sessions = loadSessions().filter(s => s.id !== id);
    saveSessions(sessions);
    if (localStorage.getItem(CURRENT_KEY) === id) localStorage.removeItem(CURRENT_KEY);
}

/** Get the id of the last active session. */
export function getCurrentSessionId() {
    return localStorage.getItem(CURRENT_KEY);
}

/** Clear the current session pointer (used on "New idea"). */
export function clearCurrentSession() {
    localStorage.removeItem(CURRENT_KEY);
}

/** Check if there is an auto-save to restore on app load. */
export function getAutoSave() {
    const id = getCurrentSessionId();
    if (!id) return null;
    return getSession(id);
}