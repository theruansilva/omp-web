# Arquitetura do Session Daemon (`sessiond`)

## 1. Ponto de Entrada (Entry Point) e Modelo de Processo
O daemon de sessões é uma aplicação isolada baseada no framework `Fastify` com suporte a WebSockets (`@fastify/websocket`). 
- **Entry Point:** O arquivo principal é o `src/server/sessiond.ts`.
- **Como inicia:** Ele é invocado pelo Bun no terminal via script do `package.json` (`bun src/server/sessiond.ts`). Na máquina do usuário local, o serviço é comumente encapsulado em um serviço systemd de usuário chamado `pi-web-sessiond.service`.
- **Motivo do Isolamento:** Manter os processos do `sessiond` isolados do servidor web/API e Vite UI (`pi-web-ui-dev.service`). Isso garante que os reloads automáticos da UI (hot-reload) durante o desenvolvimento e quedas de conexão não afetem as sessões do Pi que estejam rodando em background.

## 2. Mecanismo de Comunicação IPC (Inter-process Communication)
Como a interface UI/Web roda em um processo diferente do `sessiond`, há uma camada de proxy para conectá-los:
- O processo Web/API intercepta requisições nos caminhos `/api/activity`, `/api/auth`, `/api/sessions` (e seus eventos WebSocket) via roteador em `src/server/sessiond/sessionProxyRoutes.ts`.
- O repasse ocorre usando um cliente HTTP/WS (`SessionDaemonClient` em `src/sessiond/sessionDaemonClient.ts`).
- A comunicação de rede local é feita através de um **Unix Domain Socket** (o padrão é `~/.pi-web/sessiond.sock`) ou usando uma porta HTTP TCP normal, caso seja definida pela variável de ambiente `PI_WEB_SESSIOND_PORT`.

## 3. Hooks de Ciclo de Vida (Lifecycle)
Em `src/server/sessiond.ts`, o daemon escuta pelos sinais do sistema `SIGINT` e `SIGTERM`. Quando chamados, invocam a função assíncrona `shutdown(signal)`, que se encarrega de realizar o _dispose_ gradativo e limpo nos serviços internos: terminais (`terminals.dispose()`), autenticação (`auth.dispose()`), das sessões ativas (`sessions.dispose()`), e encerra ordenadamente o servidor HTTP Fastify.

## 4. Padrões de Tarefas Periódicas (Scheduled / Periodic Tasks)
Foram mapeadas as seguintes rotinas periódicas na runtime do daemon:
- No `PiSessionService` (`src/server/sessions/piSessionService.ts`), há um `setInterval` atachado ao loop principal que dispara `publishHeartbeats()` continuamente a cada **2000 milissegundos**, informando a integridade das sessões ativas via WebSocket.
- No serviço de fluxo de login (`src/server/sessions/oauthLoginFlowService.ts`), utiliza-se o padrão de `setTimeout` funcionando como TTLs (Time-To-Live) baseados nas variáveis `runningTtlMs` e `terminalTtlMs` para invalidar e ejetar da memória tentativas de login abandonadas ou travadas.
- O `piSessionService.ts` também agenda via timeout o escoamento de requisições de prompts e compactações pendentes (`compactionDrainTimers`).

## 5. Principais Caminhos (Key File Paths)
* `src/server/sessiond.ts` (Core Runtime e Roteador Fastify Principal)
* `src/server/sessiond/sessionProxyRoutes.ts` (Setup das rotas Proxy na Web)
* `src/sessiond/sessionDaemonClient.ts` (O cliente RPC local para comunicação do Web/API com o Socket)
* `src/server/sessions/piSessionService.ts` (Gerenciador e orquestrador principal do runtime de cada sessão)
* `src/cli.ts` (Definição e instalação dos arquivos `.service` do systemd, via subcomandos da CLI)