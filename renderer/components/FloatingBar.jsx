import { useEffect, useState } from "react";

const api = window.contextVault;

export default function FloatingBar() {
  const [status, setStatus] = useState({
    running: false,
    paused: false,
    captureCount: 0,
    nextCaptureTime: null,
    intervalMs: 30000,
    busy: false,
  });
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    api.getAutoCaptureStatus().then(setStatus);
    return api.onAutoCaptureStatus(setStatus);
  }, []);

  useEffect(() => {
    if (!status.running || status.paused || !status.nextCaptureTime) {
      setCountdown(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((new Date(status.nextCaptureTime) - Date.now()) / 1000));
      setCountdown(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status.nextCaptureTime, status.running, status.paused]);

  const { running, paused, captureCount, busy } = status;

  const [summarizing, setSummarizing] = useState(false);

  async function handleSummary() {
    setSummarizing(true);
    try {
      const result = await api.generateSessionSummary();
      if (result.error) return;
      await navigator.clipboard.writeText(result.summary);
    } catch (_) {}
    setSummarizing(false);
  }

  return (
    <div className="h-screen w-screen bg-transparent" style={{ padding: 4 }}>
      <div
        className="flex h-full items-center gap-1.5 rounded-xl border border-white/10 bg-[#1a1d25]/90 px-2.5 backdrop-blur-xl"
        style={{ WebkitAppRegion: "drag", boxShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
      >
        {/* Status dot */}
        {running && !paused ? (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
        ) : paused ? (
          <span className="h-2 w-2 shrink-0 rounded-full bg-yellow-500" />
        ) : (
          <span className="h-2 w-2 shrink-0 rounded-full bg-white/20" />
        )}

        {/* Status text */}
        <span className="min-w-0 truncate text-[10px] leading-none text-white/50" style={{ WebkitAppRegion: "no-drag" }}>
          {running && !paused && (
            <>{captureCount} {busy ? "…" : ""}{countdown !== null ? ` · ${countdown}s` : ""}</>
          )}
          {running && paused && <>{captureCount} paused</>}
          {!running && "Ready"}
        </span>

        <div className="flex-1" />

        {/* Controls */}
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" }}>
          <Btn emoji="📸" label={running ? "Capture" : "Start"} onClick={() => api.captureNowAuto()} disabled={busy} accent />
          {running && !paused && <Btn emoji="⏸" label="Pause" onClick={() => api.pauseAutoCapture()} />}
          {running && paused && <Btn emoji="▶" label="Resume" onClick={() => api.resumeAutoCapture()} />}
          {running && <Btn emoji="⏹" label="Stop" onClick={() => api.stopAutoCapture()} danger />}
          {running && <Btn emoji={summarizing ? "⏳" : "📋"} label="Copy Session Summary" onClick={handleSummary} disabled={summarizing || captureCount === 0} />}
          <Btn emoji="✕" label="Close" onClick={() => api.hideFloatingWindow()} />
        </div>
      </div>
    </div>
  );
}

function Btn({ emoji, label, onClick, disabled, accent, danger }) {
  let cls = "h-6 min-w-[24px] rounded-md px-1.5 text-[10px] transition ";
  if (accent) cls += "bg-[#7c5cfc] text-white hover:bg-[#6a4bf0] ";
  else if (danger) cls += "border border-red-500/20 bg-red-500/10 text-red-300/80 hover:bg-red-500/20 ";
  else cls += "border border-white/10 bg-white/[0.06] text-white/60 hover:bg-white/15 ";
  if (disabled) cls += "opacity-40 cursor-not-allowed ";

  return (
    <button onClick={onClick} disabled={disabled} title={label} className={cls}>
      {emoji}
    </button>
  );
}
