# Patrak
**Blueprint: ADO Calendar-Based Work Logger**

---

## 1. Overview

A productivity tool to help software engineers and technical professionals track work in real-time, using a calendar-based interface. It integrates with Azure DevOps (ADO) and allows users to log time against tasks, bugs, and transversal activities efficiently, even when tasks aren't yet created.

This tool aims to reduce friction in time logging, ensure compliance with area path and job order constraints, and streamline weekly reporting.

Additionally, by making ADO updates a prerequisite for seamless time logging, the application subtly reinforces good work item hygiene. This nudges users toward better ADO board and sprint management, making the overall development process more transparent and accurate—benefiting the entire team.

---

## 2. Goals

* Enable easy real-time or retroactive work tracking via a calendar UI.
* Support linking calendar entries to ADO work items through drag-and-drop.
* Provide smart filtering of work items (e.g., only those the user interacted with).
* Allow delayed syncing with ADO, enabling draft time logs.
* Support required ADO metadata (area path, job order, task ID).
* Offline-first capability, syncing when online.
* Encourage correct ADO updates as a side-effect of streamlined time logging.

---

## 3. Key Features

### 3.1 Calendar Interface

* Week and day views
* Time blocks: configurable (default 15 mins)
* Add notes per block (e.g., "Reviewed PR for billing service")
* Entry status: draft, linked, submitted
* Drag on calendar to create "shell" work blocks
* Suggested work item overlay when a block is created
* Prevent overlapping blocks to discourage multitasking

### 3.2 ADO Work Item Panel

* Scrollable list of work items pinned at top of the app window
* Search box and type filter to narrow visible items
* Toggle visibility by clicking on "Features" or filter tags
* Work items scored and sorted by a blend of:

  * Interaction intensity (commenting, assignment, commits, updates)
  * Recency of activity
