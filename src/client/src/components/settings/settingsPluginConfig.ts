import type { OmpWebConfigResponse, OmpWebConfigValues } from "../../api";

export function pluginEnabledConfigPatch(baseConfig: OmpWebConfigValues, pluginId: string, enabled: boolean): OmpWebConfigValues {
  const currentPlugins = baseConfig.plugins ?? {};
  const currentPluginConfig = currentPlugins[pluginId] ?? {};
  return {
    plugins: {
      ...currentPlugins,
      [pluginId]: { ...currentPluginConfig, enabled },
    },
  };
}

export function mergeSelectedMachinePluginConfig(base: OmpWebConfigResponse, selectedMachine: OmpWebConfigResponse): OmpWebConfigResponse {
  return {
    ...base,
    config: mergePluginConfig(base.config, selectedMachine.config),
    effectiveConfig: mergePluginConfig(base.effectiveConfig, selectedMachine.effectiveConfig),
  };
}

function mergePluginConfig(base: OmpWebConfigValues, selectedMachine: OmpWebConfigValues): OmpWebConfigValues {
  if (selectedMachine.plugins === undefined) return base;
  return { ...base, plugins: selectedMachine.plugins };
}
