const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("contextVault", {
  setApiKey: (key) => ipcRenderer.invoke("set-api-key", key),
  testApiKey: (key) => ipcRenderer.invoke("test-api-key", key),
  hasApiKey: () => ipcRenderer.invoke("has-api-key"),
  captureContext: () => ipcRenderer.invoke("capture-context"),
  classifyMemory: (rawContext) => ipcRenderer.invoke("classify-memory", rawContext),
  summarizeContext: (rawContext) => ipcRenderer.invoke("summarize-context", rawContext),
  saveMemory: (memory) => ipcRenderer.invoke("save-memory", memory),
  getAllMemories: () => ipcRenderer.invoke("get-all-memories"),
  searchMemories: (query) => ipcRenderer.invoke("search-memories", query),
  filterMemories: (filters) => ipcRenderer.invoke("filter-memories", filters),
  getMemory: (id) => ipcRenderer.invoke("get-memory", id),
  updateMemory: (id, changes) => ipcRenderer.invoke("update-memory", id, changes),
  deleteMemory: (id) => ipcRenderer.invoke("delete-memory", id),
  toggleImportant: (id) => ipcRenderer.invoke("toggle-important", id),
  generateContextPack: (memories) => ipcRenderer.invoke("generate-context-pack", memories),
  openDashboard: () => ipcRenderer.invoke("open-dashboard"),

  // Auto-capture controls
  captureNowAuto: (intervalMs) => ipcRenderer.invoke("capture-now-auto", intervalMs),
  pauseAutoCapture: () => ipcRenderer.invoke("pause-auto-capture"),
  resumeAutoCapture: () => ipcRenderer.invoke("resume-auto-capture"),
  stopAutoCapture: () => ipcRenderer.invoke("stop-auto-capture"),
  getAutoCaptureStatus: () => ipcRenderer.invoke("get-auto-capture-status"),

  // Floating window controls
  showFloatingWindow: () => ipcRenderer.invoke("show-floating-window"),
  hideFloatingWindow: () => ipcRenderer.invoke("hide-floating-window"),

  // Session sub-memories & summary
  getSessionSubMemories: (sessionId) => ipcRenderer.invoke("get-session-sub-memories", sessionId),
  generateSessionSummary: (sessionId) => ipcRenderer.invoke("generate-session-summary", sessionId),

  // AI Chat
  chatWithMemories: (query) => ipcRenderer.invoke("chat-with-memories", query),

  // Contexts
  saveContext: (ctx) => ipcRenderer.invoke("save-context", ctx),
  getAllContexts: () => ipcRenderer.invoke("get-all-contexts"),
  deleteContext: (id) => ipcRenderer.invoke("delete-context", id),

  // Event listeners
  onCaptureShortcut: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("shortcut-capture", listener);
    return () => ipcRenderer.removeListener("shortcut-capture", listener);
  },
  onFocusSearch: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("shortcut-focus-search", listener);
    return () => ipcRenderer.removeListener("shortcut-focus-search", listener);
  },
  onToast: (callback) => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on("toast", listener);
    return () => ipcRenderer.removeListener("toast", listener);
  },
  onAutoCaptureStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("auto-capture-status", listener);
    return () => ipcRenderer.removeListener("auto-capture-status", listener);
  },
  onMemoriesUpdated: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("memories-updated", listener);
    return () => ipcRenderer.removeListener("memories-updated", listener);
  },
});
