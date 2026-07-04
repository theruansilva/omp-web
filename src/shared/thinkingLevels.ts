// `Effort` is a const enum — bundler module resolution can't resolve
// Effort.Minimal etc. across module boundaries, so `ThinkingLevel` from
// @oh-my-pi/pi-agent-core resolves to `"inherit" | "off"` only.
// Define our own union that includes the effort levels as raw strings.
export type ThinkingLevel = "off" | "inherit" | "minimal" | "low" | "medium" | "high" | "xhigh";

export const KNOWN_THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh"] as const satisfies readonly ThinkingLevel[];

export function isKnownThinkingLevel(value: string): value is ThinkingLevel {
 return KNOWN_THINKING_LEVELS.some((level) => level === value);
}

export function thinkingLevelLabel(level: string | undefined): string {
 return level === undefined || level === "" ? "off" : level;
}

export interface ThinkingGauge {
 /** Number of bars to render (the non-"off" levels). */
 total: number;
 /** Number of filled bars for the current level. */
 filled: number;
}

/**
 * Describe a thinking-level gauge from the available set rather than a hardcoded
 * table, so it stays correct even if pi changes the available levels at runtime.
 *
 * Convention: the first available level is treated as "no thinking". The gauge
 * therefore renders one bar per remaining level, and fills up to the current
 * level's rank. An unknown current level fills 0 bars instead of throwing.
 */
export function thinkingGauge(level: string | undefined, available: readonly string[]): ThinkingGauge {
 const pool = available.length >= 2 ? available : KNOWN_THINKING_LEVELS;
 const total = pool.length - 1;
 const normalized = thinkingLevelLabel(level);
 const index = pool.indexOf(normalized);
 const filled = index <= 0 ? 0 : Math.min(index, total);
 return { total, filled };
}
