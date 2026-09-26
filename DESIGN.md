---
name: OMP Web
description: Minimalist squircle cockpit with color-muted-450 palette, 2-tier framing, and superellipse geometry
colors:
  primary: "rgb(var(--color-muted-450, 135 103 78))"
  primary-dark: "rgb(var(--color-muted-450, 82 92 123))"
  canvas-light: "rgb(var(--color-muted-100, 255 251 248))"
  canvas-dark: "rgb(var(--color-muted-100, 15 17 25))"
  surface-card-light: "rgb(var(--color-muted-100, 255 251 248) / 0.98)"
  surface-card-dark: "rgb(var(--color-muted-150, 22 26 36) / 0.95)"
  stroke-resting-light: "rgb(var(--color-muted-450, 135 103 78) / 0.20)"
  stroke-resting-dark: "rgb(var(--color-muted-450, 82 92 123) / 0.25)"
  stroke-focus-light: "rgb(var(--color-muted-450, 135 103 78) / 0.70)"
  stroke-focus-dark: "rgb(var(--color-muted-450, 82 92 123) / 0.75)"
  input-bg-light: "rgb(var(--color-muted-200, 246 232 221) / 0.30)"
  input-bg-dark: "rgb(var(--color-muted-200, 31 36 49) / 0.50)"
  text-primary-light: "rgb(var(--color-foreground-900, 17 24 39))"
  text-primary-dark: "rgb(var(--color-muted-900, 251 252 254))"
  text-muted-light: "rgb(var(--color-muted-450, 135 103 78))"
  text-muted-dark: "rgb(var(--color-muted-450, 82 92 123))"
typography:
  display:
    fontFamily: "Ginto, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(2rem, 4vw, 2.375rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Ginto, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.71875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.01em"
rounded:
  squircle-container: "36px"
  squircle-inner: "24px"
  squircle-control: "16px"
  squircle-compact: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.squircle-control}"
    padding: "0 18px"
    height: "44px"
  input-field:
    backgroundColor: "{colors.input-bg-light}"
    rounded: "{rounded.squircle-control}"
    padding: "0 12px"
    height: "44px"
---

# Design System: OMP Web

## Overview

**Creative North Star: "The Minimalist Squircle Cockpit (Muted Warmth)"**

O OMP Web expressa uma estética minimalista, orgânica e sóbria que rejeita brancos estéreis ou contrastes agressivos em favor do sistema tonal autêntico do projeto: o espectro `--color-muted-*` (escala *Cocoa* no tema claro e escala *Slate* no tema escuro). Combinando a suavidade matemática das superelipses (`@progmruansilva/squircles`) com a elegância de baixa emissão de luz, a interface é tátil, acolhedora e direta ao ponto, eliminando subtítulos e ornamentos secundários.

**Key Characteristics:**
- **Sistema Tonal Muted Autêntico**: Substituição de brancos crus e cinzas frios pelos tokens `--color-muted-450` e variantes (`--color-muted-100` a `900`), garantindo calor no Light Mode (*Cocoa*) e calma mineral no Dark Mode (*Slate*).
- **Sem Subtítulos**: Títulos concisos e diretos; eliminação de legendas genéricas ou explicações redundantes sob cabeçalhos.
- **Geometria Squircle Nativa**: Curvatura superelíptica orgânica via `clip-path: var(--clip-path-squircle-*)` e traço perimetral contínuo de 1px com `clip-path: var(--clip-path-squircle-stroke-*)`.
- **Estrutura 2-Tier**: Moldura externa de acolhimento (bezel de 6px com desfoque) envolvendo o cartão de conteúdo interno.
- **Altura Unificada de Controles**: Entradas de texto e botões de ação primária compartilham altura padrão de 44px para ritmo visual coeso.

## Colors

A paleta ancora-se no sistema semântico `--color-muted-*` nativo da arquitetura do projeto original:

### Primary
- **Muted Slate / Muted Cocoa Action** (`rgb(var(--color-muted-450, 135 103 78))` no Light / `rgb(var(--color-muted-450, 82 92 123))` no Dark): Botões primários, ícones ativos e elementos de foco estrutural. Proporciona contraste confortável sem clarão ofuscante.
- **Muted Hover / Active State** (`rgb(var(--color-muted-550, 115 85 62))` no Light / `rgb(var(--color-muted-550, 102 113 148))` no Dark): Realce suave ao passar o cursor ou pressionar.

### Neutral
- **Muted Card Surface** (`rgb(var(--color-muted-100, 255 251 248) / 0.98)` Light / `rgb(var(--color-muted-150, 22 26 36) / 0.95)` Dark): Superfície principal acolhedora.
- **Input Fill** (`rgb(var(--color-muted-200, 246 232 221) / 0.30)` Light / `rgb(var(--color-muted-200, 31 36 49) / 0.50)` Dark): Fundo harmonioso e estável para campos de entrada.
- **Muted Stroke Overlay** (`rgb(var(--color-muted-450) / 0.20)` Light / `rgb(var(--color-muted-450) / 0.25)` Dark): Borda perimetral que define a silhueta da superelipse.
- **Focus Stroke Accent** (`rgb(var(--color-muted-450) / 0.70)` Light / `rgb(var(--color-muted-450) / 0.75)` Dark): Realce de foco sóbrio derivado da própria escala tonal do projeto.

### Named Rules
**The Authentic Muted Rule.** Botões, bordas e superfícies devem priorizar as variáveis `--color-muted-*` do projeto em vez de brancos duros (`#ffffff`) ou pretos crus (`#000000`). O tom deve respirar a escala Cocoa no light e Slate no dark.

