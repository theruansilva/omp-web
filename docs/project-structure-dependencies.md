# Relatório de Dependências e Estrutura do Projeto (`omp-web`)

## 1. Dependências do `package.json`
O projeto opera com **Bun** como runtime e gerenciador de pacotes, combinando backend HTTP de alta performance e interface em Web Components:
- **Server:** `hono` e `hono/bun` (HTTP & WebSockets com `createBunWebSocket`).
- **Frontend / UI:** `lit` (Web Components), `@codemirror/*` (Editor de código e realce de sintaxe), `@xterm/xterm` (Terminal web interativo), `@progmruansilva/squircles` (geometria squircle).
- **Terminais / PTY:** `bun-pty`, `node-pty`.
- **Agendamento e Cron:** `croner` (motor cron padrão para agendamento periódico de prompts e tarefas automatizadas).
- **Utilitários e Formatação:** `marked` (Markdown parsing), `diff`, `@sinclair/typebox`.
- **Build, Lint e Testes:** `vite`, `typescript`, `vitest`, `eslint`.

## 2. Configuração de Build (`tsconfig.json`)
O ambiente TypeScript é moderno, unificado e tipado rigorosamente:
- `target`: `ES2022`
- `module`: `ESNext`
- `strict`: `true`
- O fluxo de build é orquestrado via scripts no Bun (`bun run build`). O frontend é empacotado via Vite (`dist/client`), enquanto o backend (`src/server/`), CLI (`src/cli.ts`) e plugins são compilados via TypeScript (`dist/`).

## 3. Estrutura de Diretórios de Alto Nível
O repositório é organizado de forma modular:
- `/src/client/`: Frontend SPA (Lit Web Components, Cockpit v3, UI Colors, terminal, editor, tree views, AskTool drawer e Generative UI).
- `/src/server/`: Backend Hono (API Web principal, `sessiond`, orquestração de sessões do Pi, terminais e proxy).
- `/src/shared/`: Interfaces TypeScript, enums e tipos compartilhados entre cliente e servidor (`src/shared/apiTypes.ts`).
- `/omp-web-plugins/`: Catálogo e implementações de extensões e plugins do omp-web.
- `/extensions/`: Comandos e extensões da CLI.
- `/docs/`: Documentação de arquitetura, configuração, deployment e guias.

## 4. Agendamento e Execuções Recorrentes
Diferente de versões anteriores, o projeto possui agendamento de tarefas através de:
- **`croner`**: Utilizado em `src/server/sessions/schedulePrompt/` para agendamento de prompts com suporte a expressões cron (6 campos com segundos: `0 * * * * *`) e intervalos customizados.
- **Heartbeats:** `setInterval` a cada 2000ms para emissão de status e telemetria de sessões ativas (`piSessionService.ts`).
- **TTLs & Timeouts:** Controles de vida útil para sessões OAuth, cancelamento gracioso de processos filhos e proteção contra loops em chamadas externas.

## 5. Diretório de Tipos e Esquemas Compartilhados
A pasta `/src/shared/` é a fonte canônica dos contratos entre backend e frontend:
- `src/shared/apiTypes.ts`: Define contratos como `ClientSession`, `SessionInfo`, `MachineStatus`, `AskDialogResult`, `SchedulePromptRequest`, etc.
- `src/shared/capabilities.ts`: Declaração de capacidades runtime da API e do daemon de sessão.
