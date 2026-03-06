# OmTeDoen — Developer Context

> **OmTeDoen** (Afrikaans for "to do") is an ADHD-friendly desktop task manager built with **Tauri v2 + SvelteKit + Svelte 5**. It runs natively on macOS (Apple Silicon) and stores data locally in SQLite.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop shell | Tauri | 2.10.3 |
| Frontend framework | SvelteKit | 2.x |
| UI framework | Svelte | 5.x (runes mode: `$state`, `$derived`, `$props`) |
| Build tool | Vite | 5.4.x |
| Language | TypeScript | 5.x |
| Database | SQLite | via `tauri-plugin-sql` |
| Styling | Vanilla CSS (scoped + global variables) |
| Drag & Drop | `svelte-dnd-action` 0.9.x |
| IDs | `ulidx` (ULID generation) |
| Rust backend | Minimal — just plugin registration |

---

## Project Structure

```
omtedoen/
├── src/                          # Frontend (SvelteKit)
│   ├── app.css                   # Global CSS variables, resets, utilities
│   ├── app.html                  # HTML shell
│   ├── routes/
│   │   ├── +layout.svelte        # Root layout — sidebar, view routing, keyboard shortcuts
│   │   ├── +layout.ts            # SSR disabled (static adapter)
│   │   └── +page.svelte          # Empty page (layout does all rendering)
│   ├── lib/
│   │   ├── components/           # UI components (11 Svelte files)
│   │   ├── core/                 # Business logic (pure functions, no side effects)
│   │   ├── stores/               # Reactive state management (Svelte 5 runes)
│   │   ├── storage/              # Data persistence layer (SQLite, memory)
│   │   ├── platform/             # Platform abstraction (Tauri vs web)
│   │   ├── sync/                 # iCloud sync engine (WIP)
│   │   └── utils/                # Date helpers
│   └── tests/                    # Vitest unit tests
├── src-tauri/                    # Rust backend (Tauri)
│   ├── Cargo.toml                # Rust dependencies
│   ├── tauri.conf.json           # Window config, bundle settings
│   ├── src/                      # Rust source (main.rs, lib.rs)
│   ├── capabilities/             # Tauri permissions
│   └── icons/                    # App icons
├── package.json
├── svelte.config.js              # Uses @sveltejs/adapter-static
├── vite.config.ts
└── vitest.config.ts
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  +layout.svelte                 │
│         (sidebar, view routing, shortcuts)       │
│                                                 │
│  ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │FocusView │ │MonthView │ │  SomedayView   │  │
│  │(3-day)   │ │(calendar)│ │  (lists)       │  │
│  └────┬─────┘ └────┬─────┘ └───────┬────────┘  │
│       │             │               │            │
│  ┌────┴─────────────┴───────────────┴────────┐  │
│  │              DayColumn.svelte             │  │
│  │  ┌─────────────┐  ┌──────────────────┐    │  │
│  │  │ TaskItem     │  │ TaskInput        │    │  │
│  │  │ (edit/done)  │  │ (add new task)   │    │  │
│  │  └─────────────┘  └──────────────────┘    │  │
│  └───────────────────────────────────────────┘  │
│                       │                          │
│  ┌────────────────────┴──────────────────────┐  │
│  │          stores/app.svelte.ts             │  │
│  │  (reactive state via Svelte 5 $state)     │  │
│  └────────────────────┬──────────────────────┘  │
│                       │                          │
│  ┌────────────────────┴──────────────────────┐  │
│  │           core/task-engine.ts             │  │
│  │  (rollover, parking, completion, recur)   │  │
│  └────────────────────┬──────────────────────┘  │
│                       │                          │
│  ┌────────────────────┴──────────────────────┐  │
│  │         storage/sqlite-store.ts           │  │
│  │     (SQLite via tauri-plugin-sql)         │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## Core Concepts

### Data Model (`core/types.ts`)

**Task** — The primary entity. Key fields:
- `id` — ULID string
- `title` — Task text (supports inline markdown: bold, italic, code, links)
- `dateTarget` — ISO date `YYYY-MM-DD` (null = someday/unscheduled)
- `listId` — FK to a `List` (null = date-scheduled)
- `priority` — `'must' | 'should' | 'want'`
- `parked` — Auto-parked if rolled over 3+ times
- `rolloverCount` — How many times this task has been rolled forward
- `recurrenceRule` — Natural language rule like `"every weekday"`, `"daily"`, `"weekly"`
- `steps` — Sub-task checklist (`TaskStep[]`)
- `fieldTimestamps` — Per-field timestamps for CRDT-style conflict resolution
- `deletedAt` — Soft deletion (never hard-deleted)

**List** — A named collection for "someday" tasks. Has a special `isParkingLot` flag for the built-in parking lot.

**Priority** — `'must'` (red), `'should'` (amber), `'want'` (cyan/teal)

### Task Engine (`core/task-engine.ts`)

Pure functions with no side effects:

| Function | Purpose |
|----------|---------|
| `rolloverTasks(tasks, today)` | Moves incomplete past tasks to today, increments `rolloverCount` |
| `parkStaleTasks(tasks, parkingLotId)` | Auto-parks tasks with `rolloverCount >= 3` |
| `completeTask(task, newId)` | Marks complete; creates next recurrence instance if applicable |
| `uncompleteTask(task)` | Reverses completion |
| `freshStart(tasks)` | Soft-deletes all incomplete tasks |
| `nextSortOrder(tasks)` | Appends to end of list |
| `sortOrderBetween(before, after)` | Fractional indexing for drag-drop |

### Recurrence (`core/recurrence.ts`)

- Lightweight regex-based parser — no external NLP dependencies
- Parses natural language: `"every day"`, `"every weekday"`, `"every monday"`, `"every 2 weeks"`, `"daily"`, `"weekly"`, `"monthly"`, `"yearly"`, `"annually"`
- Extracted from task title during creation (e.g., `"Buy milk every monday"` → title: `"Buy milk"`, rule: `"every monday"`)
- Tasks with recurrence are placed on the **next occurrence date** (not today)
- When a recurring task is completed, a new instance is automatically created for the next occurrence date

### Store (`stores/app.svelte.ts`)

- Single global store using **Svelte 5 runes** (`$state`, `$derived`)
- All state mutations go through exported async functions: `addTask()`, `updateTask()`, `toggleTask()`, `deleteTask()`, `moveTask()`, etc.
- On initialization: loads all data from SQLite, runs daily rollover, auto-parks stale tasks

### Storage Layer (`storage/`)

- `TodoStore` interface (`store.ts`) — abstract contract
- `SqliteStore` (`sqlite-store.ts`) — production implementation via `tauri-plugin-sql`
- `MemoryStore` (`memory-store.ts`) — in-memory fallback for dev/web (data lost on restart)
- `createStore()` returns `{ store, type }` — the `type` (`'sqlite' | 'memory'`) is tracked in the app store and shown in Settings so the user can see whether storage is persistent
- If SQLite initialization fails, the app logs a console error and falls back to memory store gracefully
- Auto-runs migrations on first launch
- Uses `INSERT OR REPLACE` for upserts

---

## UI Components

| Component | Description |
|-----------|-------------|
| `FocusView` | 3-day view (yesterday, today, tomorrow) — the default view |
| `MonthView` | Calendar month grid with task counts; clicking a day opens an inline popover to view/add/complete tasks |
| `SomedayView` | List-based views for "someday" tasks |
| `DayColumn` | A single day's column — shows tasks and an input at the bottom. Filters to must-only in Focus Mode |
| `TaskItem` | Individual task row — checkbox, priority dot, title, edit mode, delete |
| `TaskInput` | Text input for adding new tasks to a day/list |
| `ParkingLot` | Shows auto-parked tasks with option to unpark |
| `QuickCapture` | Modal overlay for rapid task capture (⌘+Shift+Space). Shows live recurrence preview and success feedback |
| `CommandPalette` | Spotlight-like command menu (⌘+K) |
| `SettingsView` | Settings page — Focus Mode toggle, storage indicator, JSON export/backup, Fresh Start |
| `SomedayList` | A single "someday" list card |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘+1` | Focus (3-day) view |
| `⌘+2` | Month view |
| `⌘+3` | Someday view |
| `⌘+K` | Command palette |
| `⌘+Shift+Space` | Quick capture |
| Hover + `1` | Set task priority to Must |
| Hover + `2` | Set task priority to Should |
| Hover + `3` | Set task priority to Want |

