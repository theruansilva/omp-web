# OMP Web — Frontend Feature Inventory

This document details all current frontend features, components, and capabilities implemented in `omp-web`.

---

## 1. App Shell & Layout Structure
- **3-Column Responsive Desktop Layout**:
  - Left Column: Navigation Sidebar (Machines, Projects, Workspaces, Sessions).
  - Center Column: Main Header Bar, Chat Stream View, and Floating Prompt Editor.
  - Right Column: Workspace Tools Panel (Files, Git Diffs, Terminals, Tasks).
- **Resizable Side Panels**: Interactive panel edge handles allowing users to drag and resize both left and right sidebars dynamically.
- **Mobile Responsive Mode**: Bottom navigation tabs (`AppMobileMainTabs`), drawer views, and responsive breakpoint adaptations for mobile/touch viewports.
- **PWA Capabilities**: Installable Web App configuration (`manifest.webmanifest`, theme colors, offline assets).
- **Global Command Palette / Action Palette (Cmd+K / Ctrl+K)**: Quick search and execution of all app commands (theme selection, project switching, machine management, settings).
- **Keyboard Shortcut Manager**: Custom shortcut binding map with user override support.

---

## 2. Multi-Machine & Gateway Management
- **Machine Connection Manager**: Connect to local gateway or remote `omp-web` instances via `MachineDialog`.
- **Bearer Token Auth**: Support for optional Bearer token authentication when connecting to remote instances.
- **Real-Time Machine Health Monitoring**: Periodic health checks with visual status badges (`online`, `stale`, `offline`, `unknown`).
- **Remote RPC Proxying**: Gateway proxies API calls and WebSocket connections to selected remote machines transparently.

---

## 3. Projects & Workspaces System
- **Project Directory Manager**: Register local or remote repository folders (`ProjectDialog`, `ProjectList`).
- **Git Worktree & Branch Workspaces**: Automatic discovery and management of Git worktrees and branch workspaces (`WorkspaceList`).
- **Workspace Navigation & Selection**: Single-click switching between active workspaces with persistent route restoration.
- **Path Access Restrictions**: Configurable allowlist for file system access outside workspace roots.

---

## 4. Session Daemon Integration & Chat System
- **Real-Time Streaming Chat**: Direct WebSocket connection to `omp-web-sessiond` (Pi Coding Agent session daemon).
- **Session Lifecycle Operations**: Create new chat sessions, restore past sessions, archive sessions, delete archived sessions, and reload session state.
- **Session Cleanup & Bulk Operations**: Dialog (`SessionCleanupDialog`) to preview and execute bulk cleanup of idle or archived sessions.
- **Multi-Part Message Rendering**:
  - Markdown text rendering with syntax highlighting via CodeMirror / Prism (`FormattedText`).
  - LaTeX / Math expression rendering (`$`, `$$`).
  - Raw output view toggle.
  - Inline image attachment display.
- **Interactive Tool Execution Cards (`ToolExecutionView`)**:
  - Live collapsible callout cards for agent tools (`bash`, `read`, `write`, `edit`, `ast_edit`, `skill`, etc.).
  - Real-time stdout/stderr streaming during tool invocation.
  - Status indicators (`running`, `success`, `error`).
- **Thinking Level Gauge & Selection**: Support for model thinking budgets (none, low, med, high) with real-time thinking gauge display.
- **Session Activity Dock**: Bottom activity bar indicating active streaming, compaction, pending message queue count, and server status.
- **Subsession & Parent-Child Trees**: Support for parent session linking and subsession branching.

---

## 5. Prompt Editor & Composer
- **CodeMirror 6 Markdown Input**: Rich input field with auto-height adjustment, placeholder text, and markdown syntax highlighting.
- **Slash Commands & Autocomplete**: Autocomplete dropdown menu (`AutocompleteMenu`) triggered by `/` (slash commands), `@` (file paths), or `#` symbols.
- **Image & File Attachments**: Attach images or files with delivery mode selection (`base64` payload or workspace path reference).
- **Shell Mode**: Toggle direct execution mode to execute shell commands directly in the session environment.
- **Steer & Stop Controls**: Real-time steering input during stream generation, and immediate execution stop control.
- **Model Selector & Thinking Dialogs**: In-place model selection and thinking parameter configuration.

---

## 6. Workspace Tools Panel
- **File Explorer & Editor (`WorkspaceFilesPanel`)**:
  - Interactive workspace directory tree with expand/collapse states.
  - File content viewer and editor (`CodeViewer`) with save capability.
  - Image file previewer with checkerboard background.
  - Drag-and-drop workspace file upload with default upload folder configuration.
  - File move, rename, and deletion operations.
- **Git & Diff Inspector**:
  - Real-time Git status display (modified, staged, untracked files).
  - Side-by-side or unified diff viewer (`UnifiedDiffViewer`) for working tree changes.
- **Interactive Terminal Panel (`TerminalPanel`)**:
  - Full xterm.js terminal emulator integrated with backend PTY processes over WebSockets.
  - Multi-tab terminal instance management.
  - Touch/Mobile soft keys bar (`TerminalSoftKeys`) for terminal navigation control.
- **Scheduled Tasks Panel (`WorkspaceTasksPanel`)**:
  - Scheduled prompt management interface for automated session triggers.
  - Cron schedule expression parser and next-run calculator.
  - Execution history logs and manual trigger buttons.

---

## 7. Plugin & Extension System
- **Plugin Registry Engine (`OmpWebPluginService`)**:
  - Plugin discovery across bundled, user (`~/.omp-web/plugins`), local, and project scopes (`.omp-web/plugins`).
  - Dynamic module loading and contribution registration.
- **Plugin Settings Panel (`SettingsPluginsPanel`)**: Enable/disable individual browser plugins per machine.
- **Pi Package Manager Integration (`SettingsPackagesPanel`)**:
  - Interface to install, update, and remove Pi packages (`npm:`, `git:`, or local paths).
  - User vs Project scope package filtering and permission warnings.

---

## 8. Settings, Themes & Customization
- **Tabbed Settings Dialog (`SettingsDialog`)**:
  - **General**: Web server host, port, allowed hosts, workspace upload default folder.
  - **Session Daemon**: Session daemon startup flags, subsession settings.
  - **Pi Packages**: Package management and update controls.
  - **OMP Plugins**: Plugin enablement toggles.
  - **Keyboard Shortcuts**: Shortcut keybinding customizer.
- **Dynamic Theme Engine**:
  - Built-in theme presets (`OMP Dark`, `OMP Light`, `OMP Classic`).
  - System color-scheme automatic sync (`dark`/`light`).
  - Custom plugin theme contributions support.
