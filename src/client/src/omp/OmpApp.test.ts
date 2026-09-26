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

    expect(startSpy).toHaveBeenCalledWith("/test/ws");
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
});
