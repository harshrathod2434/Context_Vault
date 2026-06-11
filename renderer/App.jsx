import { useEffect, useMemo, useState } from "react";
import KeyEntry from "./pages/KeyEntry.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ContextPack from "./pages/ContextPack.jsx";
import Assistant from "./pages/Assistant.jsx";
import ContextLibrary from "./pages/ContextLibrary.jsx";
import FloatingBar from "./components/FloatingBar.jsx";

const api = window.contextVault;

const TABS = [
  { id: "memories", label: "Memories", icon: "🧠" },
  { id: "assistant", label: "Assistant", icon: "💬" },
  { id: "context", label: "Context", icon: "📋" },
];

export default function App() {
  const isFloating = new URLSearchParams(window.location.search).get("floating") === "1";
  const [hasKey, setHasKey] = useState(false);
  const [checking, setChecking] = useState(true);
  const [memories, setMemories] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [view, setView] = useState("dashboard");
  const [activeTab, setActiveTab] = useState("memories");
  const [toast, setToast] = useState("");
  const [theme, setTheme] = useState("dark");
  const selectedMemories = useMemo(
    () => memories.filter((memory) => selectedIds.includes(memory.id)),
    [memories, selectedIds]
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  useEffect(() => {
    api.hasApiKey().then(setHasKey).finally(() => setChecking(false));
    const offToast = api.onToast?.((message) => showToast(message));
    const offMemories = api.onMemoriesUpdated?.(() => loadMemories());
    return () => {
      offToast?.();
      offMemories?.();
    };
  }, []);

  async function loadMemories() {
    const rows = await api.getAllMemories();
    setMemories(rows);
    return rows;
  }

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(""), 2800);
  }

  async function captureAndSave() {
    if (!hasKey) {
      showToast("Enter and validate your Groq API key first.");
      return;
    }

    try {
      showToast("Capturing current context...");
      const rawContext = await api.captureContext();
      showToast("Classifying memory...");
      const classification = await api.classifyMemory(rawContext);
      const result = await api.saveMemory({
        ...classification,
        rawContext,
        sourceApp: rawContext.sourceApp,
        windowTitle: rawContext.windowTitle,
        url: rawContext.url,
        screenshot: rawContext.screenshot,
        createdAt: rawContext.timestamp
      });
      if (result?.discarded) {
        showToast("Sensitive memory discarded.");
        return;
      }
      await loadMemories();
      showToast("Memory saved.");
    } catch (error) {
      showToast(error.message || "Capture failed. Check macOS permissions and API key.");
    }
  }

  if (isFloating) {
    return <FloatingBar />;
  }

  if (checking) return <div className="center-screen">Loading ContextVault...</div>;

  if (!hasKey) {
    return (
      <>
        <KeyEntry
          onReady={async () => {
            setHasKey(true);
            await loadMemories();
          }}
          showToast={showToast}
        />
        {toast ? <div className="toast">{toast}</div> : null}
      </>
    );
  }

  if (view === "contextPack") {
    return (
      <>
        <ContextPack
          memories={selectedMemories.length ? selectedMemories : memories.slice(0, 10)}
          onBack={() => setView("dashboard")}
          showToast={showToast}
          onSaved={loadMemories}
        />
        {toast ? <div className="toast">{toast}</div> : null}
      </>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Tab Navigation */}
      <nav className="flex shrink-0 items-center gap-1 border-b border-vault-line bg-vault-bg px-6 pt-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
              activeTab === tab.id
                ? "border-b-2 border-vault-accent bg-vault-panel text-vault-text"
                : "text-vault-muted hover:text-vault-text"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}

        <div className="flex-1" />

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle theme"
          className="h-8 w-8 rounded-md border border-vault-line text-vault-muted"
        >
          {theme === "dark" ? "☀" : "🌙"}
        </button>
      </nav>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "memories" && (
          <Dashboard
            memories={memories}
            setMemories={setMemories}
            loadMemories={loadMemories}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            onCapture={captureAndSave}
            onContextPack={() => setView("contextPack")}
            showToast={showToast}
            theme={theme}
            setTheme={setTheme}
          />
        )}
        {activeTab === "assistant" && <Assistant />}
        {activeTab === "context" && <ContextLibrary showToast={showToast} />}
      </div>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