* Drag work item into a calendar block to link
* Clicking a work item auto-fills selected block (if one is active)
* Quick filter tags (e.g., #Today, #RecentCommits, #AssignedToMe) to narrow visible list

### 3.3 Local Draft Storage

* All entries stored locally (JSON or SQLite)
* Entries can be updated later (e.g., when task is created)
* Draft logs are persistent between sessions

### 3.4 Azure DevOps Integration

* Personal Access Token (PAT) authentication
* Read work items and area paths
* Work items are cached locally; refresh only fetches updates since the last sync
* Write time logs to tasks, bugs, and transversal activities (PATCH work item updates with time + comment)
* Read-only enforcement on already-submitted blocks
* `getWorkItemsByIds(ids)` helper fetches a specific list of items by ID
* Settings allow listing work item IDs per project; listed projects fetch only those items

### 3.5 Sync & Review

* Weekly summary panel
* Displays total hours for the current week with red text when exceeding 40 hours
* Bulk submit to ADO with preview
* Option to export week as CSV for backup
* DevOps Review panel (disabled by default) highlights missing acceptance criteria and story points and requires relations API; enable it under settings

### 3.6 Advanced Suggestions (Optional Phase 2)

* NLP-based task suggestions for each block
* Heuristics from commit history or local repo activity

### 3.7 Visual Analytics (Optional Phase 2)

* Area path/job order heatmap
* Weekly utilization graph
* Compare actual vs expected allocations

### 3.8 Usability Enhancements

* Quick filter tags to improve task list navigation
* Reminder nudges when no entries are logged for the day
* Status icons in calendar blocks (e.g., 🕒 draft, 🔗 linked, ✅ submitted)
* Reuse previous week's structure for recurring patterns
* Hover tooltip for blocks showing title, linked task, time spent, and sync status
* Editable area path/job order hints for numeric values (e.g., "1234 → Billing team Q2")
* Hover highlight with delete icon to remove a block after confirmation

---

## 4. User Flow

### 4.1 Logging Work

1. User opens app at start of day.
2. Scrolls top task list or clicks feature tags to filter.
3. Drags on calendar to create a shell block.
4. System suggests work items; user confirms or drags a task manually.
5. User can click a task to auto-link it to selected time block.
6. Notes appear as draggable comment pills that can be dropped into work blocks
   or onto the todo bar. Right-click a note to instantly turn it into a task.
   Star a note to keep it available after dropping.

### 4.2 Review & Submit

1. End of week, open Review Panel.
2. Confirm matches for each block.
3. A Review Week modal lists draft and linked blocks. Select any to mark as submitted before work items open.
4. Submit all logs to ADO in batch.

### 4.3 Sync & Auth

* PAT stored securely using `keytar` in Electron. In the browser the token is
  kept in session storage only and never written to disk.
* ADO sync fetches latest work items nightly or on-demand

---

## 5. Architecture

**Frontend**:

* Electron + React for cross-platform desktop experience
* Tailwind CSS for layout and styling
* `react-big-calendar` for calendar grid and interactions

**Backend/Logic**:

* Node.js (Electron main process)
* Fetch-based ADO API integration with PAT stored securely
* JSON file-based storage with option to switch to SQLite (`better-sqlite3`)
  * Files are saved under Electron's `userData` directory so calendar entries
    and settings survive application reinstalls

**Security**:

* PAT stored securely via `keytar`
* No external cloud storage
* Local-only execution unless user opts into sync

**Architecture Pattern**:

* Component-based React UI with hooks
* Context or Redux (optional) for state
* Interfaces abstracted to allow backend logic swap (e.g., `IAdoService`, `IDataStore`, `ICalendarStrategy`)

**Folder Structure Recommendation**:

* `src/components/` → CalendarGrid, TaskList, ReviewPanel
* `src/services/` → adoService.js, storageService.js
* `src/models/` → workBlock.js, workItem.js
* `src/hooks/` → useWorkBlocks, useAdoItems
* `src/main/` → Electron main process entry

---

## 6. Milestones

### Phase 1 – MVP

* Calendar UI (drag to create blocks)
* Work item panel with search and type filters
* Color-coded work items by type (tasks yellow, user stories blue, bugs red, features purple)
* Local draft store (JSON file or SQLite)
* Manual ADO linking + batch submit

### Phase 2 – Enhancements

* Auto-suggestions via NLP
* Heatmap and analytics
* Smart time detection from commit or window focus
* Optional Outlook calendar event import overlay (via Graph API)

### Phase 3 – Org Deployment

* Multi-user support
* Org-wide work item filters
* Integration with Teams/Outlook calendar

---

## 7. Potential Challenges

* Electron packaging and updates
* Secure and persistent PAT handling
* Mapping correct area path/job order dynamically
* Keeping sync conflict-free when multiple updates occur

---

## 8. Naming Ideas

* ChronoTrack
* DevSync Calendar
* ADO Logger
* SprintSlate
* WorkNest

---

## 9. License & Distribution

* Internal company tool or open-source
* Distributed as cross-platform Electron package (MSI/EXE/macOS installer)

---

## 10. Next Steps

* Scaffold Electron + React project
* Set up calendar grid and time block model
* Connect to ADO API with manual PAT test
* Implement secure PAT storage with `keytar`
* Create local storage service (JSON-based)

---

## 11. Build Plan

### Step-by-step Startup

1. **Project Setup**

   * Create project: Electron + React + Tailwind scaffold
   * Add folder structure: components, services, models, main process

2. **Authentication Layer**

  * `adoService.js`: handles API calls with PAT
  * `keytar`: store and retrieve PAT securely
  * Settings screen to input/test PAT

3. **Local Storage**

   * `storageService.js`: read/write JSON or SQLite
   * Store: `workBlocks`, `workItemCache`
   * Cache tracks the last fetch time so only updated work items are requested

4. **Calendar UI**

   * Implement weekly grid with `react-big-calendar`
   * Drag to create time blocks
   * Editable notes per block

5. **Work Item Panel**

   * Fetch ADO items based on recent user activity
   * Render list with drag support
   * Drop onto block to link task

6. **Review & Sync**

   * Weekly panel showing unsubmitted blocks
   * Submit work logs to ADO via REST API

7. **Optional Early Touches**

   * Tooltips and block styling
   * Area path hint system
   * Theme and tag filter presets

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
   This will also build the native `keytar` module used for secure PAT storage.
   A postinstall script runs `electron-builder install-app-deps` to ensure
   native modules like `keytar` are rebuilt for the Electron version.
2. Start the application:
   ```bash
   npm start
   ```
  This will launch both the React dev server and the Electron shell.
  When Electron starts with `contextIsolation` enabled, native modules
  like `keytar` must be used from the main process. The main process
  exposes IPC handlers and the preload script forwards calls:

  ```javascript
  // src/main/main.js
  const { ipcMain } = require('electron');
  const keytar = require('keytar');
  ipcMain.handle('keytar:get', (_e, service, account) =>
    keytar.getPassword(service, account)
  );
  ipcMain.handle('keytar:set', (_e, service, account, password) =>
    password
      ? keytar.setPassword(service, account, password)
      : keytar.deletePassword(service, account)
  );
  ipcMain.handle('keytar:delete', (_e, service, account) =>
    keytar.deletePassword(service, account)
  );

  // src/main/preload.js
  const { contextBridge, ipcRenderer } = require('electron');
  contextBridge.exposeInMainWorld('api', {
    getPassword: (service, account) =>
      ipcRenderer.invoke('keytar:get', service, account),
    setPassword: (service, account, password) =>
      ipcRenderer.invoke('keytar:set', service, account, password),
    deletePassword: (service, account) =>
      ipcRenderer.invoke('keytar:delete', service, account),
  });
  ```

  Use `window.api` in the React code to save or retrieve your PAT so
  `keytar` continues to work when context isolation is enabled.

3. Build and package the application:
   ```bash
   npm run electron-pack
   ```
This command first builds the React app and then packages the Electron application.

### Scheduling Work Items

Only **Tasks** and **Bugs/Transversal Activities** can be scheduled directly on the calendar. Items like **Features** and **User Stories** act as containers and must have child tasks created before you can plan them. Work items are color coded by type (e.g., yellow for tasks, red for bugs, purple for features) so you can quickly distinguish them. This restriction keeps effort reporting aligned at the task level in ADO.

Test Case and Test Suite work items are ignored and will not appear in the work item list.


## License

This project is proprietary. See the [LICENSE](LICENSE) file for usage terms.

4. Run the unit tests:
   ```bash
   npm test
   ```
   Executes the Jest test suite.

