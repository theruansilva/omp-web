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

## Plugin & Extension Conventions

- In `package.json` for extensions or plugins, the manifest key MUST be `"omp"` (never legacy `"pi"`).

## Commits

- Make atomic commits using the gitmoji convention.


## Generative UI

- **Componentes de Generative UI (omp-web)**: Ao apresentar alternativas, opções de escolha, próximos passos ou perguntas com opções para o usuário escolher, utilize os componentes de Generative UI nativos do omp-web ao invés de simples listas em texto:
  - `<options title="Título" subtitle="Subtítulo opcional">`: Lista de opções interativas clicáveis com botões de "Inserir no prompt" e "Enviar seleção".
    Use `<option label="Nome da Opção" description="Detalhes da opção" />` para cada alternativa.
  - `<checklist title="Tarefas">`: Lista de itens/tarefas com `<item label="Item" desc="..." />`.
  - `<card title="Título" badge="Badge" color="blue|green|orange|purple">`: Cards visuais de conteúdo ou etapas.
  - `<kpi-grid>` com `<kpi label="Label" value="Valor" color="cor" sub="Detalhe" />`: Exibição de métricas.
  - `<callout type="info|warning|success|danger">`: Alertas e notas em destaque.