**The No-Accent-Clutter Rule.** Cores saturadas (como ciano neon ou azul elétrico) são estritamente evitadas em caixas de ícones e anéis de foco cotidianos; o tom `color-muted-450` resolve toda a cadência estrutural.

## Typography

**Display / Header Font:** Ginto (com fallback `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
**Body / UI Font:** System Sans (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
**Mono Font:** Cascadia Code

### Hierarchy
- **Title / Modal Header** (SemiBold 600, 17px, line-height 1.25, tracking -0.01em): Título único e direto.
- **Field Label** (SemiBold 600, 11.5px, line-height 1.2, tracking 0.01em): Rótulo superior do campo na cor `color-muted-450`.
- **Input Text** (Regular 400, 13.5px, line-height 1.4): Texto digitado e valores de entrada.
- **Button Text** (SemiBold 600, 13.5px, line-height 1.2): Texto da ação principal ("Entrar") em branco puro sobre o fundo `color-muted-450`.

### Named Rules
**The No-Subheading Doctrine.** Somos minimalistas e diretos ao assunto. Títulos de telas, modais e cartões devem ser autossuficientes. Subtítulos descritivos e slogans genéricos são eliminados.

## Layout

- **Estrutura 2-Tier do Composer**:
  - Container Externo: Moldura translúcida com 6px de padding e `clip-path: var(--clip-path-squircle-36)`.
  - Cartão Interno: Cartão de conteúdo concêntrico com `clip-path: var(--clip-path-squircle-24)`.
- **Ritmo Vertical Compacto**:
  - Espaçamento de 12px entre campos de formulário.
  - Espaçamento de 18px entre o último campo e o botão de ação primária.
  - Padding interno equilibrado de 22px a 24px no cartão.
- **Altura Unificada**:
  - Inputs e botões primários medem rigorosamente **44px** de altura, garantindo harmonia visual e área de toque perfeita em desktop e touch.

## Elevation & Depth

Superfícies recortadas com superelipses utilizam:
1. `filter: drop-shadow(0 20px 36px rgba(0, 0, 0, 0.22))` no wrapper pai, preservando o contorno exato da superelipse.
2. Backdrop acrílico com `backdrop-filter: blur(16px)` escurecendo a tela de fundo.
3. Máscara de stroke perimetral de 1px com `clip-path: var(--clip-path-squircle-stroke-*)`.

### Named Rules
**The Squircle Shadow Rule.** Todo elemento que utiliza `clip-path: var(--clip-path-squircle-*)` deve projetar sombra a partir do wrapper container com `filter: drop-shadow(...)`, nunca por `box-shadow` direto.

## Shapes

- **Superelipse Squircle**:
  - Modais e Cartões: `clip-path: var(--clip-path-squircle-36);`
  - Campos de Entrada e Botões: `clip-path: var(--clip-path-squircle-16);`
  - Botão Fechar e Ícones: `clip-path: var(--clip-path-squircle-16);` ou circular para controles auxiliares.
- **Overlay de Borda**:
  - Camada absoluta com `clip-path: var(--clip-path-squircle-stroke-36);` e `clip-path: var(--clip-path-squircle-stroke-16);` fornecendo traços perfeitamente contínuos e matemáticos sem anti-aliasing borrado.

### Named Rules
**The Pure Squircle Rule.** Componentes principais de interação e cartões usam as superelipses nativas da biblioteca `@progmruansilva/squircles`, evitando o clássico formato de cantos cilíndricos padrão.

## Components

### Squircle Modal
- **Estrutura**: Wrapper com `filter: drop-shadow(...)` contendo o card `squircle-36` e a camada de traço `squircle-stroke-36`.
- **Cabeçalho**: Título único à esquerda, botão fechar à direita. Sem subtítulo.
- **Fundo**: Superfície `color-muted-100` no Light, `color-muted-150` no Dark.

### Squircle Input
- **Shape**: `clip-path: var(--clip-path-squircle-16);` com altura de 44px.
- **Traço**: Camada absoluta com `clip-path: var(--clip-path-squircle-stroke-16);` colorida por `color-muted-450`.
- **Foco**: Realce suave de traço com opacidade de 70% em `color-muted-450`.

### Squircle Button
- **Shape**: `clip-path: var(--clip-path-squircle-16);` com altura de 44px idêntica aos inputs.
- **Cor**: Preenchimento `color-muted-450` com texto em alto contraste e hover para `color-muted-550`.
- **Interação**: Micro-escala (`scale: 0.99`) e transição tonal suave.

## Do's and Don'ts

### Do:
- **Do** usar os tokens `--color-muted-450` e variantes para botões, bordas e fundos no lugar de brancos estéreis.
- **Do** utilizar as classes e variáveis de superelipse (`squircle-36`, `squircle-16`, `squircle-stroke-*`).
- **Do** manter a altura uniforme de 44px em campos de entrada e botões principais.
- **Do** manter títulos diretos e eliminar subtítulos supérfluos.
- **Do** usar `filter: drop-shadow(...)` no elemento pai de um squircle para preservar sombras fiéis à curvatura.

### Don't:
- **Don't** aplicar branco puro não atenuado em botões principais de tema escuro.
- **Don't** adicionar subtítulos explicativos, frases de boas-vindas genéricas ou slogans abaixo de cabeçalhos simples.
- **Don't** aplicar cores de acento neon/ciano em anéis de foco, fundos de ícones ou bordas rotineiras.
- **Don't** usar `box-shadow` diretamente em nós com `clip-path` (ele será cortado).
- **Don't** criar inputs com alturas díspares da altura dos botões de ação do mesmo formulário.
