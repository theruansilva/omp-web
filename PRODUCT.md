# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Developers & Power-Users**: Software engineers who use Oh My Pi as their primary harness for autonomous development, background task execution, and natural language workspace operations.
- **Builders & Creators**: Users looking to automate routines, supervise long-running tasks, and orchestrate autonomous agents without manual terminal overhead.
- **Tool & Plugin Explorers**: Users experimenting with generative UI workflows, extensions, and workspace plugins.

## Product Purpose
Serve as the definitive web cockpit for Oh My Pi (OMP Web), unifying real-time conversational supervision, reasoning modes, background agent execution, and integrated engineering tooling (terminal, file explorer, schedules, usage metrics).

## Positioning
Unlike generic chat surfaces or bare terminal windows, OMP Web couples high-fidelity desktop UI with the actual Oh My Pi agent execution engine:
1. **Unified Modern Cockpit**: Clean acrylic surfaces, squircle geometry, and calibrated OKLCH semantic tokens.
2. **Context-Aware Composer Hub**: Dynamic reasoning model controls, slash command hub (`/`), workspace file picker (`@`), and inline shell runner (`!`).
3. **Persistent Decoupled Daemon**: Direct connection to `sessiond`, keeping agent processes and background tasks alive across tab closes and device switches.
4. **Interactive AskTool & Generative UI**: Keyboard-first interactive parameter drawers (`ask`) and structured UI components (`<checklist>`, `<card>`, `<kpi-grid>`, `<callout>`).

## Operating Context
- Modern desktop and mobile browsers with responsive side drawers and touch-calibrated navigation.
- Real-time bidirectional WebSockets for token streaming, tool callout events, and agent status.
- Native integrated `ask` drawer in composer replacing legacy static option blocks.

## Capabilities and Constraints
- **Focused Engineering Navigation**:
  - `New chat`: Home greeting view with sticky bottom composer dock.
  - `Terminal`: Interactive PTY console powered by xterm.js.
  - `Files`: Workspace directory explorer, file viewer, and download utility.
  - `Projects`: Multi-workspace and Git worktree manager.
  - `Models`: Model discovery, reasoning level controls, and provider tags.
  - `Schedules`: Visual cron management for automated agent tasks.
  - `Settings`: Gateway, session daemon, and UI Colors customization.
- **Multifunctional Composer**: Auto-expanding input, image and file attachments, keyboard autocomplete dock, and instant execution abort.
- **Design System Tokens**: Strict adherence to OKLCH tokens (`omp-theme.css`), squircle curvature, and anti-black/anti-white contrast constraints.

## Brand Commitments
- **Official Name**: OMP Web (Oh My Pi Web).
- **Tone of Voice**: Precise, responsive, focused, and uncluttered.
- **Visual Identity**: Acrylic surfaces, native dark/light high-contrast themes, and concentric squircle radii.

## Product Principles
1. **Clarity & Execution Focus**: Every component serves real development and agent supervision; unnecessary consumer bloat is eliminated.
2. **Tailored Reasoning**: Model modes and reasoning effort are configurable directly within the composer dock.
3. **Semantic Visual Consistency**: Surfaces, elevations, and borders derive mathematically from OKLCH tokens ensuring WCAG AA contrast.
4. **Resilient Persistence**: Work runs where code and credentials live; disconnection never interrupts active agent execution.

## Accessibility & Inclusion
- Strict WCAG AA contrast across light and dark modes via semantic token pairs (`--omp-surface-*` and `--omp-text-*`).
- Keyboard navigation, visible focus indicators, and responsive collapse on smaller viewports (< 768px).
