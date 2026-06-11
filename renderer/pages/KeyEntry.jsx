import { useState } from "react";

const api = window.contextVault;

export default function KeyEntry({ onReady, showToast }) {
  const [key, setKey] = useState("");
  const [testing, setTesting] = useState(false);

  async function testConnection() {
    if (!key.trim()) {
      showToast("Paste your Groq API key first.");
      return;
    }
    setTesting(true);
    try {
      const ok = await api.testApiKey(key.trim());
      if (!ok) {
        showToast("Groq connection failed.");
        return;
      }
      await api.setApiKey(key.trim());
      showToast("Connection verified.");
      onReady();
    } finally {
      setTesting(false);
    }
  }

  return (
    <main className="min-h-screen bg-vault-bg text-vault-text">
      <section className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.18em] text-vault-muted">Desktop Context Memory</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal">ContextVault</h1>
          <p className="mt-4 text-vault-muted">
            Enter your Groq API key for this session. The key stays in main-process memory only and is forgotten when the app closes.
          </p>
        </div>

        <div className="rounded-lg border border-vault-line bg-vault-panel p-5 shadow-glow">
          <label className="text-sm font-medium text-vault-muted" htmlFor="api-key">
            Groq API key
          </label>
          <input
            id="api-key"
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && testConnection()}
            className="mt-2 w-full rounded-md border border-vault-line bg-vault-input px-3 py-3 text-vault-text outline-none transition focus:border-vault-accent"
            placeholder="gsk_..."
          />
          <button
            onClick={testConnection}
            disabled={testing}
            className="mt-4 w-full rounded-md bg-vault-accent px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {testing ? "Testing Connection..." : "Test Connection"}
          </button>
        </div>
      </section>
    </main>
  );
}
