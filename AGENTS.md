# Agent Notes

## Development & Deployment Workflow

The user manages the application lifecycle using the `omp-web` CLI:

- **Local Testing**: Stop running services with `omp-web stop`, then test with `bun run dev` (executes directly from `src/` with autoreload).
- **Production Update**: When changes are validated, build and update via `omp-web update`, then restart with `omp-web start`.
- **Production Bundles**: Always ensure `bun run build` succeeds when modifying features or fixes so compiled artifacts in `dist/` remain up to date.

## Service Restarts & Concurrent Active Chats Safeguard

Before stopping or restarting `omp-web` (`omp-web restart`, `omp-web stop`, or `systemctl --user restart ...`):
- **NEVER restart blindly**: Restarting the session daemon kills all active agent sessions across workspaces.
- **Check active chats first**: Run `omp-web sessions` (or `omp-web sessions --json`).
- **Wait if any chat is working**: If any session has status `[working]` (streaming, bash running, compacting, or pending messages), wait until it finishes (`[idle]` or completed) before restarting.
- **Automated wait**: You can use `omp-web restart --wait`, which automatically polls until all working sessions are idle before restarting. Do NOT use `--force` unless explicitly authorized by the user.

## Configuration conventions

- `$OMP_WEB_DATA_DIR` (`~/.omp-web` by default) contains PI WEB-managed state such as `projects.json` and `machines.json`; do not treat it as the user-editable config API.
- Global user/machine config lives at `$OMP_WEB_CONFIG` or `~/.config/omp-web/config.json`.
- Project-local PI WEB core config should use one commit-able file: `<project>/.omp-web/config.json`.
- Core features should add keys to these config files, not create one project file per feature.
- Plugins may own separate project config files, such as `.omp-web/tasks.json`.

## UI & Front-end Conventions (Lit, Tailwind, Squircles & UI Colors)

- **Autoridade de Design (Obrigatória)**: Se a tarefa envolver design, criação ou alteração de telas, layouts, cards, componentes ou estilização front-end, você **DEVE consultar e seguir rigorosamente o `DESIGN.md`** na raiz do projeto. O `DESIGN.md` é a única fonte da verdade para paletas, superfícies, geometria squircle e tokens visuais.
- **Light DOM for Tailwind & Global Styling**: When authoring new presentation components or adapting screens with Tailwind utilities, disable Shadow DOM by declaring:
  ```ts
  protected override createRenderRoot() {
    return this;
  }
  ```
  This allows Tailwind classes and global theme tokens (`[data-theme=dark]`) to style elements directly without Shadow DOM encapsulation barriers.
- **Squircles**: For containers, pills, and input docks requiring smooth superellipse corners, use `@progmruansilva/squircles` via `clip-path: var(--clip-path-squircle-28, none)` paired with `filter: drop-shadow(...)`.
- **Anti-Black / Anti-White Rule (CRITICAL)**:
  - **NEVER** use `bg-black`, `#000`, or `bg-white` hardcoded on cards or surfaces. In dark mode, `bg-black` creates pitch-black unreadable voids. In light mode, `bg-white` breaks the warm Cocoa palette.
  - **NEVER** use `text-black` or `text-white` directly on content cards.
  - **Cards & Surfaces**: Use `omp-settings-card` or `ui-colors-preview-card` or `var(--bg)` / `var(--omp-card-bg)`.
  - **Text colors**: Use `text-foreground-900` / `var(--text)` for primary text and `text-foreground-600` / `var(--text-muted)` for secondary text.
  - **Borders**: Use `border-black/10 dark:border-white/10` or `var(--border-muted)`.
  - **Actions / Buttons**: Use `bg-[var(--primary)]` or `omp-btn-signin` to respect the dynamic UI Colors system.
  - For full design system details and recipes, follow `.github/skills/omp-ui-theme/SKILL.md` and `DESIGN.md`.

## Plugin & Extension Conventions

- In `package.json` for extensions or plugins, the manifest key MUST be `"omp"` (never legacy `"pi"`).

## Commits

- Make atomic commits using the gitmoji convention.
