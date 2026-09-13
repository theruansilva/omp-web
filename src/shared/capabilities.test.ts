import { describe, expect, it } from "bun:test";
import { effectiveOmpWebCapabilities, OMP_WEB_CAPABILITIES, SESSIOND_RUNTIME_CAPABILITIES, WEB_RUNTIME_CAPABILITIES, parseKnownOmpWebCapabilities } from "./capabilities";

describe("PI WEB capabilities", () => {
  it("advertises web-only capabilities without requiring session daemon support", () => {
    expect(WEB_RUNTIME_CAPABILITIES).toContain(OMP_WEB_CAPABILITIES.piPackagesManage);
    expect(WEB_RUNTIME_CAPABILITIES).toContain(OMP_WEB_CAPABILITIES.selectedMachineSettings);
    expect(SESSIOND_RUNTIME_CAPABILITIES).not.toContain(OMP_WEB_CAPABILITIES.piPackagesManage);
    expect(SESSIOND_RUNTIME_CAPABILITIES).not.toContain(OMP_WEB_CAPABILITIES.selectedMachineSettings);

    expect(effectiveOmpWebCapabilities({
      web: { available: true, capabilities: [OMP_WEB_CAPABILITIES.piPackagesManage, OMP_WEB_CAPABILITIES.selectedMachineSettings] },
      sessiond: { available: false, capabilities: [] },
    })).toEqual([OMP_WEB_CAPABILITIES.piPackagesManage, OMP_WEB_CAPABILITIES.selectedMachineSettings]);
  });

  it("keeps only known string capabilities when parsing runtime data", () => {
    expect(parseKnownOmpWebCapabilities([OMP_WEB_CAPABILITIES.piPackagesManage, OMP_WEB_CAPABILITIES.selectedMachineSettings, "future.capability"])).toEqual([OMP_WEB_CAPABILITIES.piPackagesManage, OMP_WEB_CAPABILITIES.selectedMachineSettings]);
    expect(parseKnownOmpWebCapabilities([OMP_WEB_CAPABILITIES.piPackagesManage, 1])).toBeUndefined();
  });
});
