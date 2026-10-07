# Arquitetura da Camada Web/API e Frontend (`omp-web`)

## 1. Ponto de Entrada Principal (Server Entry Point)
A porta de entrada do servidor web está localizada em `src/server/index.ts`. Ele atua como um inicializador executado no runtime **Bun**, invocando a função principal `buildApp()` (localizada em `src/server/app.ts`), que constrói a aplicação e gerencia os serviços de projeto, máquinas, configurações e rotas proxy.

## 2. Framework Web e Padrão de Roteamento
- **Framework Utilizado:** O projeto utiliza **Hono** (`hono` e `hono/bun` com `createBunWebSocket`). O runtime servidor é alimentado nativamente por `Bun.serve`.
- **Organização das Rotas (Routing Pattern):** O roteamento segue o padrão de módulos e controladores registrados no Hono. Na função `buildApp`, as rotas são isoladas por domínio em funções de registro, como:
  - `registerLocalProjectRoutes(app, ...)`
  - `registerMachineRoutes(app, machines)`
  - `registerMachineProxyRoutes(app, machines)`
  - `registerSessionProxyRoutes(app, sessionDaemon)`
  - `registerConfigRoutes(app, config)`
  - `registerPiPackageRoutes(app, piPackages)`
  - `registerWorkspaceExplorerRoutes(app)`
  - `registerGitRoutes(app)`
  - `registerTerminalProxyRoutes(app, ...)`
  - `registerPushRoutes(app, pushService)`
  - `registerMcpRoutes(app)`
  - `registerUsageRoutes(app)`

## 3. Comunicação entre Cliente e API
A comunicação do frontend com o backend opera de forma híbrida:
- **REST (HTTP):** Endpoints JSON para controle de estado assíncrono, buscas, CRUDs e comandos de disparo único (como projetos, arquivos, configurações, máquinas, git e uso de tokens).
- **WebSockets (WS/WSS):** Gerenciados via `createBunWebSocket()` do Hono para telemetria contínua, stream de eventos em tempo real (`/api/events`), shells interativos e multiplexação de mensagens bidirecionais.

## 4. Padrões de Endpoints CRUD e Handlers Hono
O padrão de rotas no Hono utiliza handlers tipados no `app` (`src/server/app.ts`):

- **Listar (GET):**
  ```typescript
  app.get(`${prefix}/projects`, async (c) => {
    return c.json(await projects.list());
  });
  ```
- **Criar (POST):**
  ```typescript
  app.post(`${prefix}/projects`, async (c) => {
    try {
      const body = await c.req.json();
      return c.json(await projects.add(body));
    } catch (error) {
      return c.json({ error: (error as Error).message }, 400);
    }
  });
  ```
- **Deletar (DELETE):**
  ```typescript
  app.delete(`${prefix}/projects/:projectId`, async (c) => {
    const projectId = c.req.param("projectId");
    await projects.delete(projectId);
    return c.json({ ok: true });
  });
  ```
- *Tratamento de Erros:* Erros retornam status HTTP apropriado (`400`, `404`, `500`) com payload padronizado `{ error: string }`.

## 5. Padrões de Interface (UI) do Cliente
A interface frontend é construída como uma SPA reativa e modular:

- **Framework Frontend:** **Lit** (Web Components) compilado via Vite.
- **Renderização e Estilização:** 
  - RenderRoot em **Light DOM** (`createRenderRoot() { return this; }`) para integração com utilitários Tailwind CSS, variáveis de tema OKLCH e design tokens dinâmicos.
  - Componentes com geometria squircle (`clip-path: var(--clip-path-squircle-28, none)`) e paletas adaptativas dark/light.
- **Organização de Estado:** A aplicação orquestra seu ciclo de vida em `OmpWebApp.ts` e `OmpApp.ts`, integrando serviços e controladores de sessão, terminal, exploração de arquivos, uso e configurações.

## 6. Autenticação e Camada de Segurança (Security Middleware & Authentication)
A camada de segurança é centralizada no middleware em `src/server/security.ts` (`createSecurityMiddleware`).

### Funcionamento
1. **Token Automático (Automatic Token)**:
   - Na inicialização (`src/server/index.ts`), o token é lido de `OMP_WEB_AUTH_TOKEN`, da chave `authToken` na configuração, ou gerado automaticamente em `~/.omp-web/auth-token` (com permissões `0600`).
2. **Fluxo de Acesso no Navegador**:
   - Acesso via link com query param: `http://127.0.0.1:8504?token=<token>`. O middleware valida e emite automaticamente o cookie `omp_web_token` (`HttpOnly; SameSite=Lax`).
   - Se o acesso for sem token, uma tela standalone de Unlock é retornada (`renderLoginPage()`), permitindo autenticar via `POST /api/omp-web/auth`.
3. **Chamadas de API e WebSockets**:
   - Requisições para `/api/*` e upgrades de WebSocket exigem autenticação via header `Authorization: Bearer <token>`, cookie `omp_web_token` ou query param `?token=<token>`.
   - Comparação segura contra timing attacks (`safeTokenCompare` com `crypto.timingSafeEqual`).
   - Rotas isentas: `/health`, `/runtime`, `/api/omp-web/status`, `/api/omp-web/version`, `/api/omp-web/runtime`, `/api/omp-web/auth`, e `/omp-web-plugins/*`.
4. **Configuração e Desativação**:
   - Variáveis de ambiente: `OMP_WEB_AUTH_REQUIRED=0|1|false|true`, `OMP_WEB_AUTH_TOKEN=<secret>`.
   - Chaves no config (`~/.config/omp-web/config.json`): `"authRequired": false`, `"authToken": "..."`.
