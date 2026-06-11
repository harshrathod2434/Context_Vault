const { ipcMain } = require("electron");
const { captureContext } = require("./captureContext");
const groq = require("./groqService");
const db = require("./db");
const autoCapture = require("./autoCaptureManager");

function registerIpcHandlers({ showSensitivityDialog, showMainWindow, showFloatingWindow, hideFloatingWindow }) {
  ipcMain.handle("set-api-key", (_event, key) => {
    groq.setApiKey(key);
    return true;
  });
  ipcMain.handle("test-api-key", (_event, key) => groq.testApiKey(key));
  ipcMain.handle("has-api-key", () => groq.hasApiKey());
  ipcMain.handle("capture-context", () => captureContext());
  ipcMain.handle("classify-memory", (_event, rawContext) => groq.classifyMemory(rawContext));
  ipcMain.handle("summarize-context", (_event, rawContext) => groq.summarizeContext(rawContext));
  ipcMain.handle("generate-context-pack", (_event, memories) => groq.generateContextPack(memories));
  ipcMain.handle("save-memory", async (_event, memory) => {
    if (memory?.sensitivity === "high" && showSensitivityDialog) {
      const confirmed = await showSensitivityDialog();
      if (!confirmed) return { discarded: true };
    }
    return db.saveMemory(memory);
  });
  ipcMain.handle("get-all-memories", () => db.getAllMemories());
  ipcMain.handle("search-memories", (_event, query) => db.searchMemories(query));
  ipcMain.handle("filter-memories", (_event, filters) => db.filterMemories(filters));
  ipcMain.handle("get-memory", (_event, id) => db.getMemoryById(id));
  ipcMain.handle("update-memory", (_event, id, changes) => db.updateMemory(id, changes));
  ipcMain.handle("delete-memory", (_event, id) => db.deleteMemory(id));
  ipcMain.handle("toggle-important", (_event, id) => db.toggleImportant(id));
  ipcMain.handle("open-dashboard", () => {
    showMainWindow?.();
    return true;
  });

  // Auto-capture controls
  ipcMain.handle("capture-now-auto", (_event, intervalMs) => autoCapture.captureNow(intervalMs));
  ipcMain.handle("pause-auto-capture", () => autoCapture.pause());
  ipcMain.handle("resume-auto-capture", () => autoCapture.resume());
  ipcMain.handle("stop-auto-capture", () => autoCapture.stop());
  ipcMain.handle("get-auto-capture-status", () => autoCapture.getStatus());

  // Floating window controls
  ipcMain.handle("show-floating-window", () => { showFloatingWindow?.(); return true; });
  ipcMain.handle("hide-floating-window", () => { hideFloatingWindow?.(); return true; });

  // Session sub-memories
  ipcMain.handle("get-session-sub-memories", (_event, sessionId) => db.getSessionSubMemories(sessionId));
  ipcMain.handle("generate-session-summary", async (_event, sessionId) => {
    const sId = sessionId || autoCapture.getCurrentSessionId();
    if (!sId) return { error: "No active session" };
    const subMemories = db.getSessionSubMemories(sId);
    if (!subMemories.length) return { error: "No captures yet" };
    try {
      const summary = await groq.summarizeSession(subMemories);
      // Also save to contexts table
      db.saveContext({
        title: `Session Summary — ${new Date().toLocaleDateString()}`,
        content: summary,
        sessionId: sId,
        source: "session_summary",
      });
      return { summary };
    } catch (err) {
      return { error: err.message || "Summary generation failed" };
    }
  });

  // AI Chat with memories
  ipcMain.handle("chat-with-memories", async (_event, query) => {
    let relevant = db.searchMemories(query);
    if (relevant.length === 0) relevant = db.getAllMemories().slice(0, 20);
    else if (relevant.length > 20) relevant = relevant.slice(0, 20);
    // Strip heavy fields before sending to Groq
    const light = relevant.map(({ screenshot, rawContext, ...rest }) => rest);
    try {
      const response = await groq.chatWithMemories(query, light);
      return { response };
    } catch (err) {
      return { error: err.message || "Chat failed" };
    }
  });

  // Contexts
  ipcMain.handle("save-context", (_event, ctx) => db.saveContext(ctx));
  ipcMain.handle("get-all-contexts", () => db.getAllContexts());
  ipcMain.handle("delete-context", (_event, id) => db.deleteContext(id));
}

module.exports = { registerIpcHandlers };
