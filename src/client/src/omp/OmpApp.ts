import { MobileDrawerController } from "../appShell/mobileDrawerController";
import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import "./OmpSidebar";
import "./OmpHeader";
import "./OmpHomeView";
import "./OmpChatView";
import "./OmpLoginModal";
import "./OmpTasksBanner";
import "./OmpLibraryView";
import "./OmpProjectsView";
import "./OmpProjectDetailView";
import "./OmpSettingsView";
import type { ChatMessage } from "./OmpChatView";
import type { SubmitPromptDetail, BtwState, ComposerProject } from "./OmpComposer";
import type { ProjectCardData } from "./OmpProjectsView";
import type { ProjectBranch } from "./OmpProjectDetailView";
import type { SidebarProject, SidebarSession } from "./OmpSidebar";
import {
  projectsApi,
  workspacesApi,
  sessionsApi,
  type Project,
  type Workspace,
  type SessionInfo,
  type SessionUiEvent,
  type AskDialogQuestion,
  type AskDialogResult,
} from "../api";
import { SessionSocket, RealtimeSocket, type RealtimeEvent } from "../sessionSocket";
import { normalizeMessages, textMessage } from "../chatMessages";
import { applyTranscriptEvent, applyTranscriptEvents } from "../chatTranscript";
import { pathFromArgs, toolTarget, diffFromDetails, countDiffLines } from "../components/ToolExecutionView";
import {
  loadChatPreferences,
  saveChatPreferenceOverrides,
  CHAT_PREFERENCES_CHANGED_EVENT,
  preferencesEventTarget,
  type ChatPreferences,
} from "../chatPreferences";
import type { ChatLine, ToolExecutionPart } from "../components/shared";
import { promptAttachmentsCanUseInlineDelivery } from "../promptAttachmentCapture";
import type { SavedPromptAttachment } from "../api";
import type { PromptAttachment } from "../../../shared/apiTypes";

function formatRelativeTime(timestamp?: number | string): string {
  if (!timestamp) return "";
  const time = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
  if (Number.isNaN(time)) return "";
  const diffSec = Math.floor((Date.now() - time) / 1000);
  if (diffSec < 60) return "agora";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m atrás`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d atrás`;
}

export function linesToChatMessages(lines: ChatLine[]): ChatMessage[] {
  const result: ChatMessage[] = [];
  let currentAssistant: ChatMessage | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.role === "user") {
      currentAssistant = null;
      const textParts = line.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text);
      const imageParts = line.parts
        .filter((p): p is { type: "image"; mimeType: string; data: string } => p.type === "image")
        .map((p) => ({ kind: "image" as const, mimeType: p.mimeType, data: p.data }));
      result.push({
        id: `user-${i}`,
        role: "user",
        text: textParts.join("\n\n"),
        attachments: imageParts.length > 0 ? imageParts : undefined,
        timestamp: line.meta?.timestamp
          ? new Date(line.meta.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : undefined,
      });
    } else if (line.role === "system") {
      currentAssistant = null;
      const text = line.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("\n\n");
      if (text) {
        result.push({
          id: `sys-${i}`,
          role: "assistant",
          text: `<callout type="info">\n${text}\n</callout>`,
        });
      }
    } else {
      if (!currentAssistant) {
        currentAssistant = {
          id: `asst-${i}`,
          role: "assistant",
          text: "",
          thinking: "",
          tools: [],
          timestamp: line.meta?.timestamp
            ? new Date(line.meta.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : undefined,
        };
        result.push(currentAssistant);
      }

      for (const part of line.parts) {
        if (part.type === "text") {
          currentAssistant.text = currentAssistant.text
            ? `${currentAssistant.text}\n\n${part.text}`
            : part.text;
        } else if (part.type === "thinking") {
          currentAssistant.thinking = currentAssistant.thinking
            ? `${currentAssistant.thinking}\n\n${part.text}`
            : part.text;
        } else if (part.type === "toolExecution") {
          const path = pathFromArgs(part.args);
          const target = toolTarget(part, path)?.text;
          const diff = diffFromDetails(part.details) ?? part.preview?.diff;
          const diffStats = diff ? countDiffLines(diff) : undefined;
          const summary = part.summary ? `${part.toolName}: ${part.summary}` : part.toolName;
          currentAssistant.tools = currentAssistant.tools || [];
          currentAssistant.tools.push({
            toolName: part.toolName,
            summary,
            target,
            diffStats,
            status: part.status,
            isError: part.isError,
          });
        }
      }
    }
  }

  return result;
}

@customElement("omp-app")
export class OmpApp extends LitElement {
  @state() private activeTab = "new-chat";
  @state() private isSidebarOpen = true;
  @state() private theme: "dark" | "light" = "dark";
  @state() private messages: ChatMessage[] = [];
  @state() private isStreaming = false;
  @state() private isFirstPrompt = false;
  @state() private isLoginModalOpen = false;
  @state() private currentUser: string | null = null;
  @state() private selectedProjectId = "";
  @state() private selectedWorkspaceId = "";
  @state() private selectedSessionId = "";
  @state() private btwState?: BtwState;
  @state() private pendingAsk?: { requestId: string; questions: AskDialogQuestion[] };

  @state() private realProjects: Project[] = [];
  @state() private workspacesByProject: Record<string, Workspace[]> = {};
  @state() private sessionsByCwd: Record<string, SessionInfo[]> = {};

  private readonly sessionSocket = new SessionSocket();
  private readonly realtimeSocket = new RealtimeSocket();
  private readonly mobileDrawer = new MobileDrawerController(this, {
    isMobileNavigationLayout: () => typeof window !== "undefined" && window.innerWidth < 768,
    onStateChange: (open) => {
      this.isSidebarOpen = open;
    },
    getDrawerElement: () => this.querySelector("omp-sidebar") as HTMLElement | null,
    getBackdropElement: () => this.querySelector(".mobile-sidebar-backdrop") as HTMLElement | null,
  });
  private readonly workingSessionIds = new Set<string>();
  private readonly unseenCompletedSessionIds = new Set<string>();
  private rawLines: ChatLine[] = [];
  private lastPromptTime = 0;
  private currentConnectedSessionId = "";

  @state() private chatPrefs: ChatPreferences = loadChatPreferences();
  private pendingTranscriptEvents: SessionUiEvent[] = [];
  private pendingTranscriptFrame?: number;

  private readonly handleChatPreferencesChanged = (event: Event) => {
    if (event instanceof CustomEvent && event.detail) {
      this.chatPrefs = event.detail as ChatPreferences;
    }
  };

  private scheduleTranscriptFlush(): void {
    if (this.pendingTranscriptFrame !== undefined) return;
    this.pendingTranscriptFrame = requestAnimationFrame(() => {
      this.pendingTranscriptFrame = undefined;
      this.flushPendingTranscript();
    });
  }

