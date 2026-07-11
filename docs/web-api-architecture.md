# Arquitetura da Camada Web/API e Frontend (`pi-web`)

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
A análise de `src/client/src/components/PiWebApp.ts` (e o `package.json` anterior) revela que a interface **não** usa React, Vue ou Svelte.

- **Framework Frontend:** A biblioteca escolhida é o **Lit** (Web Components).
- **Sintaxe e Estado:** Os arquivos usam a API padrão do Lit com decoradores como `@customElement("pi-web-app")`, `@state()`, `@query()`, e montam o DOM utilizando *Template Literals* etiquetados com `html`.
- **Organização de Estado:** O estado global da aplicação é controlado por uma árvore de "Controllers" injetados na classe principal (como `SessionController`, `WorkspaceController`, `MachineController`), que emitem atualizações de re-renderização quando mudam (`this.setState(patch)`).