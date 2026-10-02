---
name: OMP Web
description: Minimalist squircle cockpit with dynamic OKLCH UI Colors palette, Muted scale, 2-tier framing, and superellipse geometry
colors:
  # Dynamic UI Colors (OKLCH - User Customizable via Hue & Chroma)
  hue: "var(--hue, 264)"
  chroma: "var(--chroma, 0.05)"
  
  # Semantic Surface Roles
  bg-dark: "var(--bg-dark)"
  bg-canvas: "var(--bg)"
  bg-light: "var(--bg-light)"
  surface-card: "var(--omp-card-bg, var(--bg))"
  
  # Primary & Action (Tonal & Dynamic)
  primary: "var(--primary, rgb(var(--color-muted-450, 135 103 78)))"
  primary-dark: "var(--primary, rgb(var(--color-muted-450, 82 92 123)))"
  secondary: "var(--secondary)"
  
  # Borders & Highlight
  highlight: "var(--highlight)"
  border: "var(--border)"
  border-muted: "var(--border-muted)"
  
  # Typography & Contrast
  text-primary: "var(--text, text-foreground-900)"
  text-muted: "var(--text-muted, text-foreground-600)"
  
  # Alerts
  danger: "var(--danger)"
  warning: "var(--warning)"
  success: "var(--success)"
  info: "var(--info)"

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
  squircle-card: "28px"
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
  card:
    className: "omp-settings-card"
    rounded: "{rounded.squircle-card}"
    clipPath: "var(--clip-path-squircle-28, none)"
    padding: "20px md:24px"
  card-acrylic:
    className: "ui-colors-preview-card"
    background: "var(--gradient)"
    border: "var(--border-card)"
    borderTop: "1px solid var(--highlight)"
    shadow: "var(--shadow)"
  button-primary:
    backgroundColor: "var(--primary)"
    textColor: "#ffffff"
    rounded: "{rounded.squircle-control}"
    padding: "0 18px"
    height: "44px"
  input-field:
    backgroundColor: "var(--bg)"
    textColor: "var(--text)"
    borderColor: "var(--border-muted)"
    rounded: "{rounded.squircle-control}"
    padding: "0 12px"
    height: "44px"
---

# Design System: OMP Web

## 1. Overview & North Star

**Creative North Star: "The Minimalist Squircle Cockpit (Adaptive Warmth)"**

