import type { OmpWebConfigResponse, OmpWebConfigValues } from "../../api";

export function spawnSessionsConfigPatch(enabled: boolean): OmpWebConfigValues {
  return { spawnSessions: enabled };
}

export function subsessionsConfigPatch(enabled: boolean): OmpWebConfigValues {
  return { subsessions: enabled };
}

export function mergeSelectedMachineSessiondConfig(base: OmpWebConfigResponse, selectedMachine: OmpWebConfigResponse): OmpWebConfigResponse {
  return {
    ...base,
    config: { ...base.config, ...selectedMachine.config },
    effectiveConfig: { ...base.effectiveConfig, ...selectedMachine.effectiveConfig },
    envOverrides: {
      ...base.envOverrides,
      spawnSessions: selectedMachine.envOverrides.spawnSessions,
      subsessions: selectedMachine.envOverrides.subsessions,
    },
  };
}
