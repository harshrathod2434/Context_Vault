const { v4: uuidv4 } = require("uuid");
const { captureContext } = require("./captureContext");
const groq = require("./groqService");
const db = require("./db");
const clipboardWatcher = require("./clipboardWatcher");

let timerId = null;
let busy = false;
let broadcast = () => {};
let onCaptured = () => {};
let onSessionStarted = () => {};
let currentSessionId = null;

const state = {
  running: false,
  paused: false,
  captureCount: 0,
  lastCaptureTime: null,
  nextCaptureTime: null,
  intervalMs: 30000,
};

function setNotifier(fn) {
  broadcast = fn || (() => {});
}

function setOnCaptured(fn) {
  onCaptured = fn || (() => {});
}

function setOnSessionStarted(fn) {
  onSessionStarted = fn || (() => {});
}

function getStatus() {
  return { ...state, busy };
}

function notify() {
  broadcast(getStatus());
}

async function doCapture() {
  if (busy) return;
  if (!groq.hasApiKey()) return;
  busy = true;
  notify();

  try {
    const rawContext = await captureContext();
    const classification = await groq.classifyMemory(rawContext);
    const memory = {
      ...classification,
      rawContext,
      sourceApp: rawContext.sourceApp,
      windowTitle: rawContext.windowTitle,
      url: rawContext.url,
      screenshot: rawContext.screenshot,
      createdAt: rawContext.timestamp,
      sessionId: currentSessionId,
      isSubMemory: 1,
    };

    db.saveMemory(memory);
    state.captureCount += 1;
    state.lastCaptureTime = new Date().toISOString();
    onCaptured();
  } catch (err) {
    console.error("Auto-capture failed:", err.message);
  } finally {
    busy = false;
    notify();
  }
}

function scheduleNext() {
  if (!state.running || state.paused) return;
  state.nextCaptureTime = new Date(Date.now() + state.intervalMs).toISOString();
  notify();
  timerId = setTimeout(async () => {
    if (!state.running) return;
    if (!state.paused) {
      await doCapture();
    }
    if (state.running && !state.paused) {
      scheduleNext();
    }
  }, state.intervalMs);
}

function clearTimer() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
}

/**
 * Main action: captures immediately and starts/restarts the 30s auto-cycle.
 * Creates a new session if not already running.
 */
function captureNow(intervalMs) {
  clearTimer();

  if (!state.running) {
    state.running = true;
    state.captureCount = 0;
    state.lastCaptureTime = null;
    currentSessionId = uuidv4();
    clipboardWatcher.start(currentSessionId, () => onCaptured());
    onSessionStarted();
  }

  state.paused = false;
  if (intervalMs && intervalMs > 0) state.intervalMs = intervalMs;

  doCapture().then(() => {
    if (state.running && !state.paused) {
      scheduleNext();
    }
  });
}

function pause() {
  if (!state.running) return;
  state.paused = true;
  state.nextCaptureTime = null;
  clearTimer();
  notify();
}

function resume() {
  if (!state.running || !state.paused) return;
  state.paused = false;
  scheduleNext();
  notify();
}

function stop() {
  clearTimer();
  clipboardWatcher.stop();

  // Create parent memory for the session
  if (currentSessionId) {
    try {
      createSessionParent(currentSessionId);
    } catch (err) {
      console.error("Failed to create session parent:", err.message);
    }
  }

  currentSessionId = null;
  state.running = false;
  state.paused = false;
  state.captureCount = 0;
  state.nextCaptureTime = null;
  notify();
}

function getCurrentSessionId() {
  return currentSessionId;
}

function createSessionParent(sessionId) {
  const subMemories = db.getSessionSubMemories(sessionId);
  if (!subMemories.length) return;

  const captureCount = subMemories.length;
  const first = subMemories[0];
  const last = subMemories[subMemories.length - 1];
  const allTags = [...new Set(subMemories.flatMap((m) => m.tags || []))];
  const sourceApps = [...new Set(subMemories.map((m) => m.sourceApp).filter(Boolean).filter((a) => a !== "Clipboard"))];
  const summaries = subMemories.filter((m) => m.type !== "Clipboard").map((m) => m.summary).filter(Boolean);
  const clipboardCount = subMemories.filter((m) => m.type === "Clipboard").length;

  const startTime = new Date(first.createdAt);
  const endTime = new Date(last.createdAt);
  const durationMin = Math.max(1, Math.round((endTime - startTime) / 60000));

  const topicLabel = mostCommon(subMemories.filter((m) => m.type !== "Clipboard").map((m) => m.topic).filter(Boolean)) || first.title || "Capture Session";
  const countLabel = clipboardCount ? `${captureCount - clipboardCount} captures, ${clipboardCount} clips` : `${captureCount} captures`;

  const parent = {
    title: `${topicLabel} — ${countLabel}, ${durationMin}min`,
    summary:
      summaries.length <= 3
        ? summaries.join(" → ")
        : summaries.slice(0, 2).join(" → ") + ` … +${summaries.length - 2} more`,
    type: mostCommon(subMemories.map((m) => m.type)) || "General Note",
    intent: last.intent || first.intent || "",
    topic: mostCommon(subMemories.map((m) => m.topic).filter(Boolean)) || "",
    tags: allTags.slice(0, 8),
    sensitivity: subMemories.some((m) => m.sensitivity === "high")
      ? "high"
      : subMemories.some((m) => m.sensitivity === "medium")
        ? "medium"
        : "low",
    usefulnessScore: Math.round(
      subMemories.reduce((s, m) => s + (m.usefulnessScore || 0), 0) / subMemories.length
    ),
    suggestedNextAction: last.suggestedNextAction || "",
    sourceApp: sourceApps.join(", "),
    windowTitle: last.windowTitle || "",
    url: last.url || first.url || "",
    screenshot: last.screenshot,
    createdAt: first.createdAt,
    sessionId,
    isSubMemory: 0,
    captureCount,
  };

  db.saveMemory(parent);
  onCaptured();
}

function mostCommon(arr) {
  const counts = {};
  arr.forEach((v) => {
    if (v) counts[v] = (counts[v] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || "";
}

module.exports = {
  setNotifier,
  setOnCaptured,
  setOnSessionStarted,
  captureNow,
  pause,
  resume,
  stop,
  getStatus,
  getCurrentSessionId,
};