O OMP Web expressa uma estética minimalista, orgânica e sóbria que rejeita brancos estéreis ou contrastes agressivos (#000/#fff) em favor de um sistema tonal dinâmico e perceptual baseado no modelo **OKLCH (UI Colors)**. A interface combina a suavidade matemática das superelipses (`@progmruansilva/squircles`) com a elegância de baixa emissão de luz, proporcionando profundidade tátil, acolhimento e clareza direta, sem ornamentos supérfluos.

### Características Principais:
1. **Paleta Dinâmica UI Colors (OKLCH)**: O usuário tem a liberdade de personalizar sua paleta nas configurações (Aparência & Tema -> UI Colors), ajustando **Matiz (Hue)** e **Saturação (Chroma)** com feedback em tempo real. A base padrão é o tom Slate/Muted no tema escuro e Cocoa/Warm Stone no tema claro.
2. **Proibição Estrita de Preto e Branco Crus (Anti-Black / Anti-White)**: Nenhuma superfície, card ou container usa `#000000` (`bg-black`) ou `#ffffff` (`bg-white`). Superfícies utilizam tokens do tema (`var(--bg)`, `var(--omp-card-bg)`, `.omp-settings-card`).
3. **Geometria Squircle Nativa**: Curvatura superelíptica orgânica via `clip-path: var(--clip-path-squircle-*)` (28px para cards, 16px para botões/inputs, 36px/60px para cabeçalhos e modais) combinada com `filter: drop-shadow(...)`.
4. **Light DOM em Lit Components**: Todo componente visual desativa o Shadow DOM para permitir a estilização completa via classes utilitárias do Tailwind e tokens globais.
5. **Altura Unificada de Controles**: Entradas de texto e botões de ação primária compartilham altura padrão de **44px** para ritmo visual coeso e toque ergonômico.

---

## 2. Cores & Tokens Semânticos

A paleta é orientada por papéis semânticos no espaço de cor OKLCH:

### 2.1 Superfícies & Fundos
- **Canvas / Background Geral**: `var(--omp-bg)` ou `bg-background-light dark:bg-background-dark`
  - Modo Claro: `oklch(98.5% var(--chroma-bg) var(--hue))` (Base suave de pedra aquecida)
  - Modo Escuro: `oklch(14.5% var(--chroma-bg) var(--hue))` (Base profunda Slate sem ser preto cru)
- **Cards e Painéis**: `.omp-settings-card` ou `var(--omp-card-bg)` ou `.ui-colors-preview-card`
  - Relevo suave com borda sutil e fundo adaptativo.
- **Fundo Elevado / Popovers / Menus**: `var(--omp-surface-popover)` com `backdrop-filter: blur(24px) saturate(180%)`.

### 2.2 Tipografia e Contraste
- **Texto Primário**: `text-foreground-900` ou `var(--text)`
  - Modo Claro: `oklch(0.15 var(--chroma) var(--hue))`
  - Modo Escuro: `oklch(0.96 var(--chroma-text) var(--hue))`
- **Texto Secundário / Muted**: `text-foreground-600` ou `var(--text-muted)`
  - Modo Claro: `oklch(0.4 var(--chroma) var(--hue))`
  - Modo Escuro: `oklch(0.76 var(--chroma-text) var(--hue))`

### 2.3 Ações & Estados
- **Ação Primária**: `var(--primary)` com texto branco (`#ffffff`)
  - Adapta-se ao Hue do usuário com luminosidade e saturação calibradas para WCAG AA.
- **Ação Secundária**: `var(--secondary)` com texto em alto contraste.
- **Bordas Sutis**: `border-black/10 dark:border-white/10` ou `var(--border-muted)`.
- **Bordas de Destaque / Luz**: `var(--highlight)` no topo dos cards para simular iluminação física.

### 2.4 Alertas & Semântica
- **Danger**: `var(--danger)` (`oklch(... 30)`)
- **Warning**: `var(--warning)` (`oklch(... 100)`)
- **Success**: `var(--success)` (`oklch(... 160)`)
- **Info**: `var(--info)` (`oklch(... 260)`)

---

## 3. Tipografia

- **Header / Títulos**: Ginto (fallback `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
- **Corpo / UI**: System Sans (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
- **Código / Monospaçado**: Cascadia Code, ui-monospace, Menlo, monospace

### Hierarquia:
- **Title / Modal Header**: SemiBold 600, 17px, line-height 1.25, tracking -0.01em. Título único e direto.
- **Field Label**: SemiBold 600, 11.5px, line-height 1.2, tracking 0.01em.
- **Input Text**: Regular 400, 13.5px, line-height 1.4.
- **Button Text**: SemiBold 600, 13.5px, line-height 1.2.

---

## 4. Geometria Squircle & Elevação

Todo elemento com superelipse usa:
1. `clip-path: var(--clip-path-squircle-28, none)` para cards (ou 16px para botões/inputs).
2. `filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.12))` no wrapper pai (nunca `box-shadow` direto no elemento com `clip-path`).
3. Bordas de contraste sutil para definir o perímetro contra o canvas.

---

## 5. Do's and Don'ts

### Do (O que SEMPRE fazer):
- **Do** declarar `protected override createRenderRoot() { return this; }` (Light DOM) em todo componente Lit de tela ou apresentação.
- **Do** usar os tokens semânticos (`var(--bg)`, `var(--omp-card-bg)`, `var(--text)`, `var(--text-muted)`, `var(--border-muted)`, `var(--primary)`) ou a classe `.omp-settings-card` / `.ui-colors-preview-card` para qualquer cartão.
- **Do** utilizar as classes e variáveis de superelipse (`squircle-28`, `squircle-16`, `squircle-container`).
- **Do** manter altura de **44px** em inputs e botões primários.
- **Do** manter títulos diretos e objetivos, eliminando subtítulos prolixos.
- **Do** usar `filter: drop-shadow(...)` no elemento pai de um squircle para preservar sombras fiéis à curvatura.

### Don't (O que NUNCA fazer):
- **Don't** NUNCA usar `bg-black`, `#000000`, `bg-white` ou `#ffffff` hardcoded em cards e superfícies. No escuro, `bg-black` cria um buraco negro sem relevo; no claro, `bg-white` quebra a paleta Cocoa.
- **Don't** NUNCA usar `text-black` ou `text-white` diretamente em cartões de conteúdo.
- **Don't** criar componentes Lit visuais sem `createRenderRoot() { return this; }` (o Shadow DOM bloqueará o Tailwind e causará estilos quebrados).
- **Don't** aplicar cores de destaque duras (`bg-blue-600`, `#2563eb`) em botões primários; use `bg-[var(--primary)]` para respeitar a paleta do usuário.
- **Don't** usar `box-shadow` diretamente em nós com `clip-path` (ele é cortado pela máscara; use `filter: drop-shadow` no wrapper pai).
- **Don't** adicionar subtítulos redundantes ou slogans genéricos abaixo de cabeçalhos simples.
