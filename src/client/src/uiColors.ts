export interface UiColorsConfig {
  hue: number;
  chroma: number;
  enabled: boolean;
}

export interface UiColorPreset {
  id: string;
  name: string;
  hue: number;
  chroma: number;
  description: string;
}

export const DEFAULT_UI_COLORS: UiColorsConfig = {
  hue: 264,
  chroma: 0.05,
  enabled: true,
};

export const UI_COLOR_PRESETS: UiColorPreset[] = [
  { id: "default", name: "UI Colors", hue: 264, chroma: 0.05, description: "Equilíbrio padrão do template UI Colors" },
  { id: "copilot", name: "Copilot Slate", hue: 260, chroma: 0.015, description: "Sóbrio e minimalista" },
  { id: "cocoa", name: "Warm Cocoa", hue: 56, chroma: 0.03, description: "Tons quentes de pedra e café" },
  { id: "ocean", name: "Ocean Sky", hue: 220, chroma: 0.08, description: "Azul tecnológico e límpido" },
  { id: "emerald", name: "Emerald", hue: 155, chroma: 0.06, description: "Verde esmeralda equilibrado" },
  { id: "amber", name: "Amber Gold", hue: 45, chroma: 0.08, description: "Dourado aconchegante" },
  { id: "rose", name: "Crimson Rose", hue: 350, chroma: 0.07, description: "Rosa magenta moderno" },
  { id: "neutral", name: "Monocromático", hue: 260, chroma: 0.0, description: "Neutro puro sem saturação" },
];

export const UI_COLORS_STORAGE_KEY = "omp-web:ui-colors";
export const UI_COLORS_CHANGED_EVENT = "omp-web-ui-colors-changed";

export function loadUiColors(): UiColorsConfig {
  try {
    if (typeof localStorage === "undefined") return { ...DEFAULT_UI_COLORS };
    const raw = localStorage.getItem(UI_COLORS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_UI_COLORS };
    const parsed = JSON.parse(raw) as Partial<UiColorsConfig>;
    return {
      hue: typeof parsed.hue === "number" && !isNaN(parsed.hue) ? Math.min(360, Math.max(0, parsed.hue)) : DEFAULT_UI_COLORS.hue,
      chroma: typeof parsed.chroma === "number" && !isNaN(parsed.chroma) ? Math.min(0.2, Math.max(0, parsed.chroma)) : DEFAULT_UI_COLORS.chroma,
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_UI_COLORS.enabled,
    };
  } catch {
    return { ...DEFAULT_UI_COLORS };
  }
}

