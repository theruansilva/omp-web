# Agent Notes

This project is expected to run locally using split systemd user services:

- `omp-web-sessiond.service` runs `bun run start:sessiond` in non-autoreload, non-auto-restart mode.
- `omp-web-ui-dev.service` runs the web/API and Vite UI in dev autoreload mode with `bun run dev:web` and `bun run dev:client`.

When working on this project, assume the session runtime owner is long-lived and separate from the autoreloading UI/API process. Browser disconnects and UI/API restarts should not stop active Pi sessions.

If you make changes that affect `src/server/sessiond.ts`, session runtime ownership, the session daemon protocol, or any code path only loaded by the session daemon, inform the user that a manual restart of the session daemon is needed.

Changes to the web/API/UI side generally only require the `omp-web-ui-dev.service` autoreload/restart path.

## Production Services vs Dev Mode

- Production systemd user services (`omp-web.service` and `omp-web-sessiond.service`) run the compiled artifacts from `dist/`.
- Always run `bun run build` after modifying features or fixes before restarting production services, otherwise the services will continue running stale bundles from `dist/`.
- In dev mode (`bun run dev`), files are executed directly from `src/` with autoreload.

## Configuration conventions

- `$OMP_WEB_DATA_DIR` (`~/.omp-web` by default) contains PI WEB-managed state such as `projects.json` and `machines.json`; do not treat it as the user-editable config API.
- Global user/machine config lives at `$OMP_WEB_CONFIG` or `~/.config/omp-web/config.json`.
- Project-local PI WEB core config should use one commit-able file: `<project>/.omp-web/config.json`.
- Core features should add keys to these config files, not create one project file per feature.
- Plugins may own separate project config files, such as `.omp-web/tasks.json`.
## Commits

- Make atomic commits using the gitmoji convention.
