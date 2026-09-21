# Arquitetura da Camada Web/API e Frontend (`omp-web`)

## 1. Ponto de Entrada Principal (Server Entry Point)
A porta de entrada do servidor web está localizada em `src/server/index.ts`. Ele atua apenas como um inicializador, invocando a função principal `buildApp()` (localizada em `src/server/app.ts`), que constrói a instância do servidor e injeta o limite de upload definido nas configurações.

## 2. Framework Web e Padrão de Roteamento
- **Framework Utilizado:** O projeto utiliza **Fastify** (`fastify` e `@fastify/websocket`).
- **Organização das Rotas (Routing Pattern):** O roteamento segue um padrão de "Controladores Modulares Registrados". Na função `buildApp`, as rotas são isoladas por domínio em funções de registro, como por exemplo `registerPiPackageRoutes(app, piPackages)`, `registerMachineRoutes(app, machines)`, e `registerSessionProxyRoutes(app, sessionDaemon)`. Isso mantém o núcleo limpo e isola as regras de negócio de cada módulo.

## 3. Comunicação entre Cliente e API
A comunicação do frontend com o backend é híbrida, operando de duas formas fundamentais:
- **REST (HTTP):** Utilizado para todo o controle de estado assíncrono, buscas, CRUDs e comandos de disparo único (como criar projeto, listar máquinas, ler configurações).
- **WebSockets (WS/WSS):** Utilizado para telemetria contínua e eventos de alto tráfego. O cliente utiliza uma classe chamada `RealtimeSocket` (`src/client/src/sessionSocket.ts`) para se conectar ao `/api/events` e aos streams de terminais interativos, que o backend Fastify então repassa (proxies) para o `sessiond`.

## 4. Exemplos de Endpoints CRUD Existentes
O padrão de CRUD é muito claro no arquivo `src/server/app.ts`, dentro da função `registerLocalProjectRoutes`. Ele serve como a referência ideal de arquitetura para novas rotas:

- **Listar (GET):** `app.get('${prefix}/projects', async () => projects.list());`
- **Criar (POST):** 
  ```typescript
  app.post<{ Body: { name?: string; path: string; create?: boolean } }>(`${prefix}/projects`, async (request, reply) => {
    try {
      return await projects.add(request.body);
    } catch (error) {
      return reply.code(400).send({ error: error.message });
    }
  });
  ```
- **Deletar (DELETE):** 
  ```typescript
  app.delete<{ Params: { projectId: string } }>(`${prefix}/projects/:projectId`, ... )
  ```
- *Nota:* Erros são padronizados capturando a exception e devolvendo `HTTP 400` ou `404` com um objeto de formato `{ error: string }`.

## 5. Padrões de Interface (UI) do Cliente
A análise de `src/client/src/components/OmpWebApp.ts` (e o `package.json` anterior) revela que a interface **não** usa React, Vue ou Svelte.

- **Framework Frontend:** A biblioteca escolhida é o **Lit** (Web Components).
- **Sintaxe e Estado:** Os arquivos usam a API padrão do Lit com decoradores como `@customElement("omp-web-app")`, `@state()`, `@query()`, e montam o DOM utilizando *Template Literals* etiquetados com `html`.
- **Organização de Estado:** O estado global da aplicação é controlado por uma árvore de "Controllers" injetados na classe principal (como `SessionController`, `WorkspaceController`, `MachineController`), que emitem atualizações de re-renderização quando mudam (`this.setState(patch)`).

## 6. Autenticação e Camada de Segurança (Security Middleware & Authentication)

A partir da versão v2.3.0, o servidor implementa autenticação obrigatória por padrão via token e cookies HttpOnly através do middleware em `src/server/security.ts` (`createSecurityMiddleware`).

### Funcionamento / How it Works
1. **Token Automático (Automatic Token)**:
   - Na inicialização (`src/server/index.ts`), o token é lido de `OMP_WEB_AUTH_TOKEN`, da chave `authToken` na configuração, ou gerado automaticamente em `~/.omp-web/auth-token` (com permissões `0600`).
   - *On startup, the token is loaded from `OMP_WEB_AUTH_TOKEN`, config `authToken`, or auto-generated at `~/.omp-web/auth-token` (mode `0600`).*

2. **Fluxo de Acesso no Navegador (Browser Access Flow)**:
   - O usuário pode acessar diretamente via link com query param: `http://127.0.0.1:8504?token=<token>`. O middleware valida e emite automaticamente o cookie `omp_web_token` (`HttpOnly; SameSite=Lax`).
   - Se o acesso for sem token, uma tela responsiva de Unlock é retornada (`renderLoginPage()`), permitindo enviar o token via `POST /api/omp-web/auth`.
   - *Users can open `http://127.0.0.1:8504?token=<token>` which issues the `omp_web_token` cookie. Requests without token render a standalone Unlock page that posts to `/api/omp-web/auth`.*

3. **Chamadas de API e WebSockets (API & WebSockets)**:
   - Requisições para `/api/*` e upgrades de WebSocket exigem autenticação via header `Authorization: Bearer <token>`, cookie `omp_web_token` ou query param `?token=<token>`.
   - Comparação segura contra timing attacks (`safeTokenCompare` com `crypto.timingSafeEqual`).
   - Rotas isentas: `/health`, `/runtime`, `/api/omp-web/status`, `/api/omp-web/version`, `/api/omp-web/runtime`, `/api/omp-web/auth`, e `/omp-web-plugins/*`.
   - *API calls and WebSocket connections must supply `Authorization: Bearer <token>`, the cookie, or `?token=<token>`. Timing-safe comparison prevents side-channel attacks.*

4. **Configuração e Desativação (Configuration & Disabling)**:
   - Variáveis de ambiente: `OMP_WEB_AUTH_REQUIRED=0|1|false|true`, `OMP_WEB_AUTH_TOKEN=<secret>`.
   - Chaves no config (`~/.config/omp-web/config.json`): `"authRequired": false`, `"authToken": "..."`.
