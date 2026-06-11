const path = require("path");
const { app, BrowserWindow, Menu, Tray, globalShortcut, dialog, nativeImage } = require("electron");
const db = require("./db");
const { registerIpcHandlers } = require("./ipcHandlers");
const autoCapture = require("./autoCaptureManager");

// Suppress EPIPE errors from broken stdout/stderr pipes (common in dev with concurrently)
process.on("uncaughtException", (err) => {
  if (err.code === "EPIPE") return;
  console.error("Uncaught exception:", err);
});

let mainWindow;
let floatingWindow;
let tray;

const isDev = !app.isPackaged;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: "ContextVault",
    backgroundColor: "#111318",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "build", "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createFloatingWindow() {
  floatingWindow = new BrowserWindow({
    width: 400,
    height: 52,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  floatingWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  if (isDev) {
    floatingWindow.loadURL("http://127.0.0.1:5173?floating=1");
  } else {
    floatingWindow.loadFile(path.join(__dirname, "..", "build", "index.html"), { query: { floating: "1" } });
  }
}

function showFloatingWindow() {
  if (!floatingWindow || floatingWindow.isDestroyed()) createFloatingWindow();
  floatingWindow.show();
}

function hideFloatingWindow() {
  if (floatingWindow && !floatingWindow.isDestroyed()) floatingWindow.hide();
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, "..", "public", "tray-icon.png"));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip("ContextVault");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open ContextVault", click: () => showMainWindow() },
    { label: "Capture Now", click: () => triggerCapture() },
    { label: "Show/Hide Floating Bar", click: () => toggleFloatingBar() },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() }
  ]));
}

function showMainWindow() {
  if (!mainWindow) createMainWindow();
  mainWindow.show();
  mainWindow.focus();
}

function toggleFloatingBar() {
  if (!floatingWindow || floatingWindow.isDestroyed()) createFloatingWindow();
  floatingWindow.isVisible() ? floatingWindow.hide() : floatingWindow.show();
}

function triggerCapture() {
  showMainWindow();
  mainWindow.webContents.send("shortcut-capture");
}

async function showSensitivityDialog() {
  const result = await dialog.showMessageBox(mainWindow, {
    type: "warning",
    buttons: ["Discard", "Save Anyway"],
    defaultId: 0,
    cancelId: 0,
    title: "Sensitive content detected",
    message: "Sensitive content detected. This memory may contain private data.",
    detail: "Save anyway or discard?"
  });
  return result.response === 1;
}

function registerShortcuts() {
  globalShortcut.register("CommandOrControl+Shift+C", triggerCapture);
  globalShortcut.register("CommandOrControl+Shift+Space", toggleFloatingBar);
  globalShortcut.register("CommandOrControl+F", () => {
    if (mainWindow) mainWindow.webContents.send("shortcut-focus-search");
  });
}

function broadcastToWindows(channel, data) {
  [mainWindow, floatingWindow].forEach((win) => {
    try {
      if (win && !win.isDestroyed()) win.webContents.send(channel, data);
    } catch (_) { /* window may have been closed */ }
  });
}

app.whenReady().then(() => {
  db.initDb();
  registerIpcHandlers({ showSensitivityDialog, showMainWindow, showFloatingWindow, hideFloatingWindow });
  createMainWindow();
  createFloatingWindow();
  createTray();
  registerShortcuts();

  // Wire auto-capture notifications
  autoCapture.setNotifier((status) => broadcastToWindows("auto-capture-status", status));
  autoCapture.setOnCaptured(() => broadcastToWindows("memories-updated"));
  autoCapture.setOnSessionStarted(() => showFloatingWindow());

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
