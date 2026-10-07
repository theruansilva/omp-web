import { afterEach, describe, expect, it, vi } from "bun:test";
import "./OmpApp";
import { OmpApp } from "./OmpApp";
import { projectsApi, workspacesApi, sessionsApi } from "../api";

const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;
const originalLocation = (globalThis as any).location;

function installMockWindow(href: string, initialStorage: Record<string, string> = {}) {
  const url = new URL(href);
  const pushed: string[] = [];
  const replaced: string[] = [];
  const store = new Map<string, string>(Object.entries(initialStorage));

  const fakeLocation = {
    href: url.href,
    origin: url.origin,
    protocol: url.protocol,
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
  };

  const fakeLocalStorage = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
    get length() {
      return store.size;
    },
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
  };

  const fakeWindow = {
    innerWidth: 1024,
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    setTimeout: globalThis.setTimeout.bind(globalThis),
    location: fakeLocation,
    history: {
      pushState: vi.fn((_state: object, _title: string, next: URL | string) => {
        pushed.push(String(next));
        const nextUrl = new URL(String(next), url.origin);
        fakeLocation.href = nextUrl.href;
        fakeLocation.pathname = nextUrl.pathname;
        fakeLocation.search = nextUrl.search;
        fakeLocation.hash = nextUrl.hash;
      }),
      replaceState: vi.fn((_state: object, _title: string, next: URL | string) => {
        replaced.push(String(next));
        const nextUrl = new URL(String(next), url.origin);
        fakeLocation.href = nextUrl.href;
        fakeLocation.pathname = nextUrl.pathname;
        fakeLocation.search = nextUrl.search;
        fakeLocation.hash = nextUrl.hash;
      }),
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  Object.defineProperty(globalThis, "window", { value: fakeWindow, configurable: true });
  Object.defineProperty(globalThis, "location", { value: fakeLocation, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: fakeLocalStorage, configurable: true });

  return { fakeWindow, fakeLocalStorage, pushed, replaced, store };
}

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: originalLocalStorage, configurable: true });
  if (originalLocation !== undefined) {
    Object.defineProperty(globalThis, "location", { value: originalLocation, configurable: true });
  } else {
    delete (globalThis as any).location;
  }
});

