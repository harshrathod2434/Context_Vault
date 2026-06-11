import { useState, useEffect } from "react";

const api = window.contextVault;

export default function ContextLibrary({ showToast }) {
  const [contexts, setContexts] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    loadContexts();
  }, []);

  async function loadContexts() {
    const data = await api.getAllContexts();
    setContexts(data || []);
  }

  async function copyContext(content) {
    await navigator.clipboard.writeText(content);
    showToast("Context copied to clipboard!");
  }

  async function remove(id) {
    await api.deleteContext(id);
    showToast("Context deleted.");
    loadContexts();
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Generated Contexts</h2>
          <p className="text-sm text-vault-muted">AI-generated summaries from your sessions — ready to paste into any AI assistant</p>
        </div>
      </div>

      {contexts.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-vault-muted">
          <span className="text-4xl">📋</span>
          <h3 className="text-base font-semibold text-vault-text">No generated contexts yet</h3>
          <p className="max-w-md text-sm">
            Start a capture session, then click the 📋 button on the floating bar or "Generate AI Summary"
            on a session memory to create your first context.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {contexts.map((ctx) => (
          <div key={ctx.id} className="rounded-xl border border-vault-line bg-vault-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold">{ctx.title}</h3>
                  <span className="shrink-0 rounded bg-vault-accent/15 px-2 py-0.5 text-[10px] font-medium text-vault-accent">
                    {ctx.source === "session_summary" ? "Session" : ctx.source === "context_pack" ? "Pack" : "Manual"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-vault-muted">{new Date(ctx.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => copyContext(ctx.content)}
                  title="Copy to clipboard"
                  className="rounded-lg border border-vault-line px-3 py-1.5 text-xs font-medium text-vault-text transition hover:bg-vault-line"
                >
                  📋 Copy
                </button>
                <button
                  onClick={() => remove(ctx.id)}
                  title="Delete context"
                  className="rounded-lg border border-red-500/30 px-2 py-1.5 text-xs text-red-300 transition hover:bg-red-500/10"
                >
                  🗑
                </button>
              </div>
            </div>

            {/* Expandable content */}
            <button
              onClick={() => setExpanded(expanded === ctx.id ? null : ctx.id)}
              className="mt-3 text-xs font-medium text-vault-accent"
            >
              {expanded === ctx.id ? "Hide content ▲" : "Show content ▼"}
            </button>

            {expanded === ctx.id && (
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-vault-line bg-vault-bg p-3 text-xs leading-relaxed text-vault-text whitespace-pre-wrap">
                {ctx.content}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
