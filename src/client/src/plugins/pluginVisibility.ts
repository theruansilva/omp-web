export const HIDDEN_PLUGINS_STORAGE_KEY = "omp-web:hidden-plugins";

function storage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function readStoredHiddenPlugins(store = storage()): Set<string> {
  if (store === undefined) return new Set();
  try {
    const raw = store.getItem(HIDDEN_PLUGINS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((item): item is string => typeof item === "string"));
    }
  } catch {
    // Ignore invalid JSON or storage errors
  }
  return new Set();
}

export function writeStoredHiddenPlugins(hiddenIds: ReadonlySet<string>, store = storage()): void {
  if (store === undefined) return;
  try {
    store.setItem(HIDDEN_PLUGINS_STORAGE_KEY, JSON.stringify([...hiddenIds]));
  } catch {
    // Ignore storage quota or privacy errors
  }
}

export function isPanelHidden(
  panel: { id: string; pluginId?: string },
  hiddenIds: ReadonlySet<string>,
): boolean {
  return hiddenIds.has(panel.id) || (panel.pluginId !== undefined && hiddenIds.has(panel.pluginId));
}

export function setPluginHidden(
  pluginOrToolId: string,
  hidden: boolean,
  hiddenIds?: ReadonlySet<string>,
  store = storage(),
): Set<string> {
  const current = new Set(hiddenIds ?? readStoredHiddenPlugins(store));
  if (hidden) {
    current.add(pluginOrToolId);
  } else {
    current.delete(pluginOrToolId);
  }
  writeStoredHiddenPlugins(current, store);
  return current;
}

export function resetHiddenPlugins(store = storage()): Set<string> {
  const empty = new Set<string>();
  writeStoredHiddenPlugins(empty, store);
  return empty;
}