---

## Design System

### Colors (CSS Variables in `app.css`)

| Variable | Value | Purpose |
|----------|-------|---------|
| `--bg` | `#fdfbf7` | Cream background |
| `--bg-surface` | `rgba(255,255,255,0.85)` | Card/panel backgrounds |
| `--accent` | `#4f46e5` | Indigo accent |
| `--heading-green` | `#2d6a4f` | Forest green — headings and titles |
| `--heading-green-light` | `#52b788` | Light green — heading gradient end |
| `--priority-must` | `#ef4444` | Red — must-do tasks |
| `--priority-should` | `#f59e0b` | Amber — should-do tasks |
| `--priority-want` | `#06b6d4` | Cyan — want-to-do tasks |
| `--success` | `#10b981` | Green — completed tasks |
| `--parking` | `#a855f7` | Purple — parked tasks |

### Typography
- Primary: `Plus Jakarta Sans` (Google Fonts)
- Monospace: `JetBrains Mono`

### Focus Mode
A toggle available from the main toolbar (and in Settings):
- Filters task lists to only show **must** priority tasks (completed tasks of any priority remain visible)
- Hides the month navigation and someday sidebar for reduced cognitive load
- **Keeps the normal light colour scheme** — no dark theme switch
- Activated via the `.focus-mode` CSS class on the root `.app` element
- Persisted to SQLite via the `focusMode` setting key

