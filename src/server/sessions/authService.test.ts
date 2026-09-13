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
