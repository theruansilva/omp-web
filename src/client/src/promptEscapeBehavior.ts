export interface PromptEscapeActions {
  closeCompletions: () => void;
  blur: () => void;
  onEscape?: () => void;
}

export function handlePromptEscapeAction(
  hasCompletions: boolean,
  actions: PromptEscapeActions,
): boolean {
  if (hasCompletions) {
    actions.closeCompletions();
    return true;
  }
  actions.blur();
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
  relatedTarget: unknown,
  onEscape?: () => void,
): void {
  if (relatedTarget === null || relatedTarget === undefined) {
    onEscape?.();
  }
}