  private flushPendingTranscript(): void {
    if (this.pendingTranscriptEvents.length === 0) return;
    const events = this.pendingTranscriptEvents;
    this.pendingTranscriptEvents = [];
    const nextLines = applyTranscriptEvents(this.rawLines, events);
    if (nextLines !== this.rawLines) {
      this.rawLines = nextLines;
      this.messages = linesToChatMessages(this.rawLines);
    }
  }
  private readonly handleWindowResize = () => {
    this.mobileDrawer.updateListeners();
  };

  private toggleSidebar(): void {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      this.mobileDrawer.toggle();
    } else {
      this.isSidebarOpen = !this.isSidebarOpen;
    }
  }

  private syncUrl(options?: { replace?: boolean }) {
    if (typeof window === "undefined" || !window.location) return;
    try {
      const url = new URL(window.location.href);
      if (this.selectedSessionId) {
        url.searchParams.set("session", this.selectedSessionId);
      } else {
        url.searchParams.delete("session");
      }
      if (this.selectedProjectId) {
        url.searchParams.set("project", this.selectedProjectId);
      } else {
        url.searchParams.delete("project");
      }
      if (this.selectedWorkspaceId) {
        url.searchParams.set("workspace", this.selectedWorkspaceId);
      } else {
        url.searchParams.delete("workspace");
      }
      if (this.activeTab && this.activeTab !== "new-chat") {
        url.searchParams.set("tab", this.activeTab);
      } else if (!this.selectedSessionId) {
        url.searchParams.set("tab", "new-chat");
      } else {
        url.searchParams.delete("tab");
      }
      const next = `${url.pathname}${url.search}${url.hash}`;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (next === current) return;
      if (options?.replace) {
        window.history.replaceState({}, "", url);
      } else {
        window.history.pushState({}, "", url);
      }
    } catch {
      // ignore
    }
  }

  private saveSessionToStorage(sessionId?: string, projectId?: string) {
    try {
      if (typeof localStorage === "undefined") return;
      if (sessionId) {
        localStorage.setItem("omp:selected-session", sessionId);
      } else {
        localStorage.removeItem("omp:selected-session");
      }
      if (projectId) {
        localStorage.setItem("omp:selected-project", projectId);
      }
    } catch {
      // ignore
    }
  }

  private getStoredSessionId(): string | null {
    try {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem("omp:selected-session");
    } catch {
      return null;
    }
  }

  private getStoredProjectId(): string | null {
    try {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem("omp:selected-project");
    } catch {
      return null;
    }
  }

  private readonly handlePopState = () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") || (params.get("settings") ? "settings" : "new-chat");
    const session = params.get("session") || "";
    const project = params.get("project") || "";
    const workspace = params.get("workspace") || "";

    this.activeTab = tab;
    if (project && project !== this.selectedProjectId) {
      this.selectedProjectId = project;
      void this.loadWorkspaces(project, false);
    }
    if (workspace) {
      this.selectedWorkspaceId = workspace;
    }
    if (session && session !== this.selectedSessionId) {
      void this.selectSession(session);
    } else if (!session && this.selectedSessionId && tab === "new-chat") {
      this.selectedSessionId = "";
      this.messages = [];
      this.rawLines = [];
      this.sessionSocket.close();
      this.currentConnectedSessionId = "";
    }
  };

  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      this.isSidebarOpen = false;
    }

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") || (params.get("settings") ? "settings" : null);
    const sessionParam = params.get("session") || (!tabParam ? this.getStoredSessionId() : null);
    const projectParam = params.get("project") || this.getStoredProjectId();
    const workspaceParam = params.get("workspace");

    if (tabParam) {
      this.activeTab = tabParam;
    }
    if (sessionParam) {
      this.selectedSessionId = sessionParam;
      if (!tabParam) {
        this.activeTab = "new-chat";
      }
    }
    if (projectParam) {
      this.selectedProjectId = projectParam;
    }
    if (workspaceParam) {
      this.selectedWorkspaceId = workspaceParam;
    }
    const themeParam = params.get("theme");
    if (themeParam === "light" || themeParam === "dark") {
      this.theme = themeParam;
    }
    const sidebarParam = params.get("sidebar");
    if (sidebarParam === "closed") {
      this.isSidebarOpen = false;
    } else if (sidebarParam === "open") {
      this.isSidebarOpen = true;
    }
    if (typeof window !== "undefined") {
      window.addEventListener("popstate", this.handlePopState);
      window.addEventListener("resize", this.handleWindowResize);
    }
    preferencesEventTarget()?.addEventListener(CHAT_PREFERENCES_CHANGED_EVENT, this.handleChatPreferencesChanged);
    this.mobileDrawer.updateListeners();

    if (params.get("mock") === "chat") {
      this.messages = [
        {
          id: "msg-1",
          role: "user",
          text: "Mostre os componentes de Markdown e Generative UI da nova interface.",
          timestamp: "10:30",
        },
        {
          id: "msg-2",
          role: "assistant",
          text: this.generateResponse("Mostre os componentes de Markdown e Generative UI"),
          timestamp: "10:30",
        },
      ];
    } else {
      void this.loadProjects();
    }
    this.applyTheme(this.theme);

    this.realtimeSocket.connect(
      (event) => this.handleRealtimeEvent(event),
      () => { void this.refreshActiveSessions(); },
    );
    void this.refreshActiveSessions();
    void this.checkAuthStatus();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (typeof window !== "undefined") {
      window.removeEventListener("popstate", this.handlePopState);
      window.removeEventListener("resize", this.handleWindowResize);
    }
    this.sessionSocket.close();
    this.realtimeSocket.close();
    preferencesEventTarget()?.removeEventListener(CHAT_PREFERENCES_CHANGED_EVENT, this.handleChatPreferencesChanged);
    if (this.pendingTranscriptFrame !== undefined) {
      cancelAnimationFrame(this.pendingTranscriptFrame);
      this.pendingTranscriptFrame = undefined;
    }
  }

  private async checkAuthStatus(): Promise<void> {
    try {
      const res = await fetch("/api/omp-web/auth");
      if (!res.ok) return;
      const data = await res.json() as { authenticated?: boolean; authRequired?: boolean; setupRequired?: boolean; username?: string };
      if (data.authenticated && data.username) {
        this.currentUser = data.username;
      } else {
        this.currentUser = null;
        if (data.authRequired) {
          this.isLoginModalOpen = true;
        }
      }
    } catch {
      // offline or error
    }
  }

  private async handleSignOut(): Promise<void> {
    try {
      await fetch("/api/omp-web/auth", { method: "DELETE" });
    } catch {
      // ignore
    }
    this.currentUser = null;
    this.isLoginModalOpen = true;
  }

  private async refreshActiveSessions() {
    try {
      const active = await sessionsApi.activeSessions();
      if (Array.isArray(active)) {
        for (const item of active) {
          if (item.status === "working") {
            this.workingSessionIds.add(item.sessionId);
          } else {
            this.workingSessionIds.delete(item.sessionId);
          }
        }
        this.requestUpdate();
      }
    } catch {
      // background poll
    }
  }

  private handleRealtimeEvent(event: RealtimeEvent) {
    if (event.type === "status.update") {
      const status = event.status;
      const isWorking = status.isStreaming || status.isBashRunning || status.isCompacting || (status.pendingMessageCount ?? 0) > 0;
      const wasWorking = this.workingSessionIds.has(status.sessionId);

      if (isWorking) {
        this.workingSessionIds.add(status.sessionId);
        this.unseenCompletedSessionIds.delete(status.sessionId);
      } else {
        this.workingSessionIds.delete(status.sessionId);
        if (wasWorking && this.selectedSessionId !== status.sessionId) {
          this.unseenCompletedSessionIds.add(status.sessionId);
        }
      }

      const ws = this.getActiveWorkspace();
      if (ws && this.sessionsByCwd[ws.path] && status.archived !== undefined) {
        this.sessionsByCwd = {
          ...this.sessionsByCwd,
          [ws.path]: this.sessionsByCwd[ws.path].map(s =>
            s.id === status.sessionId ? { ...s, archived: status.archived } : s
          ),
        };
      }
      this.requestUpdate();
    }
  }

  private getActiveWorkspace(): Workspace | undefined {
    const workspaces = this.workspacesByProject[this.selectedProjectId] || [];
    if (this.selectedWorkspaceId) {
      const match = workspaces.find(w => w.id === this.selectedWorkspaceId);
      if (match) return match;
    }
    return workspaces.find(w => w.isPrimary) || workspaces[0];
  }

  private getComposerProjects(): ComposerProject[] {
    const covers = [
      "/static/omplabs/omp-appearance-cover-image-small--2.jpg",
      "/static/omplabs/omp-gaming-cover-image-small.jpg",
      "/static/omplabs/omp-vision-cover-image-small.jpg",
      "/static/omplabs/audio-expression-cover-image-small.jpg",
    ];
    return this.realProjects.map((p, idx) => ({
      id: p.id,
      name: p.name,
      path: p.path,
      image: covers[idx % covers.length],
    }));
  }

  private async handleProjectSelect(projectId: string) {
    if (this.selectedProjectId === projectId) return;
    this.selectedProjectId = projectId;
    this.syncUrl();
    this.saveSessionToStorage(this.selectedSessionId, this.selectedProjectId);
    await this.loadWorkspaces(this.selectedProjectId);
  }

  private getSidebarProjects(): SidebarProject[] {
    return this.realProjects.map(p => ({
      id: p.id,
      name: p.name,
      path: p.path,
    }));
  }

  private getProjectCardDataList(): ProjectCardData[] {
    const covers = [
      "/static/omplabs/omp-appearance-cover-image-small--2.jpg",
      "/static/omplabs/omp-gaming-cover-image-small.jpg",
      "/static/omplabs/omp-vision-cover-image-small.jpg",
      "/static/omplabs/audio-expression-cover-image-small.jpg",
    ];
    return this.realProjects.map((p, idx) => ({
      id: p.id,
      name: p.name,
      path: p.path,
      description: p.path,
      image: covers[idx % covers.length],
    }));
  }

  private getSelectedProjectCardData(): ProjectCardData | undefined {
    const list = this.getProjectCardDataList();
    return list.find(p => p.id === this.selectedProjectId) || list[0];
  }

  private getProjectBranches(): ProjectBranch[] {
    const workspaces = this.workspacesByProject[this.selectedProjectId] || [];
    const activeWs = this.getActiveWorkspace();
    return workspaces.map(w => ({
      name: w.branch || w.name,
      isMain: w.isPrimary,
      worktreePath: w.path,
      active: w.id === activeWs?.id,
    }));
  }

  private getSidebarSessions(): SidebarSession[] {
    const result: SidebarSession[] = [];
    const projects = this.realProjects.length > 0
      ? this.realProjects
      : [{ id: this.selectedProjectId, name: "Projeto" }];

    for (const proj of projects) {
      const workspaces = this.workspacesByProject[proj.id] || [];
      const primaryWs = workspaces.find(w => w.isPrimary) || workspaces[0];
      if (!primaryWs) continue;
      const sessions = this.sessionsByCwd[primaryWs.path] || [];
      for (const s of sessions) {
        const isArchived = s.archived === true;
        const rawTime = (s as any).updatedAt || s.modified || (s as any).createdAt || s.created;
        result.push({
          id: s.id,
          title: s.name || (s.id.length > 12 ? s.id.slice(0, 10) + "..." : s.id),
          updatedAt: isArchived ? undefined : formatRelativeTime(rawTime),
          projectId: proj.id,
          archived: isArchived,
          isWorking: this.workingSessionIds.has(s.id),
          isUnread: this.unseenCompletedSessionIds.has(s.id),
        });
      }
    }
    return result;
  }

  private async loadProjects() {
    try {
      const list = await projectsApi.projects();
      if (Array.isArray(list) && list.length > 0) {
        this.realProjects = list;

        let activeProjId = this.selectedProjectId && list.some(p => p.id === this.selectedProjectId)
          ? this.selectedProjectId
          : "";

        if (!activeProjId && this.selectedSessionId) {
          for (const p of list) {
            try {
              const workspaces = await workspacesApi.workspaces(p.id);
              if (Array.isArray(workspaces) && workspaces.length > 0) {
                this.workspacesByProject = {
                  ...this.workspacesByProject,
                  [p.id]: workspaces,
                };
                for (const w of workspaces) {
                  const sessions = await sessionsApi.sessions(w.path);
                  if (Array.isArray(sessions)) {
                    this.sessionsByCwd = { ...this.sessionsByCwd, [w.path]: sessions };
                    if (sessions.some(s => s.id === this.selectedSessionId)) {
                      activeProjId = p.id;
                      this.selectedWorkspaceId = w.id;
                      break;
                    }
                  }
                }
              }
            } catch {
              // ignore
            }
            if (activeProjId) break;
          }
        }

        if (!activeProjId) {
          activeProjId = list[0].id;
        }

        this.selectedProjectId = activeProjId;
        const allowDefaultSelect = !this.selectedSessionId && this.activeTab !== "new-chat";
        await this.loadWorkspaces(this.selectedProjectId, allowDefaultSelect);

        for (const p of list) {
          if (p.id !== this.selectedProjectId) {
            void this.loadProjectWorkspacesAndSessions(p.id);
          }
        }
      }
    } catch (err) {
      console.warn("[OMP] Could not load projects from API:", err);
    }
  }

  private async loadProjectWorkspacesAndSessions(projectId: string) {
    try {
      const workspaces = await workspacesApi.workspaces(projectId);
      if (Array.isArray(workspaces) && workspaces.length > 0) {
        this.workspacesByProject = {
          ...this.workspacesByProject,
          [projectId]: workspaces,
        };
        const primary = workspaces.find(w => w.isPrimary) || workspaces[0];
        if (primary && !this.sessionsByCwd[primary.path]) {
          const sessions = await sessionsApi.sessions(primary.path);
          if (Array.isArray(sessions)) {
            this.sessionsByCwd = {
              ...this.sessionsByCwd,
              [primary.path]: sessions,
            };
            this.requestUpdate();
          }
        }
      }
    } catch {
      // background preload
    }
  }

  private async loadWorkspaces(projectId: string, selectIfNone = true) {
    try {
      const workspaces = await workspacesApi.workspaces(projectId);
      if (Array.isArray(workspaces) && workspaces.length > 0) {
        this.workspacesByProject = {
          ...this.workspacesByProject,
          [projectId]: workspaces,
        };

        let targetWs: Workspace | undefined;
        if (this.selectedWorkspaceId) {
          targetWs = workspaces.find(w => w.id === this.selectedWorkspaceId);
        }

        if (!targetWs && this.selectedSessionId) {
          for (const w of workspaces) {
            try {
              const sessions = await sessionsApi.sessions(w.path);
              if (Array.isArray(sessions)) {
                this.sessionsByCwd = { ...this.sessionsByCwd, [w.path]: sessions };
                if (sessions.some(s => s.id === this.selectedSessionId)) {
                  targetWs = w;
                  break;
                }
              }
            } catch {
              // ignore
            }
          }
        }

        if (!targetWs) {
          targetWs = workspaces.find(w => w.isPrimary) || workspaces[0];
        }

        this.selectedWorkspaceId = targetWs.id;
        await this.loadSessions(targetWs.path, selectIfNone);
      }
    } catch (err) {
      console.warn(`[OMP] Could not load workspaces for project ${projectId}:`, err);
    }
  }

  private async loadSessions(cwd: string, selectIfNone = false) {
    try {
      const sessions = await sessionsApi.sessions(cwd);
      if (Array.isArray(sessions)) {
        this.sessionsByCwd = {
          ...this.sessionsByCwd,
          [cwd]: sessions,
        };
        if (sessions.length > 0) {
          const targetId = this.selectedSessionId;
          const targetInSessions = targetId ? sessions.find(s => s.id === targetId) : undefined;

          if (targetInSessions) {
            if (this.currentConnectedSessionId !== targetInSessions.id) {
              await this.selectSession(targetInSessions.id, cwd);
            }
          } else if (selectIfNone && !targetId) {
            await this.selectSession(sessions[0].id, cwd);
          } else if (selectIfNone && targetId && !targetInSessions) {
            await this.selectSession(sessions[0].id, cwd);
          }
        } else {
          if (selectIfNone) {
            this.selectedSessionId = "";
            this.messages = [];
            this.rawLines = [];
            this.sessionSocket.close();
            this.currentConnectedSessionId = "";
            this.syncUrl({ replace: true });
            this.saveSessionToStorage();
          }
        }
      }
    } catch (err) {
      console.warn(`[OMP] Could not load sessions for cwd ${cwd}:`, err);
    }
  }

  private async handleSessionSelect(sessionId: string, projectId?: string) {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      this.mobileDrawer.close();
    }
    if (projectId && projectId !== this.selectedProjectId) {
      this.selectedProjectId = projectId;
      await this.loadWorkspaces(this.selectedProjectId, false);
    }
    await this.selectSession(sessionId, undefined, { pushHistory: true });
    this.activeTab = "new-chat";
  }

  private async selectSession(sessionId: string, cwd?: string, options?: { pushHistory?: boolean }) {
    this.selectedSessionId = sessionId;
    this.unseenCompletedSessionIds.delete(sessionId);
    const effectiveCwd = cwd || this.getActiveWorkspace()?.path;
    if (!effectiveCwd || !sessionId) return;

    this.syncUrl({ replace: !options?.pushHistory });
    this.saveSessionToStorage(sessionId, this.selectedProjectId);

    this.sessionSocket.close();
    this.currentConnectedSessionId = "";

    try {
      const [history, status] = await Promise.all([
        sessionsApi.messages({ id: sessionId, cwd: effectiveCwd }),
        sessionsApi.status({ id: sessionId, cwd: effectiveCwd }).catch(() => undefined),
      ]);
      const rawList = Array.isArray(history)
        ? history
        : (Array.isArray(history?.messages) ? history.messages : []);
      this.rawLines = normalizeMessages(rawList);
      this.messages = linesToChatMessages(this.rawLines);
      this.pendingAsk = status?.pendingAsk;
    } catch (err) {
      console.warn(`[OMP] Could not load messages for session ${sessionId}:`, err);
      this.rawLines = [];
      this.messages = [];
      this.pendingAsk = undefined;
    }

    this.sessionSocket.connect(
      { id: sessionId, cwd: effectiveCwd },
      (event) => this.handleSessionEvent(event),
    );
    this.currentConnectedSessionId = sessionId;
  }

  private handleSessionEvent(event: SessionUiEvent) {
    if (event.type === "agent.start" || event.type === "assistant.delta") {
      this.isStreaming = true;
      if (this.selectedSessionId) this.workingSessionIds.add(this.selectedSessionId);
    } else if (event.type === "agent.end" || event.type === "message.end") {
      this.isStreaming = false;
      if (this.selectedSessionId) this.workingSessionIds.delete(this.selectedSessionId);
    }

    if (event.type === "btw.start") {
      this.btwState = { status: "running", question: event.question, answer: "", canBranch: true };
    } else if (event.type === "btw.delta") {
      if (this.btwState?.status === "running") {
        this.btwState = { ...this.btwState, answer: this.btwState.answer + event.delta };
      }
    } else if (event.type === "btw.end") {
      this.btwState = { status: "complete", question: event.question, answer: event.answer, canBranch: event.canBranch };
    } else if (event.type === "btw.error") {
      this.btwState = { status: "error", question: this.btwState?.question || "", answer: "", error: event.error, canBranch: false };
    } else if (event.type === "btw.cleared") {
      this.btwState = undefined;
    }

    if (event.type === "ask.requested") {
      this.pendingAsk = { requestId: event.requestId, questions: event.questions };
    } else if (event.type === "ask.cleared") {
      if (this.pendingAsk?.requestId === event.requestId) {
        this.pendingAsk = undefined;
      }
    } else if (event.type === "status.update") {
      if (event.status.sessionId === this.selectedSessionId) {
        this.pendingAsk = event.status.pendingAsk;
      }
      const ws = this.getActiveWorkspace();
      if (ws && this.sessionsByCwd[ws.path] && event.status.archived !== undefined) {
        this.sessionsByCwd = {
          ...this.sessionsByCwd,
          [ws.path]: this.sessionsByCwd[ws.path].map(s =>
            s.id === event.status.sessionId ? { ...s, archived: event.status.archived } : s
          ),
        };
      }
    }

    if (event.type === "session.name") {
      const ws = this.getActiveWorkspace();
      if (ws && this.sessionsByCwd[ws.path]) {
        this.sessionsByCwd = {
          ...this.sessionsByCwd,
          [ws.path]: this.sessionsByCwd[ws.path].map(s => s.id === event.sessionId ? { ...s, name: event.name } : s),
        };
      }
    }

    if (event.type === "message.end" || event.type === "agent.end" || event.type === "session.error") {
      this.pendingTranscriptEvents.push(event);
      this.flushPendingTranscript();
    } else {
      this.pendingTranscriptEvents.push(event);
      this.scheduleTranscriptFlush();
    }
  }

  private applyTheme(theme: "dark" | "light") {
    if (typeof document === "undefined" || !document.documentElement?.classList) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
  }

  private toggleTheme() {
    this.theme = this.theme === "dark" ? "light" : "dark";
    this.applyTheme(this.theme);
  }

  private handleNavSelect(tab: string) {
    this.activeTab = tab;
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      this.isSidebarOpen = false;
    }
    if (tab === "new-chat") {
      this.selectedSessionId = "";
      this.messages = [];
      this.rawLines = [];
      this.sessionSocket.close();
      this.currentConnectedSessionId = "";
      this.saveSessionToStorage(undefined, this.selectedProjectId);
    }
    this.syncUrl();
  }

  private async handlePromptSubmit(detail: SubmitPromptDetail) {
    const promptTrimmed = detail.prompt.trim();
    const attachments = detail.attachments;
    const hasAttachments = Boolean(attachments && attachments.length > 0);
    if (!promptTrimmed && !hasAttachments) return;

    if (detail.projectId && detail.projectId !== this.selectedProjectId) {
      await this.handleProjectSelect(detail.projectId);
    }

    const ws = this.getActiveWorkspace();
    if (!ws) {
      console.error("[OMP] Cannot submit prompt: no active workspace");
      return;
    }

    let sessionId = this.selectedSessionId;
    if (!sessionId) {
      try {
        const newSession = await sessionsApi.startSession(ws.path);
        sessionId = newSession.id;
        this.selectedSessionId = sessionId;
        this.currentConnectedSessionId = sessionId;
        this.syncUrl({ replace: true });
        this.saveSessionToStorage(sessionId, this.selectedProjectId);
        this.sessionSocket.connect({ id: sessionId, cwd: ws.path }, (event) => this.handleSessionEvent(event));
        void this.loadSessions(ws.path, false);
      } catch (err) {
        console.error("[OMP] Failed to start new session:", err);
        return;
      }
    }

    const [cmdName = ""] = promptTrimmed.replace(/^\//, "").split(/\s+/);
    const commandLower = cmdName.toLowerCase();
    if (commandLower === "quit" || commandLower === "exit") {
      await this.archiveSessionById(sessionId, ws.path);
      return;
    }

    if (promptTrimmed.toLowerCase().startsWith("/btw")) {
      const question = promptTrimmed.replace(/^\/btw\s*/i, "").trim();
      this.btwState = { status: "running", question: question || "Pergunta lateral", answer: "", canBranch: true };
      this.activeTab = "new-chat";
      try {
        await sessionsApi.runCommand({ id: sessionId, cwd: ws.path }, promptTrimmed);
      } catch (err) {
        console.error("[OMP] Failed to run /btw:", err);
        this.btwState = { status: "error", question: question || "", answer: "", error: String(err), canBranch: false };
      }
      return;
    }

    const now = Date.now();
    if (this.isStreaming || (now - this.lastPromptTime < 350)) return;
    this.lastPromptTime = now;

    if (this.messages.length === 0) {
      this.isFirstPrompt = true;
      setTimeout(() => {
        this.isFirstPrompt = false;
      }, 600);
    }

    const userLine: ChatLine = {
      role: "user",
      parts: [
        ...(promptTrimmed ? [{ type: "text" as const, text: promptTrimmed }] : []),
        ...(attachments
          ? attachments
            .filter((a): a is import("../../../shared/apiTypes").PromptImageAttachment => a.kind === "image")
            .map((a) => ({ type: "image" as const, mimeType: a.mimeType, data: a.data }))
          : []),
      ],
      meta: { timestamp: Date.now() },
    };
    this.rawLines = [...this.rawLines, userLine];
    this.messages = linesToChatMessages(this.rawLines);

    this.activeTab = "new-chat";
    this.isStreaming = true;

    try {
      if (attachments && attachments.length > 0) {
        const canUseInline = promptAttachmentsCanUseInlineDelivery(attachments);
        if (canUseInline) {
          await sessionsApi.prompt({ id: sessionId, cwd: ws.path }, promptTrimmed, detail.streamingBehavior, "local", attachments);
        } else {
          const saved = await sessionsApi.saveAttachments({ id: sessionId, cwd: ws.path }, attachments, "local");
          const files = Array.isArray(saved) ? saved : ((saved as { attachments?: SavedPromptAttachment[] })?.attachments ?? []);
          const references = files.map((file) => `@${file.path}`).join(" ");
          const body = promptTrimmed === "" ? references : `${promptTrimmed}\n\n${references}`;
          await sessionsApi.prompt({ id: sessionId, cwd: ws.path }, body, detail.streamingBehavior);
        }
      } else {
        await sessionsApi.prompt({ id: sessionId, cwd: ws.path }, promptTrimmed, detail.streamingBehavior);
      }
      if (ws && this.sessionsByCwd[ws.path]) {
        this.sessionsByCwd = {
          ...this.sessionsByCwd,
          [ws.path]: this.sessionsByCwd[ws.path].map(s =>
            s.id === sessionId ? { ...s, archived: false } : s
          ),
        };
      }
    } catch (err) {
      console.error("[OMP] Failed to send prompt to sessiond:", err);
      this.isStreaming = false;
      const errorMsg: ChatMessage = {
        id: "err-" + Date.now(),
        role: "assistant",
        text: `<callout type="danger">\nFalha ao enviar mensagem para o daemon do Oh My Pi: ${String(err)}\n</callout>`,
        hasAgentProcess: false,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      this.messages = [...this.messages, errorMsg];
    }
  }


  private async handleStopGeneration() {
    const ws = this.getActiveWorkspace();
    const sessionId = this.selectedSessionId;
    if (!sessionId) return;
    try {
      await sessionsApi.abort({ id: sessionId, cwd: ws?.path || "" });
      this.isStreaming = false;
      this.requestUpdate();
    } catch (err) {
      console.error("[OMP] Failed to stop session:", err);
    }
  }

  private async handleSubmitAsk(requestId: string, result: AskDialogResult) {
    const ws = this.getActiveWorkspace();
    const sessionId = this.selectedSessionId;
    this.pendingAsk = undefined;
    if (!ws || !sessionId) return;
    try {
      await sessionsApi.respondToAsk({ id: sessionId, cwd: ws.path }, requestId, result);
    } catch (err) {
      console.error("[OMP] Failed to respond to ask:", err);
    }
  }

  private async handleCancelAsk(requestId: string) {
    const ws = this.getActiveWorkspace();
    const sessionId = this.selectedSessionId;
    this.pendingAsk = undefined;
    if (!ws || !sessionId) return;
    try {
      await sessionsApi.respondToAsk({ id: sessionId, cwd: ws.path }, requestId, undefined);
    } catch (err) {
      console.error("[OMP] Failed to cancel ask:", err);
    }
  }

  private handleBtwSubmit(question: string) {
    const ws = this.getActiveWorkspace();
    const sessionId = this.selectedSessionId;
    if (!ws || !sessionId) {
      this.btwState = {
        status: "complete",
        question,
        answer: "Selecione ou inicie uma sessão com o daemon para enviar perguntas laterais.",
        canBranch: false,
      };
      this.activeTab = "new-chat";
      return;
    }
    this.handlePromptSubmit({ prompt: `/btw ${question}` });
  }

  private async handleBranchBtw(state?: BtwState) {
    const ws = this.getActiveWorkspace();
    const sessionId = this.selectedSessionId;
    if (!ws || !sessionId) return;
    this.btwState = undefined;
    try {
      const res = await sessionsApi.runCommand({ id: sessionId, cwd: ws.path }, "/btw branch");
      if (res.type === "done" && res.session) {
        this.selectedSessionId = res.session.id;
        this.currentConnectedSessionId = res.session.id;
        this.syncUrl({ replace: true });
        this.saveSessionToStorage(res.session.id, this.selectedProjectId);
        await this.loadSessions(ws.path);
        await this.selectSession(res.session.id, ws.path);
      }
    } catch (err) {
      console.error("[OMP] Failed to branch /btw:", err);
    }
    this.activeTab = "new-chat";
  }

  private handleBranchSelect(branchName: string) {
    const workspaces = this.workspacesByProject[this.selectedProjectId] || [];
    const found = workspaces.find(w => (w.branch || w.name) === branchName);
    if (found) {
      this.selectedWorkspaceId = found.id;
      this.syncUrl();
      void this.loadSessions(found.path, true);
    }
  }

  private async handleArchiveSession(sessionId: string, projectId?: string) {
    let cwd: string | undefined;
    if (projectId) {
      const workspaces = this.workspacesByProject[projectId] || [];
      const primaryWs = workspaces.find(w => w.isPrimary) || workspaces[0];
      cwd = primaryWs?.path;
    }
    await this.archiveSessionById(sessionId, cwd);
  }

  private async archiveSessionById(sessionId: string, cwd?: string) {
    const ws = this.getActiveWorkspace();
    const targetCwd = cwd || ws?.path;
    if (!sessionId) return;
    try {
      await sessionsApi.archive({ id: sessionId, cwd: targetCwd || "" });
      for (const [p, sessions] of Object.entries(this.sessionsByCwd)) {
        this.sessionsByCwd[p] = sessions.map(s => s.id === sessionId ? { ...s, archived: true } : s);
      }
      this.workingSessionIds.delete(sessionId);
      this.unseenCompletedSessionIds.delete(sessionId);

      if (this.selectedSessionId === sessionId) {
        this.selectedSessionId = "";
        this.messages = [];
        this.rawLines = [];
        this.sessionSocket.close();
        this.activeTab = "new-chat";
      }
      this.requestUpdate();
    } catch (err) {
      console.error("[OMP] Failed to archive session:", err);
    }
  }

  private async handleStartNewSession(projectId?: string) {
    const targetProjectId = projectId || this.selectedProjectId;
    if (targetProjectId) {
      const isDifferent = targetProjectId !== this.selectedProjectId;
      this.selectedProjectId = targetProjectId;
      if (isDifferent || !this.getActiveWorkspace()) {
        await this.loadWorkspaces(targetProjectId);
      }
    }
    const ws = this.getActiveWorkspace();
    if (!ws) {
      this.selectedSessionId = "";
      this.currentConnectedSessionId = "";
      this.messages = [];
      this.rawLines = [];
      this.sessionSocket.close();
      this.activeTab = "new-chat";
      this.syncUrl();
      this.saveSessionToStorage(undefined, this.selectedProjectId);
      return;
    }
    this.selectedWorkspaceId = ws.id;
    try {
      const newSession = await sessionsApi.startSession(ws.path);
      this.selectedSessionId = newSession.id;
      this.currentConnectedSessionId = newSession.id;
      this.messages = [];
      this.rawLines = [];
      this.activeTab = "new-chat";
      this.syncUrl();
      this.saveSessionToStorage(newSession.id, this.selectedProjectId);
      this.sessionSocket.connect({ id: newSession.id, cwd: ws.path }, (event) => this.handleSessionEvent(event));
      await this.loadSessions(ws.path, false);
    } catch (err) {
      console.warn("[OMP] Could not start new session via API, falling back to clean composer:", err);
      this.selectedSessionId = "";
      this.currentConnectedSessionId = "";
      this.messages = [];
      this.rawLines = [];
      this.sessionSocket.close();
      this.activeTab = "new-chat";
      this.syncUrl();
      this.saveSessionToStorage(undefined, this.selectedProjectId);
    }
  }

  private async handleProjectAdd() {
    const path = window.prompt("Digite o caminho do diretório local do projeto (ex: ~/code/meu-projeto):");
    if (!path || !path.trim()) return;
    try {
      const created = await projectsApi.addProject(path.trim());
      await this.loadProjects();
      if (created?.id) {
        this.selectedProjectId = created.id;
        this.activeTab = "project-detail";
        await this.loadWorkspaces(created.id);
      }
    } catch (err) {
      console.error("[OMP] Falha ao adicionar projeto:", err);
      window.alert("Não foi possível adicionar o projeto: " + String(err));
    }
  }

  private async handleProjectDelete(projectId: string) {
    try {
      await projectsApi.closeProject(projectId);
      await this.loadProjects();
      if (this.selectedProjectId === projectId) {
        this.selectedProjectId = this.realProjects[0]?.id || "";
        if (this.selectedProjectId) {
          await this.loadWorkspaces(this.selectedProjectId);
        }
      }
    } catch (err) {
      console.error("[OMP] Falha ao fechar projeto:", err);
    }
  }

  private generateResponse(prompt: string): string {
    return `Entendido! Analisei sua solicitação sobre **"${prompt}"** e preparei o plano de execução:

<card title="Painel de Execução & Métricas" badge="Online" color="green" subtitle="OMP Web Harness v2.4 · Runtime Bun 1.3">
<kpi-grid>
  <kpi label="Status" value="OK" sub="sistema operacional" />
  <kpi label="Latência" value="18ms" sub="streaming local" />
  <kpi label="Memória" value="42.8 MB" sub="heap alocada" />
  <kpi label="Modo" value="Smart" sub="OKLCH + Squircles" />
</kpi-grid>

O pipeline de compilação e os testes unitários foram validados no ambiente.
</card>

### Implementação dos Componentes

\`\`\`typescript
import { OmpMarkdown } from "./OmpMarkdown";

// Renderização nativa em Light DOM com tokens semânticos OKLCH
const view = new OmpMarkdown();
view.text = "Hello OMP Web Cockpit";
document.body.appendChild(view);
\`\`\`

<callout type="info">
Dica: você pode selecionar uma das opções abaixo para testar a injeção automática de prompt no composer.
</callout>

<checklist title="Tarefas Concluídas" interactive="false">
  <item label="Componente OmpMarkdown implementado em Light DOM" done="true" />
  <item label="Tokens OKLCH e superfícies acrílicas integradas no omp-theme.css" done="true" />
  <item label="Listener de evento omp:set-prompt-text ativo no composer" done="true" />
</checklist>

<options title="Como deseja prosseguir?" subtitle="Clique em uma opção para preencher ou enviar pelo composer">
  <option label="Opção 1: Executar suite de testes completa" description="Roda bun test em todos os módulos do cliente e servidor" />
  <option label="Opção 2: Gerar novo card com métricas em tempo real" description="Simula métricas atualizadas de CPU, GPU e memória" />
  <option label="Opção 3: Alternar entre modo claro e escuro" description="Verifica o contraste dos componentes em dark e light mode" />
</options>`;
  }

  private getHeaderTitle(): string {
    switch (this.activeTab) {
      case "library":
        return "Library";
      case "projects":
        return "Projetos";
      case "project-detail":
        return "Projeto";
      case "settings":
        return "Configurações";
      default:
        return "";
    }
  }

  private renderActiveView() {
    switch (this.activeTab) {
      case "new-chat":
        return this.messages.length === 0
          ? html`
              <omp-home-view
                .isWorking=${this.isStreaming}
                .projects=${this.getComposerProjects()}
                .selectedProjectId=${this.selectedProjectId}
                .username=${this.currentUser}
                @project-select=${(e: CustomEvent<{ projectId: string }>) => void this.handleProjectSelect(e.detail.projectId)}
                @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => this.handlePromptSubmit(e.detail)}
                @stop-generation=${() => void this.handleStopGeneration()}
              ></omp-home-view>
            `
          : html`
              <omp-chat-view
                .messages=${this.messages}
                .isStreaming=${this.isStreaming}
                .isFirstPrompt=${this.isFirstPrompt}
                .projects=${this.getComposerProjects()}
                .selectedProjectId=${this.selectedProjectId}
                .btwState=${this.btwState}
                .pendingAsk=${this.pendingAsk}
                .progressStyle=${this.chatPrefs.progressStyle ?? "steps"}
                @progress-style-change=${(e: CustomEvent<{ progressStyle: "minimal" | "steps" }>) => {
              saveChatPreferenceOverrides({ progressStyle: e.detail.progressStyle });
              this.chatPrefs = { ...this.chatPrefs, progressStyle: e.detail.progressStyle };
            }}
                @project-select=${(e: CustomEvent<{ projectId: string }>) => void this.handleProjectSelect(e.detail.projectId)}
                @submit-btw=${(e: CustomEvent<{ question: string }>) => this.handleBtwSubmit(e.detail.question)}
                @branch-btw=${(e: CustomEvent<{ state?: BtwState }>) => this.handleBranchBtw(e.detail?.state)}
                @close-btw=${() => { this.btwState = undefined; }}
                @submit-ask=${(e: CustomEvent<{ requestId: string; result: AskDialogResult }>) => void this.handleSubmitAsk(e.detail.requestId, e.detail.result)}
                @cancel-ask=${(e: CustomEvent<{ requestId: string }>) => void this.handleCancelAsk(e.detail.requestId)}
                @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => this.handlePromptSubmit(e.detail)}
                @stop-generation=${() => void this.handleStopGeneration()}
              ></omp-chat-view>
            `;

      case "library":
        return html`
          <omp-library-view
            .isWorking=${this.isStreaming}
            @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => this.handlePromptSubmit(e.detail)}
          ></omp-library-view>
          <div class="fixed bottom-0 flex w-full items-center justify-center px-4 pointer-events-none z-20">
            <omp-tasks-banner
              @sign-in=${() => (this.isLoginModalOpen = true)}
            ></omp-tasks-banner>
          </div>
        `;

      case "projects":
        return html`
          <omp-projects-view
            .projects=${this.getProjectCardDataList()}
            .selectedProjectId=${this.selectedProjectId}
            .isWorking=${this.isStreaming}
            @project-open=${(e: CustomEvent<{ projectId: string }>) => {
            this.selectedProjectId = e.detail.projectId;
            this.activeTab = "project-detail";
            void this.loadWorkspaces(this.selectedProjectId);
          }}
            @project-select=${(e: CustomEvent<{ projectId: string }>) => {
            void this.handleProjectSelect(e.detail.projectId);
          }}
            @project-add=${() => this.handleProjectAdd()}
            @project-delete=${(e: CustomEvent<{ projectId: string }>) => this.handleProjectDelete(e.detail.projectId)}
            @start-new-session=${(e: CustomEvent<{ projectId?: string }>) => void this.handleStartNewSession(e.detail?.projectId)}
            @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => {
            this.handlePromptSubmit(e.detail);
          }}
            @stop-generation=${() => void this.handleStopGeneration()}
          ></omp-projects-view>
        `;

      case "settings":
        return html`
          <omp-settings-view
            .theme=${this.theme}
            @toggle-theme=${() => this.toggleTheme()}
          ></omp-settings-view>
        `;

      case "project-detail":
        return html`
          <omp-project-detail-view
            .projectId=${this.selectedProjectId}
            .project=${this.getSelectedProjectCardData()}
            .projects=${this.getProjectCardDataList()}
            .branches=${this.getProjectBranches()}
            .sessions=${this.getSidebarSessions()}
            .isWorking=${this.isStreaming}
            @back-to-projects=${() => {
            this.activeTab = "projects";
          }}
            @branch-select=${(e: CustomEvent<{ projectId: string; branch: string }>) => {
            this.handleBranchSelect(e.detail.branch);
          }}
            @project-select=${(e: CustomEvent<{ projectId: string }>) => {
            this.selectedProjectId = e.detail.projectId;
            this.activeTab = "project-detail";
            void this.loadWorkspaces(this.selectedProjectId);
          }}
            @project-delete=${(e: CustomEvent<{ projectId: string }>) => {
            this.handleProjectDelete(e.detail.projectId);
          }}
            @session-select=${(e: CustomEvent<{ sessionId: string }>) => {
            void this.handleSessionSelect(e.detail.sessionId);
          }}
            @start-new-session=${(e: CustomEvent<{ projectId?: string }>) => {
            void this.handleStartNewSession(e.detail?.projectId);
          }}
            @submit-prompt=${(e: CustomEvent<SubmitPromptDetail>) => {
            this.handlePromptSubmit(e.detail);
          }}
            @stop-generation=${() => void this.handleStopGeneration()}
          ></omp-project-detail-view>
        `;

      default:
        return html``;
    }
  }

  override render() {
    return html`
      <!-- OMP Web Shell Architecture -->
      <div
        class="flex h-full h-dvh w-full overflow-hidden bg-sidebar-light dark:bg-sidebar-dark font-sans select-none relative"
        data-theme="${this.theme}"
      >
        <!-- Mobile Backdrop Overlay when Drawer is open (z-40) -->
        <div
          class="mobile-sidebar-backdrop fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300 ease-[cubic-bezier(0.43,0.195,0.02,1)] ${this.isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }"
          @click=${() => this.mobileDrawer.close()}
          @touchstart=${this.mobileDrawer.handleTouchStart}
          @touchmove=${this.mobileDrawer.handleTouchMove}
          @touchend=${this.mobileDrawer.handleTouchEnd}
          @touchcancel=${this.mobileDrawer.handleTouchCancel}
        ></div>

        <!-- 1. Sidebar Navigation: z-50 fixed on mobile (above backdrop), relative on desktop -->
        <omp-sidebar
          class="h-full shrink-0 will-change-auto transition-all duration-300 ease-[cubic-bezier(0.43,0.195,0.02,1)] fixed md:relative inset-y-0 left-0 z-50 md:z-auto shadow-2xl md:shadow-none ${this.isSidebarOpen || this.mobileDrawer.isDragging
        ? "w-[280px] md:w-[260px] min-w-[260px] translate-x-0 opacity-100"
        : "-translate-x-full md:translate-x-0 w-0 md:w-0 min-w-0 md:min-w-0 p-0 m-0 overflow-hidden md:opacity-0 pointer-events-none"
      }"
          .activeTab=${this.activeTab}
          .isOpen=${this.isSidebarOpen}
          .projects=${this.getSidebarProjects()}
          .sessions=${this.getSidebarSessions()}
          .selectedProjectId=${this.selectedProjectId}
          .selectedSessionId=${this.selectedSessionId}
          @touchstart=${this.mobileDrawer.handleTouchStart}
          @touchmove=${this.mobileDrawer.handleTouchMove}
          @touchend=${this.mobileDrawer.handleTouchEnd}
          @touchcancel=${this.mobileDrawer.handleTouchCancel}
          @project-select=${(e: CustomEvent<{ projectId: string }>) => {
        this.selectedProjectId = e.detail.projectId;
        this.activeTab = "project-detail";
        this.syncUrl();
        this.saveSessionToStorage(this.selectedSessionId, this.selectedProjectId);
        void this.loadWorkspaces(this.selectedProjectId);
      }}
          @session-select=${(e: CustomEvent<{ sessionId: string; projectId?: string }>) => {
        void this.handleSessionSelect(e.detail.sessionId, e.detail.projectId);
      }}
          @start-new-session=${(e: CustomEvent<{ projectId?: string }>) => void this.handleStartNewSession(e.detail?.projectId)}
          @archive-session=${(e: CustomEvent<{ sessionId: string; projectId?: string }>) => void this.handleArchiveSession(e.detail.sessionId, e.detail.projectId)}
          @nav-select=${(e: CustomEvent<{ tab: string }>) => this.handleNavSelect(e.detail.tab)}
          @toggle-sidebar=${() => this.toggleSidebar()}
          @sign-in=${() => (this.isLoginModalOpen = true)}
        ></omp-sidebar>

        <!-- 2. Main Stage with OMP Web Margin & Rounded Container -->
        <main
          class="relative flex flex-1 flex-col h-full min-w-0 md:py-1.5 md:pe-1.5 transition-all duration-300 ${!this.isSidebarOpen ? "md:ps-1.5" : ""
      }"
        >
          <!-- Canvas stage with background-150 and md:rounded-container -->
          <div class="relative size-full overflow-hidden md:rounded-container bg-background-150 flex flex-col">
            <!-- Topbar Controls (Sidebar toggle ONLY appears when sidebar is closed) -->
            <omp-header
              .isSidebarOpen=${this.isSidebarOpen}
              .theme=${this.theme}
              .currentUser=${this.currentUser}
              .title=${this.getHeaderTitle()}
              @toggle-sidebar=${() => this.toggleSidebar()}
              @toggle-theme=${() => this.toggleTheme()}
              @sign-in=${() => (this.isLoginModalOpen = true)}
              @sign-out=${() => { void this.handleSignOut(); }}
            ></omp-header>

            <!-- Current Active Stage View -->
            <div
              class="relative flex-1 size-full overflow-hidden"
              @project-select=${(e: CustomEvent<{ projectId: string }>) => {
        this.selectedProjectId = e.detail.projectId;
        this.activeTab = "project-detail";
        void this.loadWorkspaces(this.selectedProjectId);
      }}
              @start-new-session=${(e: CustomEvent<{ projectId?: string }>) => {
        void this.handleStartNewSession(e.detail?.projectId);
      }}
            >
              ${this.renderActiveView()}
            </div>
          </div>
        </main>
        <!-- Login Modal Component -->
        <omp-login-modal
          .isOpen=${this.isLoginModalOpen}
          .theme=${this.theme}
          @close=${() => (this.isLoginModalOpen = false)}
          @login-success=${(e: CustomEvent<{ username: string }>) => {
        this.currentUser = e.detail.username;
        this.isLoginModalOpen = false;
      }}
        ></omp-login-modal>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-app": OmpApp;
  }
}
