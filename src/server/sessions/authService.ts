import { AuthStorage, ModelRegistry, SqliteAuthCredentialStore } from "@oh-my-pi/pi-coding-agent";
import type { AuthProvidersResponse, AuthType, OAuthFlowState, AuthProviderStatus } from "../../shared/apiTypes.js";
import { getLoginProviderOptions, getLogoutProviderOptions, type AuthProviderModelRegistry } from "./authProviderOptions.js";
import { OAuthLoginFlowService } from "./oauthLoginFlowService.js";

/** Adapt omp ModelRegistry to omp-web's AuthProviderModelRegistry interface. */
function toAuthProviderModelRegistry(mr: ModelRegistry): AuthProviderModelRegistry {
 return {
  authStorage: mr.authStorage as unknown as AuthProviderModelRegistry["authStorage"],
  getAll: () => mr.getAll().map((m) => ({ provider: m.provider })),
  getProviderDisplayName: (provider: string) => mr.getProviderBaseUrl(provider) ?? provider,
  getProviderAuthStatus: (_provider: string): AuthProviderStatus => ({ configured: true }) as AuthProviderStatus,
 };
}

export interface AuthChange {
 removedProviderId?: string;
}

type AuthChangeListener = (change: AuthChange) => void;


export class AuthService {
 readonly modelRegistry: ModelRegistry;
 private readonly authFlows: OAuthLoginFlowService;
 private readonly listeners = new Set<AuthChangeListener>();

 constructor(deps: { modelRegistry: ModelRegistry; authFlows?: OAuthLoginFlowService }) {
  this.modelRegistry = deps.modelRegistry;
  this.authFlows = deps.authFlows ?? new OAuthLoginFlowService();
 }

 /**
  * Create an AuthService with the given or default model registry.
  * The default path uses an in-memory auth storage.
  */
 static async create(deps: { modelRegistry?: ModelRegistry; authFlows?: OAuthLoginFlowService } = {}): Promise<AuthService> {
  const modelRegistry = deps.modelRegistry ?? await createDefaultModelRegistry();
  return new AuthService({ modelRegistry, ...(deps.authFlows === undefined ? {} : { authFlows: deps.authFlows }) });
 }

 subscribe(listener: AuthChangeListener): () => void {
  this.listeners.add(listener);
  return () => {
   this.listeners.delete(listener);
  };
 }

 dispose(): void {
  this.authFlows.dispose();
  this.listeners.clear();
 }

 async authProviders(mode: "login" | "logout", authType?: AuthType): Promise<AuthProvidersResponse> {
  await this.modelRegistry.refresh();
  const adapted = toAuthProviderModelRegistry(this.modelRegistry);
  const providers = mode === "logout" ? getLogoutProviderOptions(adapted) : getLoginProviderOptions(adapted, authType);
  return { providers };
 }

 async saveApiKey(providerId: string, key: string): Promise<{ accepted: true }> {
  if (key.trim() === "") throw new Error("API key is required");
  await this.modelRegistry.authStorage.set(providerId, { type: "api_key" as const, key });
  await this.refreshAuthState();
  return { accepted: true };
 }

 async logoutProvider(providerId: string): Promise<{ accepted: true }> {
  await this.modelRegistry.authStorage.logout(providerId);
  await this.refreshAuthState({ removedProviderId: providerId });
  return { accepted: true };
 }

 startOAuthLogin(providerId: string): OAuthFlowState {
  const provider = this.requireOAuthLoginProvider(providerId);
  const view = this.authFlows.start({
   providerId,
   providerName: provider.name,
   authStorage: this.modelRegistry.authStorage,
  });
  return { ...view, providerId, providerName: provider.name };
 }

 oauthFlow(flowId: string): OAuthFlowState {
  const view = this.authFlows.get(flowId);
  return { ...view, providerId: "", providerName: "" };
 }

 respondToOAuthFlow(flowId: string, requestId: string, value: string): OAuthFlowState {
  const view = this.authFlows.respond(flowId, requestId, value);
  return { ...view, providerId: "", providerName: "" };
 }
 cancelOAuthFlow(flowId: string): OAuthFlowState {
  this.authFlows.cancel(flowId);
  const view = this.authFlows.get(flowId);
  return { ...view, providerId: "", providerName: "" };
 }

 private async refreshAuthState(change: AuthChange = {}): Promise<void> {
  await this.modelRegistry.authStorage.reload();
  await this.modelRegistry.refresh();
  this.emit(change);
 }

 private emit(change: AuthChange): void {
  for (const listener of this.listeners) listener(change);
 }

 private requireOAuthLoginProvider(providerId: string) {
  const adapted = toAuthProviderModelRegistry(this.modelRegistry);
  const provider = getLoginProviderOptions(adapted, "oauth").find((option) => option.id === providerId);
  if (provider === undefined) throw new Error(`OAuth provider not found: ${providerId}`);
  return provider;
 }
}

async function createDefaultModelRegistry(): Promise<ModelRegistry> {
 const store = await SqliteAuthCredentialStore.open();
 const authStorage = new AuthStorage(store);
 await authStorage.reload();
 return new ModelRegistry(authStorage);
}
