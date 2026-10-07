# Arquitetura do Session Daemon (`sessiond`)

## 1. Ponto de Entrada (Entry Point) e Modelo de Processo
O daemon de sessões é um serviço isolado em background construído com **Hono** e WebSocket nativo do **Bun** (`hono/bun` com `createBunWebSocket`).
- **Entry Point:** O arquivo principal é o `src/server/sessiond.ts`.
- **Como inicia:** Ele é invocado pelo Bun no terminal (`bun src/server/sessiond.ts`) ou como serviço gerenciado pelo systemd do usuário (`omp-web-sessiond.service`).
- **Motivo do Isolamento:** Manter os runtimes das sessões de agentes de IA desacoplados do servidor HTTP da interface web (`omp-web.service` / Vite UI). Quedas de conexão, reloads de interface ou atualizações na camada web não afetam as execuções e tarefas em background.

## 2. Mecanismo de Comunicação IPC (Inter-process Communication)
Como a interface web e o `sessiond` rodam em processos separados:
- O processo Web/API atua como proxy para requisições em `/api/activity`, `/api/auth`, `/api/sessions`, `/api/terminals`, `/api/schedule-prompt` (e seus eventos WebSocket) via roteador em `src/server/sessiond/sessionProxyRoutes.ts`.
- O repasse ocorre usando `SessionDaemonClient` (`src/sessiond/sessionDaemonClient.ts`).
- A comunicação local padrão é feita via **Unix Domain Socket** (`~/.omp-web/sessiond.sock`) ou porta TCP se `OMP_WEB_SESSIOND_PORT` for definida.

## 3. Hooks de Ciclo de Vida e Process Reaper
Em `src/server/sessiond.ts`, o daemon escuta os sinais do sistema `SIGINT` e `SIGTERM`:
- Invoca a função assíncrona de shutdown para realizar o encerramento ordenado dos serviços (`terminals`, `auth`, `sessions`, `workspaceActivity`, socket).
- **Process Reaper (`src/server/sessions/processReaper.ts`):** Na inicialização e no ciclo de vida, o sessiond executa a limpeza de processos órfãos (`reapOrphanProcesses`), garantindo que processos filhos de ferramentas anteriores não permaneçam consumindo recursos da máquina.

## 4. Agendamento e Tarefas Periódicas (Scheduled Tasks)
O `sessiond` conta com serviços periódicos e agendamento nativo:
- **Schedule Prompt Service (`src/server/sessions/schedulePrompt/`):** Rotas e motor para agendamento de prompts em intervalos regulares ou cron expressions (alimentado pela lib `croner`), permitindo disparar comandos e tarefas recorrentes nos workspaces e sessões.
- **Heartbeats:** No `PiSessionService` (`src/server/sessions/piSessionService.ts`), há um loop contínuo de `publishHeartbeats()` via WebSocket notificando o status das sessões ativas.
- **TTL de Autenticação OAuth:** Em `oauthLoginFlowService.ts`, timeouts invalidam fluxos de login expirados ou abandonados.
- **Drenagem de Prompts e Compactação:** Filas de compactação e drenagem de buffers operam com timers dedicados para evitar concorrência desordenada.

## 5. Principais Caminhos (Key File Paths)
* `src/server/sessiond.ts` (Core Runtime e Inicializador Hono do Daemon)
* `src/server/sessiond/sessionProxyRoutes.ts` (Rotas proxy na API web para o sessiond)
* `src/sessiond/sessionDaemonClient.ts` (Cliente RPC local via Unix socket / HTTP)
* `src/server/sessions/piSessionService.ts` (Orquestrador do runtime e ciclo de vida de sessões)
* `src/server/sessions/schedulePrompt/` (Serviço e rotas de agendamento cron de prompts)
* `src/server/sessions/processReaper.ts` (Reaper para varredura e término de processos órfãos)
* `src/cli.ts` (Gerenciamento de serviços systemd via CLI `omp-web`)
