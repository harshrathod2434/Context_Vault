import { useState, useRef, useEffect } from "react";

const api = window.contextVault;

export default function Assistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const query = input.trim();
    if (!query || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: query }]);
    setLoading(true);

    try {
      const result = await api.chatWithMemories(query);
      const reply = result.response || result.error || "No response.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", text: "Something went wrong." }]);
    }
    setLoading(false);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-vault-muted">
            <span className="text-4xl">🧠</span>
            <h2 className="text-lg font-semibold text-vault-text">Ask about your memories</h2>
            <p className="max-w-md text-sm">
              Try things like "What did I do last Monday?", "What websites was I on today?",
              or "Summarize my work this week"
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "rounded-br-md bg-vault-accent text-white"
                  : "rounded-bl-md border border-vault-line bg-vault-panel text-vault-text"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="mb-4 flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-vault-line bg-vault-panel px-4 py-3 text-sm text-vault-muted">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-vault-line bg-vault-bg px-6 py-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask about your memories..."
            className="flex-1 rounded-xl border border-vault-line bg-vault-panel px-4 py-3 text-sm outline-none focus:border-vault-accent"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-vault-accent px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
