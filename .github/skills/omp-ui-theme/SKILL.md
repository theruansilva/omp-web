---
name: omp-ui-theme
description: Use when creating, styling, editing, or fixing any frontend UI component, screen, view, dialog, card, modal, or layout in omp-web. Enforces the OMP Web design system, OKLCH UI Colors, Muted scale, squircle geometry, and strict anti-black/anti-white dark mode rules.
version: 1.0.0
user-invocable: true
---

# Diretrizes Obrigatórias de UI & Estilização (OMP Web)

Ao criar, editar ou estilizar qualquer tela, componente, card ou modal no `omp-web`, siga estritamente estas regras. Elas eliminam os problemas crônicos de cards pretos no escuro, telas brancas ofuscantes e contrastes ilegíveis.

---

## 1. Proibição Absoluta: Cores Hardcoded e Extremos Crus

| O que é TERMINANTEMENTE PROIBIDO | O que Acontece se Usar | O que Usar no Lugar |
|---|---|---|
| `bg-black` ou `#000000` | Cria um "buraco negro" no modo escuro sem relevo, profundidade ou borda acrílica. | `omp-settings-card`, `ui-colors-preview-card`, `bg-black/5 dark:bg-white/10` ou `var(--bg)` |
| `bg-white` ou `#ffffff` | Gera um bloco branco estéril e ofuscante no modo escuro e mata a tonalidade quente (Cocoa) no claro. | `var(--bg-light)` ou `bg-white/40 dark:bg-white/10` |
| `text-black` / `text-white` | Fica invisível quando o tema inverte ou o fundo muda. | `text-foreground-900` ou `var(--text)` |
| `text-gray-400/500/600` | Cores genéricas que não respeitam a saturação do tema ativo. | `text-foreground-600` ou `var(--text-muted)` |
| Cores saturadas duras (`bg-blue-600`) | Ignoram o sistema de personalização UI Colors do usuário. | `bg-[var(--primary)]` ou `var(--primary)` |

---

## 2. Anatomia de um Cartão (Card) Padrão

Todo card, seção ou container de conteúdo deve seguir uma destas duas estruturas:

### Estrutura A: Cartão Semântico OMP (Mais comum no app)
```html
<section
  class="p-5 md:p-6 rounded-3xl omp-settings-card flex flex-col gap-4"
  style="clip-path: var(--clip-path-squircle-28, none);"
>
  <div class="flex items-center justify-between">
    <div class="flex flex-col gap-0.5">
      <h3 class="text-base font-bold text-foreground-900">Título do Card</h3>
      <p class="text-xs text-foreground-600">Descrição ou metadado explicativo</p>
    </div>
    <!-- Ações à direita -->
  </div>
  <!-- Conteúdo do card -->
</section>
```

### Estrutura B: Cartão Acrílico com Gradiente (Estilo UI Colors)
```html
<div class="ui-colors-preview-card p-5 rounded-2xl flex flex-col gap-3">
  <h4 class="text-sm font-bold text-[var(--text)]">Título</h4>
  <p class="text-xs text-[var(--text-muted)]">Texto com contraste automático garantido</p>
</div>
```

---

## 3. Lit Element & Light DOM (Obrigatório)

Em **todo** componente Lit que renderize elementos visuais estilizados via Tailwind ou classes globais, declare sempre:

```ts
protected override createRenderRoot() {
  return this;
}
```

> **Por quê?** Sem isso, o Shadow DOM encapsula o componente e impede que as classes do Tailwind (`dark:bg-...`, `text-...`) e variáveis do `[data-theme="dark"]` alcancem os elementos, deixando tudo cinza ou preto cru padrão do browser.

---

## 4. Tabela de Tokens e Classes Canônicas

| Elemento | Modo Claro (Light) | Modo Escuro (Dark) | Token CSS / Classe Tailwind |
|---|---|---|---|
| **Fundo de Canvas** | `#FAF7F5` (Cocoa) | `#0B0E14` (Slate) | `bg-background-light dark:bg-background-dark` ou `var(--omp-bg)` |
| **Fundo de Card** | `#FFF` translúcido | `#1A1E2B / 0.55` | `.omp-settings-card` ou `var(--omp-card-bg)` |
| **Texto Primário** | `#1C1B1A` | `#F8FAFC` | `text-foreground-900` ou `var(--text)` |
| **Texto Secundário** | `#666666` | `#94A3B8` | `text-foreground-600` ou `var(--text-muted)` |
| **Bordas Sutis** | Preto 10% | Branco 10% | `border border-black/10 dark:border-white/10` ou `var(--border-muted)` |
| **Hover de Botões** | Preto 5% | Branco 10% | `hover:bg-black/5 dark:hover:bg-white/10` |
| **Botão Primário** | Cocoa-450 / Hue | Slate-450 / Hue | `bg-[var(--primary)] text-white hover:opacity-90` |
| **Squircles** | Curva orgânica | Curva orgânica | `clip-path: var(--clip-path-squircle-28, none);` |
