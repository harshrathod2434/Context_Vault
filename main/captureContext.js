const { clipboard } = require("electron");
const { execFile } = require("child_process");
const screenshot = require("screenshot-desktop");
const { createWorker } = require("tesseract.js");

function runAppleScript(script) {
  return new Promise((resolve) => {
    execFile("osascript", ["-e", script], { timeout: 3000 }, (error, stdout) => {
      if (error) return resolve(null);
      resolve(stdout.trim() || null);
    });
  });
}

async function getActiveWindowInfo() {
  // Use 'tab' keyword (not "\t") for tab character in AppleScript
  const appName = await runAppleScript(`
    tell application "System Events"
      return name of first application process whose frontmost is true
    end tell
  `);

  const winTitle = await runAppleScript(`
    tell application "System Events"
      try
        return name of front window of (first application process whose frontmost is true)
      end try
    end tell
  `);

  return {
    sourceApp: appName || "Unknown",
    windowTitle: winTitle || "",
  };
}

async function getBrowserUrl(sourceApp) {
  const app = String(sourceApp || "").toLowerCase();

  // Google Chrome
  if (app.includes("chrome") && !app.includes("canary")) {
    return runAppleScript('tell application "Google Chrome" to return URL of active tab of front window');
  }
  if (app.includes("chrome canary")) {
    return runAppleScript('tell application "Google Chrome Canary" to return URL of active tab of front window');
  }

  // Safari
  if (app.includes("safari") && !app.includes("technology")) {
    return runAppleScript('tell application "Safari" to return URL of front document');
  }

  // Arc
  if (app.includes("arc")) {
    return runAppleScript('tell application "Arc" to return URL of active tab of front window');
  }

  // Brave
  if (app.includes("brave")) {
    return runAppleScript('tell application "Brave Browser" to return URL of active tab of front window');
  }

  // Microsoft Edge
  if (app.includes("edge")) {
    return runAppleScript('tell application "Microsoft Edge" to return URL of active tab of front window');
  }

  // Opera
  if (app.includes("opera")) {
    return runAppleScript('tell application "Opera" to return URL of active tab of front window');
  }

  // Vivaldi
  if (app.includes("vivaldi")) {
    return runAppleScript('tell application "Vivaldi" to return URL of active tab of front window');
  }

  return null;
}

async function captureScreenshot() {
  try {
    const img = await screenshot({ format: "png" });
    return img.toString("base64");
  } catch (error) {
    console.error("screenshot capture failed", error);
    return null;
  }
}

async function runOcr(base64Png) {
  if (!base64Png) return null;
  try {
    const worker = await createWorker("eng");
    const buffer = Buffer.from(base64Png, "base64");
    const result = await worker.recognize(buffer);
    await worker.terminate();
    return result.data?.text?.trim() || null;
  } catch (error) {
    console.error("OCR failed", error);
    return null;
  }
}

async function captureContext() {
  const { sourceApp, windowTitle } = await getActiveWindowInfo();
  const url = await getBrowserUrl(sourceApp);
  const screenshotBase64 = await captureScreenshot();

  console.log(`[capture] App: ${sourceApp} | Title: ${windowTitle} | URL: ${url || "none"}`);

  const rawContext = {
    sourceApp,
    windowTitle,
    url,
    clipboardText: clipboard.readText() || "",
    screenshot: screenshotBase64,
    ocrText: null,
    timestamp: new Date().toISOString(),
  };

  rawContext.ocrText = await runOcr(screenshotBase64);
  return rawContext;
}

module.exports = { captureContext };
