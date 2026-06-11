const { clipboard } = require("electron");
const { execFile } = require("child_process");
const db = require("./db");

let clipboardIntervalId = null;
let selectionIntervalId = null;
let lastClipboard = "";
let lastSelection = "";
let sessionId = null;
let onCapture = () => {};

function start(sId, onCaptureCallback) {
  stop();
  sessionId = sId;
  onCapture = onCaptureCallback || (() => {});
  lastClipboard = clipboard.readText() || "";
  lastSelection = "";

  // Monitor clipboard changes (Cmd+C)
  clipboardIntervalId = setInterval(() => {
    try {
      const currentText = (clipboard.readText() || "").trim();
      if (currentText && currentText !== lastClipboard && currentText.length >= 3) {
        lastClipboard = currentText;
        saveEntry(currentText, "clipboard");
      }
    } catch (_) {}
  }, 1500);

  // Monitor selected text via Accessibility API
  selectionIntervalId = setInterval(() => {
    getSelectedText((text) => {
      if (text && text !== lastSelection && text !== lastClipboard && text.length >= 3) {
        lastSelection = text;
        saveEntry(text, "selection");
      }
    });
  }, 2000);
}

function stop() {
  if (clipboardIntervalId) clearInterval(clipboardIntervalId);
  if (selectionIntervalId) clearInterval(selectionIntervalId);
  clipboardIntervalId = null;
  selectionIntervalId = null;
  sessionId = null;
}

function getSelectedText(callback) {
  const script = `
    try
      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
        set selectedText to value of attribute "AXSelectedText" of focused UI element of application process frontApp
        if selectedText is not missing value then
          return selectedText
        end if
      end tell
    on error
      return ""
    end try
    return ""
  `;

  execFile("osascript", ["-e", script], { timeout: 2000 }, (error, stdout) => {
    if (error) return callback(null);
    const text = (stdout || "").trim();
    callback(text || null);
  });
}

function saveEntry(text, source) {
  if (!sessionId) return;

  const preview = text.length > 60 ? text.substring(0, 60) + "…" : text;
  const isClipboard = source === "clipboard";

  db.saveMemory({
    title: `${isClipboard ? "Copied" : "Selected"}: ${preview}`,
    summary: text,
    type: isClipboard ? "Clipboard" : "Selection",
    intent: "",
    topic: "",
    tags: [source],
    sensitivity: "low",
    usefulnessScore: 5,
    suggestedNextAction: "",
    sourceApp: isClipboard ? "Clipboard" : "Selection",
    windowTitle: "",
    url: "",
    screenshot: null,
    rawContext: { [source === "clipboard" ? "clipboardText" : "selectedText"]: text, type: source },
    createdAt: new Date().toISOString(),
    sessionId,
    isSubMemory: 1,
  });

  onCapture();
}

module.exports = { start, stop };
