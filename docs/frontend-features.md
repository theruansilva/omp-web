# OMP Web — Frontend Feature Inventory (Cockpit v3)

This document details the frontend features, components, and capabilities implemented in `omp-web`.

---

## 1. App Shell & Layout Structure (Cockpit v3)
- **Cockpit v3 Architecture**:
  - Left Column: Modern Sidebar with nested project cards, sessions tree list, and working indicators.
  - Center Column: Main Header Bar, Chat Stream View, Monolithic Code Blocks, and Composer Hub.
  - Right Column / Panels: Dedicated views for Files, Terminals, Usage metrics, and Git state.
- **Resizable Side Panels & View Switcher**: Interactive handles to drag and resize sidebars, plus instant view switching between Chat, Files, Terminal, and Usage analytics.
- **Mobile Responsive Mode**: Drawer views, bottom touch-safe navigation, and adaptive responsive breakpoints.
- **PWA Capabilities**: Installable Web App (`manifest.webmanifest`, theme colors, offline assets).
- **Command Palette / Action Palette (Cmd+K / Ctrl+K)**: Quick fuzzy navigation and command execution across workspaces, settings, and themes.

---

## 2. Dynamic OKLCH UI Colors & Theme Engine
- **OKLCH Palette Generator**: Real-time palette calculation preserving perceived contrast and chromatic harmony across light and dark modes.
- **Presets & Custom Color Pickers**: Preconfigured palettes (Default, Warm Cocoa, Ocean, Emerald, Amber, Violet) with dynamic primary hue tuning.
- **Squircle Geometry**: Smooth superellipse borders implemented via `@progmruansilva/squircles` (`--clip-path-squircle-28`) paired with subtle elevation drop shadows.
- **Anti-Black / Anti-White Contrast Tokens**: Strict avoidance of harsh `#000` and `#fff` fills on cards, prioritizing warm acrylic and secondary foreground tokens.

---

## 3. Composer Hub & Interactive AskTool
- **Composer Hub Input**:
  - Context triggers: `/` (slash commands), `@` (file and directory picker), and `!` / `#` (workspace context hubs).
  - Multi-line autosizing editor, markdown preview, image upload, and attachment badges.
  - Immediate generation cancellation via `Escape` key or prioritized Stop button.
- **Interactive AskTool Drawer (`OmpAskDialog` / Composer Ask Mode)**:
  - Natively integrated interactive drawer in `OmpComposer` replacing legacy static options.
  - Keyboard navigation (arrows + Enter) for rapid option selection, recommended badges, multi-select support, and custom text inputs.
- **Generative UI Components**:
  - `<checklist>`: Interactive checklists for user decision-making, and non-interactive status checklists with checked state and badges.
  - `<card>`: Structured informational blocks with contextual badges and color highlights.
  - `<kpi-grid>` & `<kpi>`: Numerical indicators, metric cards, and delta trackers.
  - `<callout>`: Color-coded alerts (`info`, `warning`, `success`, `danger`).

---

## 4. Multi-Machine & Gateway Management
- **Machine Connection Manager**: Connect to local gateway or remote `omp-web` nodes.
- **Bearer Token Auth**: Token-based authentication and secure cookie session handshakes.
- **Health & Telemetry**: Periodic status pings (`online`, `stale`, `offline`, `unknown`) with automated failover and reconnects.

---

## 5. Projects & Workspaces
- **Project Directory Manager**: Register repositories and folders across disk partitions.
- **Worktrees & Branch Workspaces**: Discovery and management of Git worktrees and switchable branch workspaces.
- **Path Access Guardrails**: Granular directory allowlist preventing unauthorized file escapes outside allowed workspace paths.

---

## 6. Chat Stream & Session Lifecycle
- **Real-Time Streaming Chat**: WebSockets connected directly to `omp-web-sessiond`.
- **Monolithic Code Blocks**: Styled code cards with language badges, copy-to-clipboard buttons, and syntax highlighting.
- **Collapsible Tool Callouts**: Dynamic execution cards for agent tools (`bash`, `read`, `write`, `edit`, `ast_edit`, `skill`, etc.) streaming stdout/stderr live.
- **Thinking Budget Indicator**: Real-time gauge for model reasoning levels.
- **Archive & Bulk Cleanup**: Full lifecycle control to archive, restore, or bulk clean old sessions.

---

## 7. Integrated Workspace Tools
- **File Explorer & Editor**: Workspace tree viewer, inline file editor with syntax highlight, and image previewers.
- **Interactive Terminal Panel**: xterm.js terminal emulator wired to PTY sessions via WebSockets.
- **Scheduled Tasks & Crons**: Visual management panel for prompt schedules powered by `croner`.
- **Usage Metrics & Analytics**: Token consumption graphs, model distribution, and request counts.
