# Relatório de Dependências e Estrutura do Projeto (`pi-web`)

## 1. Dependências do `package.json`
Após análise das dependências (tanto `dependencies` quanto `devDependencies`), o projeto se concentra em tecnologias em tempo real e de interface:
- **Server:** `fastify`, `@fastify/websocket`, `ws`
- **Frontend / UI:** `lit` (Web Components), `@codemirror/*` (Editor), `@xterm/xterm` (Terminal)
- **Terminais / PTY:** `node-pty`, `bun-pty`
- **Utilitários:** `marked`, `typebox`, `diff`
- **Build / Lint:** `vite`, `typescript`, `vitest`, `eslint`

**⚠️ Descoberta Importante sobre Scheduling/Filas/Banco de Dados:**
Não há **absolutamente nenhuma** dependência relacionada a agendamento de tarefas, cronjobs, filas ou SQLite. Ferramentas como `node-cron`, `bull`, `bullmq`, `sqlite3`, `better-sqlite3`, `prisma`, ou `drizzle` estão ausentes. Qualquer funcionalidade de "cronjobs" na web precisará ser adicionada do zero ou implementada sobre infraestrutura nativa.

## 2. Configuração de Build (`tsconfig.json`)
O projeto utiliza um ambiente TypeScript moderno e estrito:
- `target`: `ES2022`
- `module`: `ESNext`
- `strict`: `true`
- O fluxo de build é orquestrado via scripts no NPM. O cliente (Frontend) é empacotado e servido pelo `vite`, enquanto o backend (`src/server/`) e os plugins são compilados nativamente pelo `tsc` e processados pelo `bun`.

## 3. Estrutura de Diretórios de Alto Nível
O repositório é um monorepo/workspace bem segregado:
- `/src/client/`: Código do Frontend (UI, React/Lit, componentes web, gerenciamento de estado da UI).
- `/src/server/`: Código do Backend (API Web, `sessiond`, orquestração de sessões do Pi, terminais em Node/Bun).
- `/src/shared/`: Interfaces TypeScript e utilitários divididos entre o Client e o Server.
- `/pi-web-plugins/`: Códigos baseados na arquitetura de plugins do Pi.
- `/extensions/`: Comandos e extensões da CLI.
- `/docs/`: Documentação geral (onde este e o outro relatório habitam).

## 4. Códigos de Agendamento/Cron Existentes
A busca por palavras-chave (`cron`, `schedule`, `interval`, `timer`, `job`) por todo o código-fonte revelou que **não existe um ecossistema de jobs ou filas rodando em background**. 
Todo o "agendamento" atual é feito ad-hoc de forma efêmera e em memória, através de:
- `setInterval` para envio de _Heartbeats_ no WebSocket (`piSessionService.ts`).
- `setTimeout` para gerenciar TTL (Tempo de Vida) e expiração (evicting) de fluxos de login OAuth travados (`oauthLoginFlowService.ts`).
- `setTimeout` para _kill switches_ em execuções de comandos (ex: limite de 10s para execuções seguras de processos filhos no `gitService.ts`).

## 5. Diretório de Tipos/Esquemas Compartilhados
Sim, existe! A pasta central de contratos entre a API e a UI está em `/src/shared/`.
- O principal arquivo de definições de interfaces de comunicação é o `src/shared/apiTypes.ts` (contém definições como `SessionInfo`, `MachineStatus`, `PiWebPluginConfig`, etc).
- Há também validações parciais que fazem uso do `typebox` e exports explícitos de enums e tipos que trafegam pelo websocket e endpoints HTTP.