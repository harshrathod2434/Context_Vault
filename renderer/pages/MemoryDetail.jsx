import { useEffect, useState } from "react";
import SensitivityBanner from "../components/SensitivityBanner.jsx";
import { sensitivityClass, stars, typeClass } from "../lib/ui.js";

const api = window.contextVault;

export default function MemoryDetail({ memory, onClose, onChanged, onAddToPack, showToast }) {
  const [title, setTitle] = useState(memory.title || "");
  const [summary, setSummary] = useState(memory.summary || "");
  const [showRaw, setShowRaw] = useState(false);
  const [showOcr, setShowOcr] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [subMemories, setSubMemories] = useState([]);
  const [showSubs, setShowSubs] = useState(false);

  useEffect(() => {
    if (memory.sessionId && memory.captureCount > 0) {
      api.getSessionSubMemories(memory.sessionId).then(setSubMemories);
    }
  }, [memory.sessionId, memory.captureCount]);

  async function save() {
    await api.updateMemory(memory.id, { title, summary });
    showToast("Memory updated.");
    onChanged();
  }

  async function remove() {
    await api.deleteMemory(memory.id);
    showToast("Memory deleted.");
    onChanged();
  }

  async function copySummary() {
    await navigator.clipboard.writeText(summary);
    showToast("Summary copied.");
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/55" onMouseDown={onClose}>
      <aside
        className="ml-auto h-full w-full max-w-2xl overflow-y-auto border-l border-vault-line bg-vault-bg p-6 shadow-glow"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeClass(memory.type)}`}>{memory.type}</span>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${sensitivityClass(memory.sensitivity)}`}>{memory.sensitivity}</span>
            <span className="text-sm text-vault-muted">{stars(memory.usefulnessScore)}</span>
            {memory.captureCount > 0 && (
              <span className="rounded bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-200">
                {memory.captureCount} captures
              </span>
            )}
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-md border border-vault-line text-vault-muted">×</button>
        </div>

        <div className="mt-5 space-y-4">
          <SensitivityBanner sensitivity={memory.sensitivity} />
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-md border border-vault-line bg-vault-panel px-3 py-3 text-2xl font-semibold outline-none focus:border-vault-accent"
          />
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={5}
            className="w-full resize-y rounded-md border border-vault-line bg-vault-panel px-3 py-3 text-sm text-vault-text outline-none focus:border-vault-accent"
          />

          <div className="flex flex-wrap gap-2">
            {(memory.tags || []).map((tag) => (
              <span key={tag} className="rounded border border-vault-line px-2 py-1 text-xs text-vault-muted">{tag}</span>
            ))}
          </div>

          <dl className="grid gap-3 rounded-lg border border-vault-line bg-vault-panel p-4 text-sm sm:grid-cols-2">
            <Info label="Intent" value={memory.intent} />
            <Info label="Topic" value={memory.topic} />
            <Info label="Source App" value={memory.sourceApp} />
            <Info label="Window Title" value={memory.windowTitle} />
            <Info label="Timestamp" value={new Date(memory.createdAt).toLocaleString()} />
            <div>
              <dt className="text-vault-muted">URL</dt>
              <dd className="break-all">
                {memory.url ? <a className="text-vault-accent" href={memory.url}>{memory.url}</a> : "None"}
              </dd>
            </div>
          </dl>

          <div className="rounded-lg border border-vault-line bg-vault-panel p-4">
            <h3 className="font-semibold">Suggested Next Action</h3>
            <p className="mt-2 text-sm text-vault-muted">{memory.suggestedNextAction || "No next action suggested."}</p>
          </div>

          {memory.screenshot ? (
            <button onClick={() => setShowImage(!showImage)} className="block w-full rounded-lg border border-vault-line bg-vault-panel p-3 text-left">
              <span className="text-sm font-semibold">Screenshot</span>
              {showImage ? <img className="mt-3 max-h-[520px] w-full rounded-md object-contain" src={`data:image/png;base64,${memory.screenshot}`} alt="Captured screen" /> : null}
            </button>
          ) : null}

          {/* Sub-memories timeline for session memories */}
          {subMemories.length > 0 && (
            <div className="rounded-lg border border-vault-line bg-vault-panel">
              <button onClick={() => setShowSubs(!showSubs)} className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold">
                Capture Timeline ({subMemories.length} captures)
                <span>{showSubs ? "−" : "+"}</span>
              </button>
              {showSubs && (
                <div className="border-t border-vault-line p-4 space-y-3">
                  {subMemories.map((sub, i) => (
                    <div key={sub.id} className="flex gap-3 rounded-md border border-vault-line/50 bg-vault-bg p-3">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-vault-accent">#{i + 1}</span>
                        <span className="mt-1 text-[10px] text-vault-muted">{new Date(sub.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{sub.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-vault-muted">{sub.summary}</p>
                        <div className="mt-1.5 flex gap-1.5 text-[10px] text-vault-muted">
                          <span>{sub.sourceApp}</span>
                          {sub.windowTitle && <><span>•</span><span className="truncate">{sub.windowTitle}</span></>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


        </div>

        <div className="sticky bottom-0 mt-6 flex flex-wrap gap-2 border-t border-vault-line bg-vault-bg py-4">
          <button onClick={save} className="btn-primary">Save Changes</button>
          <button onClick={() => api.toggleImportant(memory.id).then(onChanged)} className="btn-secondary">Mark Important</button>
          <button onClick={copySummary} className="btn-secondary">Copy Summary</button>
          {memory.sessionId && (
            <button
              onClick={async () => {
                showToast("Generating AI summary...");
                const result = await api.generateSessionSummary(memory.sessionId);
                if (result.summary) {
                  await navigator.clipboard.writeText(result.summary);
                  showToast("AI summary copied to clipboard!");
                } else {
                  showToast(result.error || "Summary generation failed.");
                }
              }}
              className="btn-secondary"
            >
              📋 Generate AI Summary
            </button>
          )}
          <button onClick={() => onAddToPack(memory.id)} className="btn-secondary">Add to Context Pack</button>
          <button onClick={remove} className="rounded-md border border-red-500/50 px-3 py-2 text-sm font-semibold text-red-200">Delete Memory</button>
        </div>
      </aside>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-vault-muted">{label}</dt>
      <dd className="mt-1 break-words">{value || "None"}</dd>
    </div>
  );
}

function Disclosure({ title, open, onClick, children }) {
  return (
    <div className="rounded-lg border border-vault-line bg-vault-panel">
      <button onClick={onClick} className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold">
        {title}
        <span>{open ? "−" : "+"}</span>
      </button>
      {open ? <pre className="max-h-72 overflow-auto border-t border-vault-line p-4 text-xs text-vault-muted">{children}</pre> : null}
    </div>
  );
}
