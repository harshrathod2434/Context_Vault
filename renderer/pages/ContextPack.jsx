import { useState } from "react";

const api = window.contextVault;

export default function ContextPack({ memories, onBack, showToast, onSaved }) {
  const [items, setItems] = useState(memories);
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      setPack(await api.generateContextPack(items));
      showToast("Context pack generated.");
    } catch (error) {
      showToast(error.message || "Could not generate context pack.");
    } finally {
      setLoading(false);
    }
  }

  function packText() {
    if (!pack) return "";
    return [
      `What I'm Working On\n${pack.whatImWorkingOn}`,
      `Relevant Background\n${pack.relevantBackground}`,
      `Recent Context\n${pack.recentContext}`,
      `Important Decisions\n${pack.importantDecisions}`,
      `Suggested Next Step\n${pack.suggestedNextStep}`,
      `AI Prompt\n${pack.aiPrompt}`
    ].join("\n\n");
  }

  async function saveAsMemory() {
    await api.saveMemory({
      title: "Generated Context Pack",
      summary: pack.aiPrompt || packText(),
      type: "Prompt",
      intent: "Continue work using selected saved context",
      topic: "Context pack",
      tags: ["context-pack", "prompt"],
      sensitivity: "medium",
      usefulnessScore: 8,
      suggestedNextAction: pack.suggestedNextStep,
      rawContext: { source: "context-pack", memoryIds: items.map((item) => item.id), pack },
      sourceApp: "ContextVault",
      windowTitle: "Context Pack"
    });
    await onSaved();
    showToast("Context pack saved as memory.");
  }

  return (
    <main className="min-h-screen bg-vault-bg text-vault-text">
      <header className="border-b border-vault-line px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <button onClick={onBack} className="text-sm text-vault-muted">← Back</button>
            <h1 className="mt-2 text-2xl font-semibold">Context Pack</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={generate} disabled={loading || !items.length} className="btn-primary">
              {loading ? "Generating..." : "Generate Pack"}
            </button>
            {pack ? <button onClick={() => navigator.clipboard.writeText(packText()).then(() => showToast("Copied all."))} className="btn-secondary">Copy All</button> : null}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[340px_1fr]">
        <aside className="rounded-lg border border-vault-line bg-vault-panel p-4">
          <h2 className="font-semibold">Selected Memories</h2>
          <div className="mt-3 space-y-2">
            {items.map((memory) => (
              <label key={memory.id} className="flex gap-2 rounded-md border border-vault-line p-2 text-sm">
                <input
                  type="checkbox"
                  checked
                  onChange={() => setItems((current) => current.filter((item) => item.id !== memory.id))}
                  className="mt-1 accent-vault-accent"
                />
                <span>
                  <span className="block font-medium">{memory.title}</span>
                  <span className="text-xs text-vault-muted">{memory.type} · {memory.sourceApp}</span>
                </span>
              </label>
            ))}
          </div>
        </aside>

        <section className="space-y-4">
          {!pack ? (
            <div className="grid min-h-[420px] place-items-center rounded-lg border border-dashed border-vault-line text-vault-muted">
              Generate a pack from selected memories.
            </div>
          ) : (
            <>
              <PackSection title="What I'm Working On" value={pack.whatImWorkingOn} />
              <PackSection title="Relevant Background" value={pack.relevantBackground} />
              <PackSection title="Recent Context" value={pack.recentContext} />
              <PackSection title="Important Decisions" value={pack.importantDecisions} />
              <PackSection title="Suggested Next Step" value={pack.suggestedNextStep} />
              <div className="rounded-lg border border-vault-accent/50 bg-vault-panel p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">AI Prompt</h2>
                  <button onClick={() => navigator.clipboard.writeText(pack.aiPrompt).then(() => showToast("Prompt copied."))} className="btn-secondary">Copy</button>
                </div>
                <pre className="mt-3 whitespace-pre-wrap rounded-md bg-vault-input p-4 text-sm text-vault-text">{pack.aiPrompt}</pre>
              </div>
              <button onClick={saveAsMemory} className="btn-primary">Save as Memory</button>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

function PackSection({ title, value }) {
  return (
    <div className="rounded-lg border border-vault-line bg-vault-panel p-4">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-vault-muted">{value}</p>
    </div>
  );
}
