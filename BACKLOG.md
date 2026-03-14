# OmTeDoen — Backlog


## Bugs

- [x] Fix popover being cut off in month view (far right and far left cells)
## Done

- [x] Quick Capture: parse natural language dates ("buy milk tomorrow", "meeting next friday") via chrono-node
- [x] Completed tasks sink to the bottom of each day column / list
- [x] Delete task by hovering and pressing Delete/Backspace key
- [x] Check for updates
- [x] Add new app logo & icon
- [x] Allow automatic updates (via GitHub Releases + tauri-plugin-updater)
- [x] Commit LICENSE file and add contribution details

## UX Improvements

- [ ] change placeholder text in capture bar to inform user of 'q' shortcut
- [ ] remove any references to using !must, !should !want in quick capture - they don't do anything at this stage. 
- [ ] remove 'add a task' text fields everywhere, as quick capture supercedes it 
- [x] Add keyboard shortcut for quick capture (press q)
- [x] Remove the title saying "Focus" and the redundant "Today" label
- [x] Rethink Quick Capture and NLP — currently NLP only runs in Quick Capture, not in day column inputs. Consider whether NLP should be more broadly available, how to make the parsing more transparent (e.g. better preview/feedback), and whether Quick Capture should support more advanced input (steps, priority, list assignment) in a single flow.
- [ ] Make settings button bigger (currently hard to hit in sidebar)
- [x] Add keyboard shortcut to move Someday items back to today
- [ ] Add 3-dot menu on cards with quick actions (move to tomorrow, move to someday, etc.) as an alternative to keyboard shortcuts
- [ ] Show counter/badge with number of completed tasks in the main view
## Design

- [ ] Fix the icon for the Someday tab in the sidebar. should resember a bucket or a basket or a container of some form.
- [ ] Fix the icon for the Calendar view. Use a typical calendar icon. 
- [ ] keep the Quick Capture bar visible when in calendar view
- [ ] find a better way  to go into Focus mode. The lightning button is too small and in the wrong place. 

## System


## Licence