describe("OmpApp integration", () => {
  it("registers custom element and renders shell", () => {
    expect(customElements.get("omp-app")).toBeDefined();
    const app = new OmpApp();
    const rendered = app.render();
    expect(rendered).toBeDefined();
  });

  it("exposes internal state and helpers", () => {
    const app = new OmpApp();
    expect(app).toBeInstanceOf(OmpApp);
  });

  it("formats sidebar sessions: mutes archived sessions and strips 'agora'", () => {
    const app = new OmpApp();
    (app as any).selectedProjectId = "proj-1";
    (app as any).workspacesByProject = {
      "proj-1": [{ id: "ws-1", projectId: "proj-1", name: "main", path: "/test/ws", isPrimary: true }],
    };
    (app as any).selectedWorkspaceId = "ws-1";
    (app as any).sessionsByCwd = {
      "/test/ws": [
        { id: "s1", name: "Archived Session", archived: true, created: "2026-09-26T00:00:00.000Z", modified: "2026-09-26T12:00:00.000Z" },
        { id: "s2", name: "Active Session", archived: false, created: "2026-09-26T00:00:00.000Z", modified: new Date().toISOString() },
      ],
    };
    const sidebarSessions = (app as any).getSidebarSessions();
    expect(sidebarSessions).toHaveLength(2);
    expect(sidebarSessions[0]).toEqual({
      id: "s1",
      title: "Archived Session",
      updatedAt: undefined,
      projectId: "proj-1",
      archived: true,
      isWorking: false,
      isUnread: false,
    });
    expect(sidebarSessions[1].archived).toBe(false);
    expect(sidebarSessions[1].updatedAt).toBe("agora");
  });

  it("restores session and project from URL on reload (connectedCallback)", () => {
    installMockWindow("http://localhost:8504/omp?session=sess-abc-123&project=proj-xyz");
    const app = new OmpApp();
    (app as any).performUpdate = () => {};
    vi.spyOn(app as any, "loadProjects").mockResolvedValue(undefined as any);
    vi.spyOn(app as any, "loadMachines").mockResolvedValue(undefined as any);
    vi.spyOn((app as any).realtimeSocket, "connect").mockImplementation(() => {});
    vi.spyOn((app as any), "refreshActiveSessions").mockResolvedValue(undefined as any);
    app.connectedCallback();

    expect((app as any).selectedSessionId).toBe("sess-abc-123");
    expect((app as any).selectedProjectId).toBe("proj-xyz");
    expect((app as any).activeTab).toBe("new-chat");
  });

  it("restores session from localStorage when URL has no session param", () => {
    installMockWindow("http://localhost:8504/omp", {
      "omp:selected-session": "sess-stored-456",
      "omp:selected-project": "proj-stored",
    });
    const app = new OmpApp();
    (app as any).performUpdate = () => {};
    vi.spyOn(app as any, "loadProjects").mockResolvedValue(undefined as any);
    vi.spyOn(app as any, "loadMachines").mockResolvedValue(undefined as any);
    vi.spyOn((app as any).realtimeSocket, "connect").mockImplementation(() => {});
    vi.spyOn((app as any), "refreshActiveSessions").mockResolvedValue(undefined as any);
    app.connectedCallback();

    expect((app as any).selectedSessionId).toBe("sess-stored-456");
    expect((app as any).selectedProjectId).toBe("proj-stored");
    expect((app as any).activeTab).toBe("new-chat");
  });

  it("does NOT restore session from storage when URL explicitly specifies tab=new-chat", () => {
    installMockWindow("http://localhost:8504/omp?tab=new-chat", {
      "omp:selected-session": "sess-stored-456",
      "omp:selected-project": "proj-stored",
    });
    const app = new OmpApp();
    (app as any).performUpdate = () => {};
    vi.spyOn(app as any, "loadProjects").mockResolvedValue(undefined as any);
    vi.spyOn(app as any, "loadMachines").mockResolvedValue(undefined as any);
    vi.spyOn((app as any).realtimeSocket, "connect").mockImplementation(() => {});
    vi.spyOn((app as any), "refreshActiveSessions").mockResolvedValue(undefined as any);
    app.connectedCallback();

    expect((app as any).selectedSessionId).toBe("");
    expect((app as any).activeTab).toBe("new-chat");
  });

  it("syncs URL and localStorage when selectSession is called", async () => {
    const { replaced, store } = installMockWindow("http://localhost:8504/omp");
    const app = new OmpApp();
    (app as any).selectedProjectId = "proj-1";
    (app as any).workspacesByProject = {
      "proj-1": [{ id: "ws-1", projectId: "proj-1", name: "main", path: "/test/ws", isPrimary: true }],
    };
    (app as any).selectedWorkspaceId = "ws-1";

    vi.spyOn(sessionsApi, "messages").mockResolvedValue([] as any);
    vi.spyOn(sessionsApi, "status").mockResolvedValue({} as any);
    vi.spyOn((app as any).sessionSocket, "connect").mockImplementation(() => {});

    await (app as any).selectSession("sess-target-789", "/test/ws");

    expect((app as any).selectedSessionId).toBe("sess-target-789");
    expect(store.get("omp:selected-session")).toBe("sess-target-789");
    expect(store.get("omp:selected-project")).toBe("proj-1");
    expect(replaced.length).toBeGreaterThan(0);
    expect(replaced.at(-1)).toContain("session=sess-target-789");
  });

  it("navigates to settings tab and renders omp-settings-view", () => {
    installMockWindow("http://localhost:8504/omp?tab=settings");
    const app = new OmpApp();
    (app as any).performUpdate = () => {};
    vi.spyOn(app as any, "loadProjects").mockResolvedValue(undefined as any);
    vi.spyOn(app as any, "loadMachines").mockResolvedValue(undefined as any);
    vi.spyOn((app as any).realtimeSocket, "connect").mockImplementation(() => {});
    vi.spyOn((app as any), "refreshActiveSessions").mockResolvedValue(undefined as any);
    app.connectedCallback();

    expect((app as any).activeTab).toBe("settings");
    expect((app as any).getHeaderTitle()).toBe("Configurações");
    const str = JSON.stringify(app.render());
    expect(str).toContain("omp-settings-view");
  });

  it("clears session from URL and storage when navigating to new-chat", () => {
    const { store } = installMockWindow("http://localhost:8504/omp?session=sess-old", {
      "omp:selected-session": "sess-old",
    });
    const app = new OmpApp();
    (app as any).selectedSessionId = "sess-old";

    (app as any).handleNavSelect("new-chat");

    expect((app as any).selectedSessionId).toBe("");
    expect(store.has("omp:selected-session")).toBe(false);
  });

  it("loadProjects maintains the target session when reloading", async () => {
    installMockWindow("http://localhost:8504/omp?session=sess-target&project=proj-1");
    const app = new OmpApp();
    (app as any).selectedSessionId = "sess-target";
    (app as any).selectedProjectId = "proj-1";

    vi.spyOn(projectsApi, "projects").mockResolvedValue([
      { id: "proj-1", name: "Project 1", path: "/proj1" } as any,
      { id: "proj-2", name: "Project 2", path: "/proj2" } as any,
    ]);

    vi.spyOn(workspacesApi, "workspaces").mockResolvedValue([
      { id: "ws-1", projectId: "proj-1", name: "main", path: "/proj1/main", isPrimary: true } as any,
    ]);

    vi.spyOn(sessionsApi, "sessions").mockResolvedValue([
      { id: "sess-target", name: "My Target Session", cwd: "/proj1/main" } as any,
      { id: "sess-other", name: "Other Session", cwd: "/proj1/main" } as any,
    ]);

    const selectSessionSpy = vi.spyOn(app as any, "selectSession").mockResolvedValue(undefined as any);

    await (app as any).loadProjects();

    expect((app as any).selectedProjectId).toBe("proj-1");
    expect((app as any).selectedSessionId).toBe("sess-target");
    expect(selectSessionSpy).toHaveBeenCalledWith("sess-target", "/proj1/main");
  });

  it("handles popstate event to navigate between sessions", async () => {
    const { fakeWindow } = installMockWindow("http://localhost:8504/omp?session=sess-1&project=proj-1");
    const app = new OmpApp();
    (app as any).selectedSessionId = "sess-1";
    (app as any).selectedProjectId = "proj-1";

    const selectSessionSpy = vi.spyOn(app as any, "selectSession").mockResolvedValue(undefined as any);

    // Simulate browser back/forward navigation
    fakeWindow.location.search = "?session=sess-2&project=proj-1";
    (app as any).handlePopState();

    expect(selectSessionSpy).toHaveBeenCalledWith("sess-2");
  });
  it("handleStartNewSession creates a new session and switches activeTab to new-chat", async () => {
    const { store } = installMockWindow("http://localhost:8504/omp?tab=project-detail&project=proj-1");
    const app = new OmpApp();
    (app as any).selectedProjectId = "proj-1";
    (app as any).activeTab = "project-detail";
    (app as any).workspacesByProject = {
      "proj-1": [{ id: "ws-1", projectId: "proj-1", name: "main", path: "/test/ws", isPrimary: true }],
    };
    (app as any).selectedWorkspaceId = "ws-1";

    const startSpy = vi.spyOn(sessionsApi, "startSession").mockResolvedValue({ id: "new-sess-123", cwd: "/test/ws" } as any);
    const loadSessionsSpy = vi.spyOn(app as any, "loadSessions").mockResolvedValue(undefined as any);
    const socketConnectSpy = vi.spyOn((app as any).sessionSocket, "connect").mockImplementation(() => {});

    await (app as any).handleStartNewSession("proj-1");

    expect(startSpy).toHaveBeenCalledWith("/test/ws", "local");
    expect((app as any).selectedSessionId).toBe("new-sess-123");
    expect((app as any).activeTab).toBe("new-chat");
    expect((app as any).selectedWorkspaceId).toBe("ws-1");
    expect(store.get("omp:selected-session")).toBe("new-sess-123");
    expect(socketConnectSpy).toHaveBeenCalled();
    expect(loadSessionsSpy).toHaveBeenCalledWith("/test/ws", false);
  });

  it("handleStartNewSession loads workspaces if not yet cached for the project", async () => {
    installMockWindow("http://localhost:8504/omp?tab=projects");
    const app = new OmpApp();
    (app as any).selectedProjectId = "proj-1";
    (app as any).activeTab = "projects";
    (app as any).workspacesByProject = {};

    vi.spyOn(workspacesApi, "workspaces").mockImplementation(async (projId: string) => {
      const wsList = [{ id: "ws-new", projectId: projId, name: "main", path: "/test/ws-new", isPrimary: true }];
      (app as any).workspacesByProject = {
        ...(app as any).workspacesByProject,
        [projId]: wsList,
      };
      return wsList as any;
    });
    vi.spyOn(sessionsApi, "startSession").mockResolvedValue({ id: "new-sess-456", cwd: "/test/ws-new" } as any);
    vi.spyOn(app as any, "loadSessions").mockResolvedValue(undefined as any);
    vi.spyOn((app as any).sessionSocket, "connect").mockImplementation(() => {});

    await (app as any).handleStartNewSession("proj-2");

    expect((app as any).selectedProjectId).toBe("proj-2");
    expect((app as any).selectedSessionId).toBe("new-sess-456");
    expect((app as any).activeTab).toBe("new-chat");
  });
  it("handlePromptSubmit immediately sets isStreaming to true, switches activeTab to new-chat and adds user message", async () => {
    installMockWindow("http://localhost:8504/omp?tab=new-chat");
    const app = new OmpApp();
    (app as any).selectedSessionId = "sess-123";
    (app as any).getActiveWorkspace = () => ({ id: "ws-1", path: "/test/ws" });
    vi.spyOn(sessionsApi, "prompt").mockResolvedValue({ accepted: true } as any);

    const submitPromise = (app as any).handlePromptSubmit({
      prompt: "Show me snake game",
      model: "default",
    });

    expect((app as any).isStreaming).toBe(true);
    expect((app as any).activeTab).toBe("new-chat");
    expect((app as any).messages.length).toBe(1);
    expect((app as any).messages[0].text).toBe("Show me snake game");

    await submitPromise;
    expect((app as any).isStreaming).toBe(true);
  });

  it("handleStopGeneration invalidates in-flight prompt submission so prompt is not sent", async () => {
    installMockWindow("http://localhost:8504/omp?tab=new-chat");
    const app = new OmpApp();
    (app as any).selectedSessionId = "sess-123";
    (app as any).getActiveWorkspace = () => ({ id: "ws-1", path: "/test/ws" });

    let resolveStart: (value: any) => void = () => {};
    const startPromise = new Promise((resolve) => { resolveStart = resolve; });
    (app as any).selectedSessionId = ""; // needs startSession
    vi.spyOn(sessionsApi, "startSession").mockImplementation(() => startPromise as any);
    const promptSpy = vi.spyOn(sessionsApi, "prompt").mockResolvedValue({ accepted: true } as any);
    const abortSpy = vi.spyOn(sessionsApi, "abort").mockResolvedValue({ aborted: true } as any);

    const submitPromise = (app as any).handlePromptSubmit({
      prompt: "Start something heavy",
      model: "default",
    });

    expect((app as any).isStreaming).toBe(true);

    // User cancels while startSession is pending
    await (app as any).handleStopGeneration();
    expect((app as any).isStreaming).toBe(false);

    // Now startSession resolves
    resolveStart({ id: "new-sess-aborted", cwd: "/test/ws" });
    await submitPromise;

    // Prompt should NOT have been sent
    expect(promptSpy).not.toHaveBeenCalled();
  });

  it("handleStopGeneration calls sessionsApi.abort on active session and clears isStreaming", async () => {
    installMockWindow("http://localhost:8504/omp?tab=new-chat&session=sess-active");
    const app = new OmpApp();
    (app as any).selectedSessionId = "sess-active";
    (app as any).isStreaming = true;
    (app as any).getActiveWorkspace = () => ({ id: "ws-1", path: "/test/ws" });

    const abortSpy = vi.spyOn(sessionsApi, "abort").mockResolvedValue({ aborted: true } as any);

    await (app as any).handleStopGeneration();

    expect(abortSpy).toHaveBeenCalledWith({ id: "sess-active", cwd: "/test/ws" }, "local");
    expect((app as any).isStreaming).toBe(false);
  });

  it("handleSessionEvent keeps isStreaming true during tool calls and message.end, clearing only on agent.end or session.error", () => {
    installMockWindow("http://localhost:8504/omp?tab=new-chat&session=sess-active");
    const app = new OmpApp();
    (app as any).selectedSessionId = "sess-active";

    (app as any).handleSessionEvent({ type: "agent.start" });
    expect((app as any).isStreaming).toBe(true);

    (app as any).handleSessionEvent({ type: "assistant.thinking.delta", text: "thinking..." });
    expect((app as any).isStreaming).toBe(true);

    // Assistant finishes thinking and yields tool calls -> message.end must NOT clear isStreaming!
    (app as any).handleSessionEvent({ type: "message.end", message: { role: "assistant", content: [] } });
    expect((app as any).isStreaming).toBe(true);

    // Tool executes
    (app as any).handleSessionEvent({ type: "tool.start", toolName: "bash", toolCallId: "call-1" });
    expect((app as any).isStreaming).toBe(true);

    (app as any).handleSessionEvent({ type: "tool.update", toolName: "bash", toolCallId: "call-1", text: "running" });
    expect((app as any).isStreaming).toBe(true);

    (app as any).handleSessionEvent({ type: "tool.end", toolName: "bash", toolCallId: "call-1" });
    expect((app as any).isStreaming).toBe(true);

    // Tool result message ends -> must NOT clear isStreaming
    (app as any).handleSessionEvent({ type: "message.end", message: { role: "toolResult", toolCallId: "call-1" } });
    expect((app as any).isStreaming).toBe(true);

    // Agent finishes
    (app as any).handleSessionEvent({ type: "agent.end" });
    expect((app as any).isStreaming).toBe(false);
  });

  it("handlePromptSubmit forwards streamingBehavior to sessionsApi.prompt", async () => {
    installMockWindow("http://localhost:8504/omp?tab=new-chat&session=sess-active");
    const app = new OmpApp();
    (app as any).selectedSessionId = "sess-active";
    (app as any).getActiveWorkspace = () => ({ id: "ws-1", path: "/test/ws" });

    const promptSpy = vi.spyOn(sessionsApi, "prompt").mockResolvedValue({ accepted: true } as any);

    await (app as any).handlePromptSubmit({
      prompt: "Queue this next",
      model: "default",
      streamingBehavior: "followUp",
    });

    expect(promptSpy).toHaveBeenCalledWith(
      { id: "sess-active", cwd: "/test/ws" },
      "Queue this next",
      "followUp",
      "local"
    );
  });

  it("forwards remote machineId to sessionsApi and sockets when remote machine is selected", async () => {
    installMockWindow("http://localhost:8504/omp?tab=new-chat&session=sess-remote&machine=remote-1");
    const app = new OmpApp();
    (app as any).selectedMachine = { id: "remote-1", name: "Remote Box", kind: "remote" };
    (app as any).selectedSessionId = "sess-remote";
    (app as any).getActiveWorkspace = () => ({ id: "ws-remote", path: "/remote/ws" });

    const promptSpy = vi.spyOn(sessionsApi, "prompt").mockResolvedValue({ accepted: true } as any);
    await (app as any).handlePromptSubmit({
      prompt: "Hello remote machine",
      model: "default",
    });

    expect(promptSpy).toHaveBeenCalledWith(
      { id: "sess-remote", cwd: "/remote/ws" },
      "Hello remote machine",
      undefined,
      "remote-1"
    );
  });

  it("intercepts /login slash command and opens authDialog without sending prompt", async () => {
    installMockWindow("http://localhost:8504/omp?tab=new-chat&session=sess-1");
    const app = new OmpApp();
    (app as any).selectedSessionId = "sess-1";
    (app as any).getActiveWorkspace = () => ({ id: "ws-1", path: "/test/ws" });

    const promptSpy = vi.spyOn(sessionsApi, "prompt").mockResolvedValue({ accepted: true } as any);
    await (app as any).handlePromptSubmit({
      prompt: "/login",
      model: "default",
    });

    expect(promptSpy).not.toHaveBeenCalled();
    expect((app as any).authDialog).toEqual({ step: "method" });
  });

  it("applies model selection when selecting a model before session is active", async () => {
    installMockWindow("http://localhost:8504/omp?tab=new-chat");
    const app = new OmpApp();
    (app as any).selectedSessionId = "";
    (app as any).getActiveWorkspace = () => ({ id: "ws-1", path: "/test/ws" });

    const startSpy = vi.spyOn(sessionsApi, "startSession").mockResolvedValue({ id: "sess-created", cwd: "/test/ws" } as any);
    const setModelSpy = vi.spyOn(sessionsApi, "setModel").mockResolvedValue({
      sessionId: "sess-created",
      model: { provider: "anthropic", id: "claude-3-7-sonnet" },
    } as any);

    await (app as any).handleModelSelect("anthropic", "claude-3-7-sonnet", false);

    expect(startSpy).toHaveBeenCalledWith("/test/ws", "local");
    expect(setModelSpy).toHaveBeenCalledWith(
      { id: "sess-created", cwd: "/test/ws" },
      "anthropic",
      "claude-3-7-sonnet",
      { persist: false, role: "default" },
      "local"
    );
    expect((app as any).currentSessionModel).toEqual({ provider: "anthropic", id: "claude-3-7-sonnet" });
  });
});
describe("OmpApp Composer Hub commands & shell handling", () => {
  it("handles /clear slash command client-side by emptying messages", async () => {
    const app = new OmpApp();
    (app as any).messages = [{ id: "m1", role: "user", text: "hello" }];
    (app as any).rawLines = [{ role: "user", parts: [{ type: "text", text: "hello" }] }];
    expect((app as any).messages.length).toBe(1);

    await (app as any).handlePromptSubmit({ prompt: "/clear" });
    expect((app as any).messages.length).toBe(0);
    expect((app as any).rawLines.length).toBe(0);
  });

  it("handles /help slash command client-side by inserting help card", async () => {
    const app = new OmpApp();
    (app as any).selectedProjectId = "proj-1";
    (app as any).workspacesByProject = { "proj-1": [{ id: "w1", path: "/test", isPrimary: true }] };
    (app as any).selectedWorkspaceId = "w1";

    await (app as any).handlePromptSubmit({ prompt: "/help" });
    expect((app as any).messages.length).toBe(1);
    expect((app as any).messages[0].text).toContain("Comandos Rápidos do OMP");
  });

  it("handles /settings and /hotkeys by switching activeTab to settings", async () => {
    const app = new OmpApp();
    (app as any).selectedProjectId = "proj-1";
    (app as any).workspacesByProject = { "proj-1": [{ id: "w1", path: "/test", isPrimary: true }] };
    (app as any).selectedWorkspaceId = "w1";

    await (app as any).handlePromptSubmit({ prompt: "/settings" });
    expect((app as any).activeTab).toBe("settings");

    (app as any).activeTab = "new-chat";
    await (app as any).handlePromptSubmit({ prompt: "/hotkeys" });
    expect((app as any).activeTab).toBe("settings");
  });

  it("handles /terminal, /files, /usage slash commands by switching activeTab", async () => {
    const app = new OmpApp();
    (app as any).selectedProjectId = "proj-1";
    (app as any).workspacesByProject = { "proj-1": [{ id: "w1", path: "/test", isPrimary: true }] };
    (app as any).selectedWorkspaceId = "w1";

    await (app as any).handlePromptSubmit({ prompt: "/terminal" });
    expect((app as any).activeTab).toBe("terminal");

    await (app as any).handlePromptSubmit({ prompt: "/files" });
    expect((app as any).activeTab).toBe("files");

    await (app as any).handlePromptSubmit({ prompt: "/usage" });
    expect((app as any).activeTab).toBe("usage");
  });

});
