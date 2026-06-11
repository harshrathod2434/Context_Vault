import { useEffect, useMemo, useRef, useState } from "react";
import MemoryCard from "../components/MemoryCard.jsx";
import SearchBar from "../components/SearchBar.jsx";
import MemoryDetail from "./MemoryDetail.jsx";

const api = window.contextVault;
const TYPES = ["", "Task", "Project", "Research", "Coding", "Bug", "Meeting", "Writing", "Design", "Decision", "Prompt", "General Note"];

export default function Dashboard({
  memories,
  setMemories,
  loadMemories,
  selectedIds,
  setSelectedIds,
  onCapture,
  onContextPack,
  showToast,
  theme,
  setTheme
}) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ type: "", sourceApp: "", tag: "" });
  const [activeMemory, setActiveMemory] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    loadMemories();
  }, []);

  useEffect(() => {
    const offCapture = api.onCaptureShortcut(onCapture);
    const offSearch = api.onFocusSearch(() => searchRef.current?.focus());
    return () => {
      offCapture?.();
      offSearch?.();
    };
  }, [onCapture]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (query.trim()) {
        setMemories(await api.searchMemories(query.trim()));
      } else if (filters.type || filters.sourceApp || filters.tag) {
        setMemories(await api.filterMemories(filters));
      } else {
        await loadMemories();
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, filters.type, filters.sourceApp, filters.tag]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") setActiveMemory(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sourceApps = useMemo(() => [...new Set(memories.map((m) => m.sourceApp).filter(Boolean))], [memories]);
  const tags = useMemo(() => [...new Set(memories.flatMap((m) => m.tags || []))], [memories]);

  function updateSelection(id, checked) {
    setSelectedIds((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id));
  }

  async function toggleImportant(id) {
    await api.toggleImportant(id);
    await loadMemories();
  }

  async function deleteMemory(id) {
    await api.deleteMemory(id);
    setSelectedIds((current) => current.filter((item) => item !== id));
    await loadMemories();
  }

  return (
    <main className="min-h-screen bg-vault-bg text-vault-text">
      <header className="sticky top-0 z-20 border-b border-vault-line bg-vault-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 py-4">
          <div className="mr-2 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-vault-accent font-bold text-white">CV</div>
            <h1 className="text-xl font-semibold">ContextVault</h1>
          </div>
          <SearchBar ref={searchRef} value={query} onChange={setQuery} />
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="control">
            {TYPES.map((type) => <option key={type} value={type}>{type || "Type"}</option>)}
          </select>
          <select value={filters.sourceApp} onChange={(e) => setFilters({ ...filters, sourceApp: e.target.value })} className="control">
            <option value="">Source App</option>
            {sourceApps.map((app) => <option key={app} value={app}>{app}</option>)}
          </select>
          <select value={filters.tag} onChange={(e) => setFilters({ ...filters, tag: e.target.value })} className="control">
            <option value="">Tag</option>
            {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
          </select>
          <button onClick={() => { api.captureNowAuto(); api.showFloatingWindow(); }} className="rounded-md bg-vault-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110">
            Capture Now
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6">
        {selectedIds.length ? (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-vault-line bg-vault-panel px-4 py-3">
            <span className="text-sm text-vault-muted">{selectedIds.length} selected</span>
            <button onClick={onContextPack} className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#12141a]">
              Generate Context Pack
            </button>
          </div>
        ) : null}

        {!memories.length ? (
          <div className="grid min-h-[55vh] place-items-center rounded-lg border border-dashed border-vault-line">
            <p className="text-vault-muted">No memories yet. Press Cmd+Shift+C to capture your first context.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {memories.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                selected={selectedIds.includes(memory.id)}
                onSelect={updateSelection}
                onOpen={() => setActiveMemory(memory)}
                onToggleImportant={() => toggleImportant(memory.id)}
                onDelete={deleteMemory}
              />
            ))}
          </div>
        )}
      </section>

      {activeMemory ? (
        <MemoryDetail
          memory={activeMemory}
          onClose={() => setActiveMemory(null)}
          onChanged={async () => {
            await loadMemories();
            setActiveMemory(null);
          }}
          onAddToPack={(id) => updateSelection(id, true)}
          showToast={showToast}
        />
      ) : null}
    </main>
  );
}
