import { AuthStorage, ModelRegistry, type AuthCredentialEntry } from "@oh-my-pi/pi-coding-agent";
import { describe, expect, it } from "bun:test";
import { AuthService, type AuthChange } from "./authService.js";

describe("AuthService", () => {
  it("saves API keys and emits a global auth change", async () => {
    const { auth, authStorage, changes } = await createAuthService();

    await auth.saveApiKey("anthropic", "sk-test");

    expect(authStorage.get("anthropic")).toEqual({ type: "api_key", key: "sk-test" });
    expect(changes).toEqual([{}]);
    auth.dispose();
    authStorage.close();
  });

  it("logs out providers and emits the removed provider id", async () => {
    const { auth, authStorage, changes } = await createAuthService({ anthropic: { type: "api_key", key: "sk-test" } });

    await auth.logoutProvider("anthropic");

    expect(authStorage.get("anthropic")).toBeUndefined();
    expect(changes).toEqual([{ removedProviderId: "anthropic" }]);
    auth.dispose();
    authStorage.close();
  });

  it("rejects blank API keys", async () => {
    const { auth, authStorage, changes } = await createAuthService();

    await expect(auth.saveApiKey("anthropic", "   ")).rejects.toThrow("API key is required");
    expect(changes).toEqual([]);
    auth.dispose();
    authStorage.close();
  });

  it("returns OAuth providers including google-antigravity for login", async () => {
    const { auth, authStorage } = await createAuthService();

    const response = await auth.authProviders("login", "oauth");
    expect(response.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "google-antigravity",
          authType: "oauth",
          name: "Antigravity (Gemini 3, Claude, GPT-OSS)",
        }),
      ]),
    );

    auth.dispose();
    authStorage.close();
  });

  it("starts OAuth login for google-antigravity", async () => {
    const { auth, authStorage } = await createAuthService();

    const flow = auth.startOAuthLogin("google-antigravity");
    expect(flow.providerId).toBe("google-antigravity");
    expect(flow.providerName).toBe("Antigravity (Gemini 3, Claude, GPT-OSS)");
    expect(flow.status).toBe("running");

    auth.cancelOAuthFlow(flow.flowId);
    auth.dispose();
    authStorage.close();
  });
});

async function createAuthService(data: Record<string, AuthCredentialEntry> = {}) {
  const authStorage = await AuthStorage.create(":memory:");
  // Seed initial data
  for (const [provider, credential] of Object.entries(data)) {
    await authStorage.set(provider, credential);
  }
  await authStorage.reload();
  const modelRegistry = new ModelRegistry(authStorage);
  const auth = new AuthService({ modelRegistry });
  const changes: AuthChange[] = [];
  auth.subscribe((change) => { changes.push(change); });
  return { auth, authStorage, changes };
}
