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
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.71875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.01em"
  mono:
    fontFamily: "ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
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

### Core Characteristics:
1. **Dynamic UI Colors Palette (OKLCH)**: Users can customize their palette under Settings (Appearance & Theme -> UI Colors), adjusting **Hue** and **Chroma** with real-time feedback. Default bases are Slate/Muted in dark mode and Cocoa/Warm Stone in light mode.
2. **Strict Prohibition of Raw Black & White (Anti-Black / Anti-White)**: No surface, card, or container uses `#000000` (`bg-black`) or `#ffffff` (`bg-white`). Surfaces strictly utilize theme tokens (`var(--bg)`, `var(--omp-card-bg)`, `.omp-settings-card`).
3. **Native Squircle Geometry**: Organic superellipse curvature via `clip-path: var(--clip-path-squircle-*)` (28px for cards, 16px for buttons/inputs, 36px/60px for headers/modals) paired with `filter: drop-shadow(...)`.
4. **Light DOM in Lit Components**: All presentation components disable Shadow DOM to enable full styling via Tailwind utility classes and global theme tokens.
5. **Unified Control Height**: Text inputs and primary action buttons share a standard **44px** height for visual rhythm and ergonomic touch targets.

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
- **Primary Action**: `var(--primary)` with white text (`#ffffff`)
  - Adapts to user Hue with lightness and chroma calibrated for WCAG AA.
- **Secondary Action**: `var(--secondary)` with high-contrast text.
- **Subtle Borders**: `border-black/10 dark:border-white/10` or `var(--border-muted)`.
- **Highlight / Light Borders**: `var(--highlight)` on top of cards to simulate physical lighting.

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
- **Do** declare `protected override createRenderRoot() { return this; }` (Light DOM) in all presentation Lit components.
- **Do** use semantic tokens (`var(--bg)`, `var(--omp-card-bg)`, `var(--text)`, `var(--text-muted)`, `var(--border-muted)`, `var(--primary)`) or `.omp-settings-card` / `.ui-colors-preview-card` classes for cards.
- **Do** utilize superellipse classes and variables (`squircle-28`, `squircle-16`, `squircle-container`).
- **Do** maintain a **44px** height for inputs and primary buttons.
- **Do** keep headings direct and objective, eliminating verbose subtitles.
- **Do** use `filter: drop-shadow(...)` on the parent container of a squircle to preserve accurate curved shadows.

### Don't (What NEVER to do):
- **Don't** NEVER use hardcoded `bg-black`, `#000000`, `bg-white`, or `#ffffff` on cards and surfaces. In dark mode, `bg-black` creates an unreadable void; in light mode, `bg-white` breaks the warm Cocoa palette.
- **Don't** NUNCA usar `text-black` ou `text-white` diretamente em cartões de conteúdo.
- **Don't** create presentation Lit components without `createRenderRoot() { return this; }` (Shadow DOM blocks Tailwind utility classes).
- **Don't** apply hardcoded accent colors (`bg-blue-600`, `#2563eb`) to primary buttons; use `bg-[var(--primary)]` to respect the user's dynamic palette.
- **Don't** use `box-shadow` directly on elements with `clip-path` (it gets clipped by the mask; use `filter: drop-shadow` on the parent).
- **Don't** add redundant subtitles or generic slogans beneath clear headings.
