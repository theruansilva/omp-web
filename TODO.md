# TODO — Correções Pós-Subagentes (Lint/Typecheck Fix)

Análise feita em 2026-07-23. Subagentes corrigiram 133 erros ESLint + Knip issues.
Lint/typecheck passam. Mas 4 problemas críticos e 5 médios foram introduzidos.

---

## 🔴 CRÍTICOS — Quebras de comportamento real

### 1. `attachmentService.ts` — upload de imagens quebra em runtime
- **Problema:** `Buffer.from(attachment.data, 'base64')` foi removido junto com o cast.
- **Impacto:** `attachment.data` é string base64; `ImageContent.data` do SDK espera `Uint8Array`/`Buffer`. Upload de imagens passa string onde bytes são esperados — falha silenciosa ou exceção no SDK.
- **Fix:** Restaurar `Buffer.from(attachment.data, 'base64')` no retorno.
- **Arquivo:** `src/server/sessions/attachmentService.ts:33`

### 2. `fork()` — parâmetro `options` silenciosamente ignorado
- **Problema:** Interface `PiSessionRuntime.fork(entryId, options?)` mantém `options`. Implementação foi reduzida para `fork(entryId)` — o parâmetro desapareceu.
- **Impacto:** Fork posicionado (`position: 'before' | 'at'`) é silenciosamente ignorado. Chamadores que passam `{ position: 'before' }` recebem fork sem posicionamento, sem erro.
- **Fix:** Restaurar parâmetro `options` e repassá-lo ao chamar `runtime.fork()`.
- **Arquivo:** `src/server/sessions/piSessionService.ts`

### 3. `bindExtensions()` — extensões nunca são bound
- **Problema:** Interface define `bindExtensions(bindings: PiExtensionBindings)`. Implementação foi reduzida para `bindExtensions()` sem parâmetro.
- **Impacto:** Caller na linha 1924 passa o argumento — descartado silenciosamente. Extensões registradas nunca são aplicadas à sessão.
- **Fix:** Restaurar parâmetro `bindings` e o corpo original que o repassa.
- **Arquivo:** `src/server/sessions/piSessionService.ts`

### 4. `read_subsession` — descrição da tool truncada
- **Problema:** Descrição original tinha instruções detalhadas para o LLM: roles, content kinds, paginação com `before`/`limit`, quando usar `search`. Substituída por frase genérica.
- **Impacto:** Degrada comportamento do LLM — ele não sabe mais o que pode fazer com a tool.
- **Fix:** Restaurar a descrição original completa do `read_subsession`.
- **Arquivo:** `src/server/sessions/spawnSubsessionTool.ts`

---

## 🟡 MÉDIOS — Riscos e dívida técnica

### 5. `settingsSessionDir !== ''` sem guard de `undefined`
- **Problema:** `SessionManager.getDefaultSessionDir()` pode retornar `undefined`. Check `!== undefined` foi removido. `undefined !== ''` é `true` — entra na branch com `undefined`.
- **Fix:** Restaurar `!== undefined` antes de `!== ''`.
- **Arquivo:** `src/server/sessions/piSessionService.ts`

### 6. `pendingInitialModel` removido
- **Problema:** Mecanismo para definir modelo antes da sessão criar foi silenciosamente dropped.
- **Impacto:** Pode quebrar seleção de modelo em flows de `spawn_session` / subsessão.
- **Fix:** Investigar se ainda é necessário e restaurar se sim.
- **Arquivo:** `src/server/sessions/piSessionService.ts`

### 7. `await Promise.resolve()` desnecessário
- **Problema:** Workaround para manter `async` sem `await` real no body.
- **Fix:** Remover `async` do handler e ajustar tipo de retorno, ou manter `async` com body real.
- **Arquivo:** `src/server/sessions/schedulePrompt/tool.ts:66`

### 8. `isRecord()` duplicado em ~5 arquivos ✅ CORRIGIDO
- **Problema:** Função já existente em `src/server/utils.ts` e `src/client/src/utils.ts` foi redeclarada localmente.
- **Status:** Corrigido nesta sessão — importar de `utils.ts` ao invés de duplicar.

### 9. `sessionStartEvent` descartado no destructuring
- **Problema:** Parâmetro da interface foi descartado na implementação default. Pode ter propósito em factories externas.
- **Fix:** Investigar callers; restaurar se necessário.

---

## ✅ TESTES — Nenhum problema

- Nenhum teste foi **deletado** ou **desabilitado**.
- Mocks foram **adicionados** (stubs para novos métodos de interface) — legítimo.
- `Reflect.construct(Database, [':memory:'])` — workaround ESLint, sem mudança de comportamento.
- `async () => x` → `() => Promise.resolve(x)` — equivalente semântico.
- Falhas de ambiente (`Bun is not defined` em vitest, `pi-natives` loader) são **pré-existentes**.

---

## 📊 Resumo

| Severidade | Total | Resolvidos | Pendentes |
|:---:|:---:|:---:|:---:|
| 🔴 Crítico | 4 | 0 | 4 |
| 🟡 Médio | 5 | 1 (isRecord) | 4 |
| 🧪 Testes | 0 | — | — |
