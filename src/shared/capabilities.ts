import { OMP_WEB_CAPABILITIES, type OmpWebCapability, type OmpWebRuntimeComponent, type OmpWebServiceComponent } from "./apiTypes.js";

export { OMP_WEB_CAPABILITIES };
export type { OmpWebCapability };

export const KNOWN_OMP_WEB_CAPABILITIES = Object.values(OMP_WEB_CAPABILITIES);
const knownOmpWebCapabilities: ReadonlySet<string> = new Set(KNOWN_OMP_WEB_CAPABILITIES);

export const WEB_RUNTIME_CAPABILITIES = [
  OMP_WEB_CAPABILITIES.sessionsDeleteArchived,
  OMP_WEB_CAPABILITIES.sessionsBulkMutations,
  OMP_WEB_CAPABILITIES.sessionsCleanup,
  OMP_WEB_CAPABILITIES.sessionsReload,
  OMP_WEB_CAPABILITIES.promptAttachments,
  OMP_WEB_CAPABILITIES.workspaceFileSuggestions,
  OMP_WEB_CAPABILITIES.piPackagesManage,
  OMP_WEB_CAPABILITIES.selectedMachineSettings,
] as const satisfies readonly OmpWebCapability[];

export const SESSIOND_RUNTIME_CAPABILITIES = [
  OMP_WEB_CAPABILITIES.sessionsDeleteArchived,
  OMP_WEB_CAPABILITIES.sessionsBulkMutations,
  OMP_WEB_CAPABILITIES.sessionsCleanup,
  OMP_WEB_CAPABILITIES.sessionsReload,
  OMP_WEB_CAPABILITIES.promptAttachments,
] as const satisfies readonly OmpWebCapability[];

const EFFECTIVE_CAPABILITY_REQUIREMENTS = {
  [OMP_WEB_CAPABILITIES.sessionsDeleteArchived]: ["web", "sessiond"],
  [OMP_WEB_CAPABILITIES.sessionsBulkMutations]: ["web", "sessiond"],
  [OMP_WEB_CAPABILITIES.sessionsCleanup]: ["web", "sessiond"],
  [OMP_WEB_CAPABILITIES.sessionsReload]: ["web", "sessiond"],
  [OMP_WEB_CAPABILITIES.promptAttachments]: ["web", "sessiond"],
  [OMP_WEB_CAPABILITIES.workspaceFileSuggestions]: ["web"],
  [OMP_WEB_CAPABILITIES.piPackagesManage]: ["web"],
  [OMP_WEB_CAPABILITIES.selectedMachineSettings]: ["web"],
} as const satisfies Record<OmpWebCapability, readonly OmpWebServiceComponent[]>;

export function isOmpWebCapability(value: unknown): value is OmpWebCapability {
  return typeof value === "string" && knownOmpWebCapabilities.has(value);
}

export function supportsOmpWebCapability(source: { capabilities?: readonly OmpWebCapability[] } | undefined, capability: OmpWebCapability): boolean {
  return source?.capabilities?.includes(capability) === true;
}

export function parseKnownOmpWebCapabilities(value: unknown): OmpWebCapability[] | undefined {
  if (!Array.isArray(value) || !value.every((capability) => typeof capability === "string")) return undefined;
  return value.filter(isOmpWebCapability);
}

export function effectiveOmpWebCapabilities(components: Partial<Record<OmpWebServiceComponent, Pick<OmpWebRuntimeComponent, "available" | "capabilities">>>): OmpWebCapability[] {
  return KNOWN_OMP_WEB_CAPABILITIES.filter((capability) => {
    const requiredComponents = EFFECTIVE_CAPABILITY_REQUIREMENTS[capability];
    return requiredComponents.every((component) => {
      const runtime = components[component];
      return runtime?.available === true && supportsOmpWebCapability(runtime, capability);
    });
  });
}
