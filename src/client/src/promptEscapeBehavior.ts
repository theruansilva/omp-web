export interface PromptEscapeActions {
  closeCompletions: () => void;
  blur?: (() => void) | undefined;
  onEscape?: (() => void) | undefined;
}

export function handlePromptEscapeAction(
  hasCompletions: boolean,
  actions: PromptEscapeActions,
): boolean {
  if (hasCompletions) {
    actions.closeCompletions();
    return true;
  }
  actions.blur?.();
  actions.onEscape?.();
  return true;
}

export function handlePromptShiftTabAction(
  shifted: boolean,
  escapeAction: () => boolean,
): boolean {
  if (shifted) return true;
  return escapeAction();
}

export function handlePromptBlurAction(
  _relatedTarget?: unknown,
  _onEscape?: () => void,
): void {
  // Do not steal focus or trigger onEscape on blur.
  // Blur events occur naturally when the user clicks elsewhere in the UI (e.g. sessions, tabs, buttons).
  // Stealing focus to .chat on blur aborts the browser's click event sequence, causing the first click to be swallowed.
}
