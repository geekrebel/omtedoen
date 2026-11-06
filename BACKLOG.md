# OmTeDoen — Backlog


## Bugs

- [x] Fix popover being cut off in month view (far right and far left cells)
- [x] 3-dot menu on cards is obscured by the card's bounding box (fixed: removed `overflow: hidden` clipping on `.task-item`; Trello-style card flip still open as a future enhancement)
- [x] Fix viewport when switching into focus mode (fixed: stale `.focus-col-yesterday/tomorrow` selectors renamed to `maybe/done`, content column now centered)
- [x] Kanban columns had unequal heights (Today box ended mid-panel)
- [x] Completing a task dated in the future made it vanish from all kanban columns
## Done

- [x] Quick Capture: parse natural language dates ("buy milk tomorrow", "meeting next friday") via chrono-node
- [x] Completed tasks sink to the bottom of each day column / list
- [x] Delete task by hovering and pressing Delete/Backspace key
- [x] Check for updates
- [x] Add new app logo & icon
- [x] Allow automatic updates (via GitHub Releases + tauri-plugin-updater)
- [x] Commit LICENSE file and add contribution details
- [x] Someday is now a Trello-style board: lists side by side, drag cards between lists, drag lists to reorder, rename inline. Cards added to Today stay on their list (Today chip), and deleting a list moves its cards to Someday instead of deleting them
- [x] Trash view with restore (deleted cards are no longer lost); Settings… in the app menu (⌘,)
- [x] 0.5.12 review fixes: Today reorder keeps order and rollover count; recurring tasks no longer duplicate or skip their first day; Quick Add ignores past dates and words like "sun"/"sat", reads 10/11 day-first; typing in Quick Add never hits a card; palette keys handled once and Fresh Start confirms; card shortcuts ignore ⌘/repeat; one ⋯ menu at a time (Escape closes); links in titles open in the browser (http/mailto only)

## UX Improvements

- [x] change placeholder text in capture bar to inform user of 'q' shortcut ("Add a task... (or press Q for full editor)")
- [ ] decide on !must / !should / !want in quick capture — they DO work (parsed in `app.svelte.ts`), so either document them properly or remove them
- [ ] remove 'add a task' text fields everywhere, as quick capture supercedes it (day columns done; still in Month view popover and Someday lists via `TaskInput`)
- [x] Add keyboard shortcut for quick capture (press q)
- [x] Remove the title saying "Focus" and the redundant "Today" label
- [x] Rethink Quick Capture and NLP — currently NLP only runs in Quick Capture, not in day column inputs. Consider whether NLP should be more broadly available, how to make the parsing more transparent (e.g. better preview/feedback), and whether Quick Capture should support more advanced input (steps, priority, list assignment) in a single flow.
- [ ] Make settings button bigger — bumped to 44px min-height (13 Mar), but still feels tiny (noted 16 Mar)
- [x] Add keyboard shortcut to move Someday items back to today
- [x] Add 3-dot menu on cards with quick actions (Move to Tomorrow / Today / Someday, Delete)
- [ ] Allow multiple cards to be selected (for bulk actions like move, delete, etc.)
- [ ] Add Gmail-style keyboard shortcuts: j/k to navigate up/down, x to select, # to delete, etc.
- [ ] Show counter/badge with number of completed tasks in the main view (Month view already shows per-day ✓ counts)
- [ ] make the purple dropdown arrow for the Parking Lot bigger!
## Design

- [x] Fix the icon for the Someday tab in the sidebar. should resember a bucket or a basket or a container of some form.
- [x] Fix the icon for the Calendar view. Use a typical calendar icon.
- [x] keep the Quick Capture bar visible when in calendar view
- [ ] find a better way  to go into Focus mode. The lightning button is too small and in the wrong place. (currently a "⚡ Focus" button in the quick-add bar, plus ⌘⇧F)

## System

- [ ] Build a way to test that UX is working as intended (e.g. end-to-end/integration tests for UI flows) — only unit tests so far (task engine, merge, recurrence, date parser)


## Licence

