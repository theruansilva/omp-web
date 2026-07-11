import type { OmpWebConfigResponse, OmpWebConfigValues } from "../../api";

export function mergeSelectedMachineAccessConfig(base: OmpWebConfigResponse, selectedMachine: OmpWebConfigResponse): OmpWebConfigResponse {
  return {
    ...base,
    config: mergeAccessConfig(base.config, selectedMachine.config),
    effectiveConfig: mergeAccessConfig(base.effectiveConfig, selectedMachine.effectiveConfig),
  };
}

function mergeAccessConfig(base: OmpWebConfigValues, selectedMachine: OmpWebConfigValues): OmpWebConfigValues {
  return {
    ...base,
    ...(selectedMachine.pathAccess === undefined ? {} : { pathAccess: selectedMachine.pathAccess }),
    ...(selectedMachine.uploads === undefined ? {} : { uploads: selectedMachine.uploads }),
    ...(selectedMachine.maxUploadBytes === undefined ? {} : { maxUploadBytes: selectedMachine.maxUploadBytes }),
  };
}