export function resolveUiColorVars(hue: number, chroma: number, isLight: boolean): Record<string, string> {
  const hueSecondary = (hue + 180) % 360;
  const chromaBg = +(chroma * 0.5).toFixed(3);
  const chromaText = +Math.min(chroma, 0.1).toFixed(3);
  const chromaAction = +Math.max(chroma, 0.1).toFixed(3);
  const chromaAlert = +Math.max(chroma, 0.05).toFixed(3);

  if (!isLight) {
    // Dark mode
    return {
      "--hue": `${hue}`,
      "--hue-secondary": `${hueSecondary}`,
      "--chroma": `${chroma}`,
      "--chroma-bg": `${chromaBg}`,
      "--chroma-text": `${chromaText}`,
      "--chroma-action": `${chromaAction}`,
      "--chroma-alert": `${chromaAlert}`,
      "--bg-dark": `oklch(0.1 ${chromaBg} ${hue})`,
      "--bg": `oklch(0.15 ${chromaBg} ${hue})`,
      "--bg-light": `oklch(0.2 ${chromaBg} ${hue})`,
      "--gradient": `linear-gradient(0deg, oklch(0.15 ${chromaBg} ${hue}) 97%, oklch(0.2 ${chromaBg} ${hue}))`,
      "--gradient-hover": `linear-gradient(0deg, oklch(0.15 ${chromaBg} ${hue}), oklch(0.2 ${chromaBg} ${hue}))`,
      "--text": `oklch(0.96 ${chromaText} ${hue})`,
      "--text-muted": `oklch(0.76 ${chromaText} ${hue})`,
      "--highlight": `oklch(0.5 ${chroma} ${hue})`,
      "--border": `oklch(0.4 ${chroma} ${hue})`,
      "--border-muted": `oklch(0.3 ${chroma} ${hue})`,
      "--border-card": `solid 1px oklch(0.3 ${chroma} ${hue})`,
      "--primary": `oklch(0.76 ${chromaAction} ${hue})`,
      "--secondary": `oklch(0.76 ${chromaAction} ${hueSecondary})`,
      "--danger": `oklch(0.7 ${chromaAlert} 30)`,
      "--warning": `oklch(0.7 ${chromaAlert} 100)`,
      "--success": `oklch(0.7 ${chromaAlert} 160)`,
      "--info": `oklch(0.7 ${chromaAlert} 260)`,
      "--shadow": `0px 2px 2px oklch(0 0 0 / 0.2), 0px 4px 4px oklch(0 0 0 / 0.1)`,
    };
  } else {
    // Light mode
    return {
      "--hue": `${hue}`,
      "--hue-secondary": `${hueSecondary}`,
      "--chroma": `${chroma}`,
      "--chroma-bg": `${chromaBg}`,
      "--chroma-text": `${chromaText}`,
      "--chroma-action": `${chromaAction}`,
      "--chroma-alert": `${chromaAlert}`,
      "--bg-dark": `oklch(0.92 ${chromaBg} ${hue})`,
      "--bg": `oklch(0.96 ${chromaBg} ${hue})`,
      "--bg-light": `oklch(1 ${chromaBg} ${hue})`,
      "--gradient": `linear-gradient(0deg, oklch(0.96 ${chromaBg} ${hue}) 97%, oklch(1 ${chromaBg} ${hue}))`,
      "--gradient-hover": `linear-gradient(0deg, oklch(0.96 ${chromaBg} ${hue}), oklch(1 ${chromaBg} ${hue}))`,
      "--text": `oklch(0.15 ${chroma} ${hue})`,
      "--text-muted": `oklch(0.4 ${chroma} ${hue})`,
      "--highlight": `oklch(1 ${chroma} ${hue})`,
      "--border": `oklch(0.6 ${chroma} ${hue})`,
      "--border-muted": `oklch(0.7 ${chroma} ${hue})`,
      "--border-card": `solid 1px oklch(0.96 ${chromaBg} ${hue})`,
      "--primary": `oklch(0.4 ${chromaAction} ${hue})`,
      "--secondary": `oklch(0.4 ${chromaAction} ${hueSecondary})`,
      "--danger": `oklch(0.5 ${chromaAlert} 30)`,
      "--warning": `oklch(0.5 ${chromaAlert} 100)`,
      "--success": `oklch(0.5 ${chromaAlert} 160)`,
      "--info": `oklch(0.5 ${chromaAlert} 260)`,
      "--shadow": `0px 2px 2px oklch(0 0 0 / 0.1), 0px 4px 4px oklch(0 0 0 / 0.05)`,
    };
  }
}

export function formatCssVarsText(vars: Record<string, string>): string {
  const keys = [
    "--bg-dark",
    "--bg",
    "--bg-light",
    "--text",
    "--text-muted",
    "--highlight",
    "--border",
    "--border-muted",
    "--primary",
    "--secondary",
    "--danger",
    "--warning",
    "--success",
    "--info",
  ];
  return keys
    .filter((k) => vars[k] !== undefined)
    .map((k) => `${k}: ${vars[k]};`)
    .join("\n");
}

export function applyUiColors(config: UiColorsConfig, isLight?: boolean): void {
  if (typeof document === "undefined" || !document.documentElement) return;
  const root = document.documentElement;
  if (!root.style || typeof root.style.setProperty !== "function") return;
  const light = isLight !== undefined ? isLight : !root.classList.contains("dark") && root.getAttribute("data-theme") !== "dark";

  if (!config.enabled) {
    root.removeAttribute("data-ui-colors");
    // Clear custom properties
    const keys = [
      "--hue",
      "--hue-secondary",
      "--chroma",
      "--chroma-bg",
      "--chroma-text",
      "--chroma-action",
      "--chroma-alert",
      "--bg-dark",
      "--bg",
      "--bg-light",
      "--gradient",
      "--gradient-hover",
      "--text",
      "--text-muted",
      "--highlight",
      "--border",
      "--border-muted",
      "--border-card",
      "--primary",
      "--secondary",
      "--danger",
      "--warning",
      "--success",
      "--info",
      "--shadow",
    ];
    for (const key of keys) {
      root.style.removeProperty(key);
    }
    return;
  }

  root.setAttribute("data-ui-colors", "true");
  const vars = resolveUiColorVars(config.hue, config.chroma, light);
  for (const [key, val] of Object.entries(vars)) {
    root.style.setProperty(key, val);
  }
}

export function saveUiColors(config: UiColorsConfig, isLight?: boolean): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(UI_COLORS_STORAGE_KEY, JSON.stringify(config));
    }
  } catch {
    // Ignore storage quota errors
  }
  applyUiColors(config, isLight);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(UI_COLORS_CHANGED_EVENT, { detail: config }));
  }
}

export function resetUiColors(isLight?: boolean): UiColorsConfig {
  const config = { ...DEFAULT_UI_COLORS };
  saveUiColors(config, isLight);
  return config;
}
