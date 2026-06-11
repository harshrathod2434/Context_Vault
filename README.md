# 🧠 ContextVault

> **Your AI-powered desktop memory** — Automatically captures, classifies, and summarizes everything you work on. Paste rich context into ChatGPT/Claude/Gemini without explaining from scratch.

ContextVault is a macOS desktop app that runs in the background, capturing screenshots, clipboard text, selected text, browser URLs, and active app info every 30 seconds. It uses **Groq AI** to classify and summarize your work, building a searchable memory vault you can query anytime.

---

## ✨ Features

### 🔄 Continuous Auto-Capture
- **Screenshots** every 30 seconds with OCR text extraction (Tesseract.js)
- **Clipboard monitoring** — every Cmd+C is captured in real-time
- **Selected text tracking** — highlighted text captured via macOS Accessibility API
- **Browser URL detection** — tracks active tab URLs from Chrome, Safari, Arc, Brave, Edge, Opera, Vivaldi
- **Active app & window title** detection via AppleScript

### 📋 Session-Based Memory Grouping
- **Start → Stop = One Memory** — each capture session creates a parent memory with all sub-captures grouped
- **Floating control bar** — compact, transparent, always-on-top window with Start/Pause/Resume/Stop/Close controls
- **Capture Timeline** — view all individual captures within a session chronologically

### 🤖 AI-Powered Classification (Groq)
- Every capture is classified with: title, summary, type, intent, topic, tags, sensitivity, usefulness score
- **First-person summaries** — written as "I am building..." not "the user is trying to..."
- **Sensitive data protection** — auto-detects passwords, API keys, tokens and flags as high sensitivity

### 💬 AI Assistant
- **Chat with your memories** — ask questions like "What did I do last Monday?" or "What websites was I researching?"
- AI searches your memory database and answers with specific details, dates, and app references
- Natural conversation interface with message history

### 📋 Context Generation
- **Generate AI Summary** — creates a comprehensive, detailed first-person context (250+ words) ready to paste into any AI assistant
- **Context Pack** — manually select memories and generate a structured context with: What I'm Working On, Relevant Background, Recent Context, Important Decisions, Suggested Next Steps, and a ready-to-paste AI Prompt (300+ words)
- **Context Library** — all generated contexts saved in a dedicated section with copy/delete functionality

### 🎨 Modern UI
- Dark/Light theme toggle
- Three-tab navigation: Memories | Assistant | Context
- Memory cards with type badges, tags, source app, and sensitivity indicators
- Search, filter by type/sensitivity/tag
- Inline editing of memory title, summary, and tags

---

## 🏗️ Architecture

```
ContextVault/
├── main/                          # Electron main process
│   ├── index.js                   # App entry, window management, shortcuts
│   ├── captureContext.js          # Screenshot, OCR, active window, browser URL
│   ├── clipboardWatcher.js        # Clipboard + selected text monitoring
│   ├── autoCaptureManager.js      # 30s timer, session lifecycle, parent memory creation
│   ├── groqService.js             # Groq API: classify, summarize, chat, context pack
│   ├── db.js                      # SQLite (better-sqlite3): memories + contexts tables
│   ├── ipcHandlers.js             # IPC bridge between main ↔ renderer
│   └── preload.js                 # Secure API exposed to renderer
├── renderer/                      # React frontend (Vite)
│   ├── App.jsx                    # Tab navigation, app shell
│   ├── pages/
│   │   ├── Dashboard.jsx          # Memory cards grid, search, filters
│   │   ├── MemoryDetail.jsx       # Memory viewer/editor with session timeline
│   │   ├── Assistant.jsx          # AI chat interface
│   │   ├── ContextLibrary.jsx     # Generated contexts section
│   │   ├── ContextPack.jsx        # Manual context pack generator
│   │   └── KeyEntry.jsx           # Groq API key setup
│   ├── components/
│   │   └── FloatingBar.jsx        # Compact floating capture controls
│   └── styles.css                 # Design system (CSS variables + Tailwind)
├── index.html                     # Vite entry
├── package.json
├── tailwind.config.js
├── vite.config.js
└── entitlements.mac.plist         # macOS permissions
```

---

## 🚀 Getting Started

### Prerequisites
- **macOS** (required for AppleScript-based window/URL detection)
- **Node.js** ≥ 18
- **Groq API Key** — [Get one free at groq.com](https://console.groq.com)

### Installation

```bash
# Clone the repo
git clone https://github.com/harshrathod2434/Context_Vault.git
cd Context_Vault

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### First Run
1. The app opens and asks for your **Groq API key**
2. Paste your key and click **Validate & Save**
3. Click **Capture Now** or press `Cmd+Shift+Space` to start

### macOS Permissions
The app will request these permissions on first use:
- **Screen Recording** — for screenshots
- **Accessibility** — for selected text detection and active window info
- **Automation** — for browser URL detection (Chrome, Safari, etc.)

Grant these in **System Settings → Privacy & Security**.

---

## 🎮 Usage

### Quick Capture
- Click **Capture Now** in the dashboard — takes a one-time screenshot + classification

### Continuous Capture Session
1. Click **Capture Now** → starts auto-capture every 30s + opens floating bar
2. **Floating bar controls**: 📸 Capture | ⏸ Pause | ▶ Resume | ⏹ Stop | 📋 Summary | ✕ Close
3. While running: screenshots every 30s, clipboard monitored every 1.5s, selected text every 2s
4. Click **📋** on floating bar → generates AI summary → **auto-copied to clipboard** → paste into ChatGPT
5. Click **⏹ Stop** → session ends, parent memory created grouping all sub-captures

### AI Assistant
1. Switch to the **💬 Assistant** tab
2. Ask questions like:
   - "What did I do last Monday?"
   - "What websites was I on today?"
   - "Summarize my work this week"
   - "What project was I working on in Chrome?"

### Context Generation
- **During session**: Click 📋 on floating bar → detailed summary copied to clipboard
- **After session**: Open session memory → click **📋 Generate AI Summary**
- **Manual curation**: Select memories → **Generate Context Pack** → get structured context
- All generated contexts are saved in the **📋 Context** tab

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+Space` | Quick capture + show floating bar |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Electron** | Desktop app framework |
| **React 18** | UI components |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Styling |
| **better-sqlite3** | Local database |
| **Groq API** (Llama) | AI classification, summarization, chat |
| **Tesseract.js** | OCR text extraction from screenshots |
| **screenshot-desktop** | Screen capture |
| **AppleScript** | Active window, browser URL, selected text |

---

## 📦 Building for Production

```bash
# Build the app
npm run build

# Output: dist/ContextVault-*.dmg
```

---

## 🔒 Privacy & Security

- **100% local storage** — all data stored in a local SQLite database (`db/contextvault.db`)
- **No cloud sync** — memories never leave your machine (except Groq API calls for classification)
- **Sensitive data detection** — auto-flags passwords, API keys, tokens, SSNs, financial data
- **Auto-discard** — option to automatically discard high-sensitivity captures
- **Your API key** — stored locally, never transmitted to any server except Groq

---

## 📝 License

MIT

---

## 🙏 Acknowledgments

- [Groq](https://groq.com) — Ultra-fast AI inference
- [Tesseract.js](https://tesseract.projectnaptha.com/) — OCR engine
- [Electron](https://www.electronjs.org/) — Desktop app framework
