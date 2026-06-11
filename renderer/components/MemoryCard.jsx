import { typeClass, sensitivityClass, stars } from "../lib/ui.js";

export default function MemoryCard({ memory, selected, onSelect, onOpen, onToggleImportant, onDelete }) {
  return (
    <article className="rounded-lg border border-vault-line bg-vault-panel p-4 transition hover:border-vault-accent/70">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => onSelect(memory.id, event.target.checked)}
          className="mt-1 h-4 w-4 accent-vault-accent"
        />
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeClass(memory.type)}`}>{memory.type}</span>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${sensitivityClass(memory.sensitivity)}`}>
              {memory.sensitivity}
            </span>
          </div>
          <h3 className="mt-3 truncate text-base font-semibold">{memory.title}</h3>
          <p className="mt-2 line-clamp-2 min-h-[42px] text-sm text-vault-muted">{memory.summary || "No summary saved."}</p>
        </button>
        <div className="flex flex-col gap-1">
          <button
            onClick={onToggleImportant}
            title="Toggle important"
            className={`h-8 w-8 rounded-md border border-vault-line ${memory.isImportant ? "text-yellow-300" : "text-vault-muted"}`}
          >
            ★
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(memory.id); }}
            title="Delete memory"
            className="h-8 w-8 rounded-md border border-vault-line text-vault-muted transition hover:border-red-500/50 hover:text-red-400"
          >
            🗑
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-vault-muted">
        <span>{memory.sourceApp || "Unknown App"}</span>
        <span>•</span>
        <span>{new Date(memory.createdAt).toLocaleString()}</span>
        <span>•</span>
        <span>{stars(memory.usefulnessScore)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(memory.tags || []).slice(0, 4).map((tag) => (
          <span key={tag} className="rounded border border-vault-line px-2 py-0.5 text-xs text-vault-muted">
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}
