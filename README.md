# 🧠 OmTeDoen

> An ADHD-friendly task manager that thinks the way you do.

**OmTeDoen** (Afrikaans for *"to do"*) is a native macOS desktop app designed to reduce decision fatigue and keep your focus where it matters — on today.

---

## ✨ Features

### 🎯 Focus-First Design
- **3-Day View** — See yesterday, today, and tomorrow at a glance. No overwhelming backlogs.
- **Auto-Rollover** — Incomplete tasks automatically move to today. No manual shuffling.
- **Auto-Parking** — Tasks rolled over 3+ times get parked aside so they stop clogging your day.

### ⚡ Speed & Simplicity
- **Single-click editing** — Click any task to edit it inline.
- **Quick Capture** (`⌘+Shift+Space`) — Instantly add a task without leaving what you're doing.
- **Command Palette** (`⌘+K`) — Navigate and act with just your keyboard.
- **Priority with hover** — Hover over a task and press `1`, `2`, or `3` to set priority.

### 🔄 Smart Recurrence
- Natural language scheduling: *"Buy milk every monday"*, *"Stand-up daily"*, *"Review goals every 2 weeks"*
- Automatically creates the next instance when you complete one.

### 🧘 Low Energy Mode
- A calming monochromatic dark theme for when everything feels like too much.
- Strips the UI to the bare essentials — just today's tasks.

### 📋 Multiple Views
| View | Shortcut | Description |
|------|----------|-------------|
| Focus | `⌘+1` | Yesterday · Today · Tomorrow |
| Week | `⌘+2` | Full 7-day view with navigation |
| Someday | `⌘+3` | Custom lists for future ideas |

### 🏷️ Priority System
- 🔴 **Must** — Non-negotiable tasks
- 🟡 **Should** — Important but flexible
- 🔵 **Want** — Nice-to-have

---

## 📸 Screenshots

*Coming soon*

---

## 🛠 Tech Stack

| | Technology |
|---|-----------|
| 🖥 Desktop | [Tauri v2](https://tauri.app) |
| ⚡ Frontend | [SvelteKit](https://kit.svelte.dev) + [Svelte 5](https://svelte.dev) |
| 💾 Database | SQLite (via `tauri-plugin-sql`) |
| 🎨 Styling | Vanilla CSS with design tokens |
| 🦀 Backend | Rust (minimal — plugin registration) |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Rust](https://rustup.rs) (stable)
- macOS (Apple Silicon or Intel)

### Development

```bash
# Clone the repo
git clone https://github.com/yourusername/omtedoen.git
cd omtedoen

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Building

```bash
# Build a distributable .dmg
CARGO_TARGET_DIR=/tmp/omtedoen-target npm run tauri build
```

> **Note:** If your project folder is inside `~/Documents/` (iCloud-synced), set `CARGO_TARGET_DIR` to a non-synced path to avoid build timeouts.

The `.dmg` will be at `$CARGO_TARGET_DIR/release/bundle/dmg/OmTeDoen_<version>_aarch64.dmg`

---

## 📁 Project Structure

```
src/
├── lib/
│   ├── components/     # Svelte UI components
│   ├── core/           # Pure business logic (task engine, recurrence, types)
│   ├── stores/         # Reactive state (Svelte 5 runes)
│   ├── storage/        # SQLite persistence layer
│   ├── sync/           # iCloud sync (WIP)
│   └── utils/          # Date helpers
├── routes/             # SvelteKit routes
└── tests/              # Unit tests

src-tauri/              # Rust backend (Tauri shell)
```

For full architectural details, see [CONTEXT.md](./CONTEXT.md).

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘+1` / `⌘+2` / `⌘+3` | Switch views |
| `⌘+K` | Command palette |
| `⌘+Shift+Space` | Quick capture |
| Hover + `1` / `2` / `3` | Set priority (Must/Should/Want) |

---

## 🗺 Roadmap

- [ ] iCloud sync across devices
- [ ] Native notifications & reminders
- [ ] Task notes with rich markdown
- [ ] Search across all tasks
- [ ] Export / import
- [ ] Menu bar widget for quick-add

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTEXT.md](./CONTEXT.md) for architecture details and coding patterns before getting started.

---

## 📄 License

This project is currently unlicensed. Contact the author for usage terms.

---

<p align="center">
  <em>Built with ❤️ for brains that work differently.</em>
</p>
