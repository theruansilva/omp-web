import { describe, expect, it } from "bun:test";
import {
  emptyGatewayServerConfigDraft,
  gatewayServerConfigFromDraft,
  gatewayServerDraftFromConfig,
} from "./settingsConfigDraft.js";

describe("settingsConfigDraft", () => {
  it("initializes empty gateway draft with allowPrivateMachines false", () => {
    const draft = emptyGatewayServerConfigDraft();
    expect(draft.allowPrivateMachines).toBe(false);
  });

  it("extracts allowPrivateMachines from config", () => {
    const draft1 = gatewayServerDraftFromConfig({ allowPrivateMachines: true });
    expect(draft1.allowPrivateMachines).toBe(true);

    const draft2 = gatewayServerDraftFromConfig({});
    expect(draft2.allowPrivateMachines).toBe(false);
  });

  it("writes allowPrivateMachines to config from draft", () => {
    const draft = {
      host: "0.0.0.0",
      port: "8504",
      allowedHostsMode: "all" as const,
      allowedHostsText: "",
      allowPrivateMachines: true,
    };
    const config = gatewayServerConfigFromDraft(draft);
    expect(config.allowPrivateMachines).toBe(true);
    expect(config.host).toBe("0.0.0.0");
    expect(config.port).toBe(8504);
    expect(config.allowedHosts).toBe(true);
  });
});