---

## Development

### Prerequisites

- Node.js 18+
- Rust (stable, 1.77.2+)
- Tauri CLI (`npm run tauri`)

### Commands

```bash
# Development (hot-reload)
npm run tauri dev

# Type checking
npm run check

# Unit tests
npm run test

# Production build (DMG)
CARGO_TARGET_DIR=/tmp/omtedoen-target npm run tauri build
```

> **⚠️ Important:** If your project is inside `~/Documents/` (iCloud-synced), you **must** set `CARGO_TARGET_DIR` to a non-iCloud path (e.g., `/tmp/omtedoen-target`) or the Cargo build will fail with filesystem timeouts. iCloud tries to sync thousands of compiled artifacts and chokes.

### Build Output

DMG is generated at: `$CARGO_TARGET_DIR/release/bundle/dmg/OmTeDoen_<version>_aarch64.dmg`

---

## Data Persistence

- Database: SQLite file managed by `tauri-plugin-sql`
- Location: Tauri's app data directory (`~/Library/Application Support/com.omtedoen.todo/` on macOS)
- **The database persists across app updates** as long as the bundle identifier (`com.omtedoen.todo` in `tauri.conf.json`) stays the same
- Tasks are **soft-deleted** (set `deletedAt`, never removed from DB)
- All timestamps are ISO 8601 strings
- `fieldTimestamps` tracks per-field modification times (for future CRDT sync)
- Steps are stored as JSON string in a single column
- **Export/Backup**: Users can download all tasks as JSON from Settings → Export Backup
- The Settings view shows a storage indicator ("Persistent" for SQLite, "Temporary" for memory fallback)

---

## Sync Architecture (WIP)

The `sync/` directory contains scaffolding for iCloud-based sync:
- `sync-engine.ts` — Core sync logic
- `orchestrator.ts` — Scheduling and coordination
- `icloud-adapter.ts` — iCloud file read/write

**Status:** Not yet functional. The `fieldTimestamps` on Tasks and Lists are designed for last-writer-wins CRDT merge resolution (implemented in `core/merge.ts`).

---

## Known Issues & Gotchas

1. **iCloud build timeouts** — See Development section above. Always use `CARGO_TARGET_DIR=/tmp/...` if project is in a synced folder.
2. **Accessibility warnings** — Several `a11y` warnings exist in `svelte-check` (non-interactive tabindex, missing key handlers on click events, missing aria labels). These are pre-existing and non-blocking.
3. **Disk space** — Release builds need several GB. Monitor disk usage if space is tight.
4. **Focus outlines** — All native browser focus rings are globally suppressed in `app.css` for a clean UI. Custom focus indicators should be added for accessibility if needed.
5. **Drag-and-drop** — Uses `svelte-dnd-action`. Elements that should NOT be draggable must have `data-no-dnd="true"`.

---

## Feature Ideas / TODO

- [ ] iCloud sync (scaffolding exists in `sync/`)
- [ ] Native notifications / reminders
- [ ] Task notes (markdown body — field exists, UI not implemented)
- [ ] Drag tasks between days in Focus views
- [ ] Search across all tasks
- [ ] Keyboard-only task navigation
- [ ] Import from JSON backup
- [ ] Multiple theme options
- [ ] Widget / menu bar quick-add
