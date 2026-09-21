import { CronStorage } from "./storage.js";
import { CronScheduler } from "./scheduler.js";

interface SchedulerEntry {
  scheduler: CronScheduler;
  storage: CronStorage;
}

/**
 * Manages CronScheduler lifecycle across workspaces and sessions.
 * Instantiated once per PiSessionService and shared across sessions and daemon routes.
 */
export class SchedulePromptService {
  private readonly workspaceSchedulers = new Map<string, SchedulerEntry>();
  private readonly sessionSchedulers = new Map<string, SchedulerEntry>();

  /**
   * Get or create a persistent workspace scheduler for a given cwd.
   * Workspace schedulers persist in sessiond and run independently of active chat sessions.
   */
  getOrCreateForWorkspace(
    cwd: string,
    promptDispatcher?: (text: string) => Promise<void>,
  ): { storage: CronStorage; scheduler: CronScheduler } {
    const existing = this.workspaceSchedulers.get(cwd);
    if (existing) {
      if (promptDispatcher) {
        existing.scheduler.setPromptDispatcher(promptDispatcher);
      }
      return existing;
    }

    const storage = new CronStorage(cwd);
    const scheduler = new CronScheduler(
      storage,
      "",
      promptDispatcher,
      { cwd },
    );
    scheduler.start();
    const entry = { storage, scheduler };
    this.workspaceSchedulers.set(cwd, entry);
    return entry;
  }

  /**
   * Called when a session is opened.
   * Registers prompt dispatcher with workspace scheduler and tracks session entry.
   */
  startForSession(
    sessionId: string,
    cwd: string,
    dispatchPrompt: (text: string) => Promise<void>,
  ): { storage: CronStorage; scheduler: CronScheduler } {
    const workspaceEntry = this.getOrCreateForWorkspace(cwd, dispatchPrompt);
    this.sessionSchedulers.set(sessionId, workspaceEntry);
    return workspaceEntry;
  }

  /**
   * Called when a session is closed.
   * Note: The workspace scheduler remains active in sessiond for commands and workspace cron jobs.
   */
  stopForSession(sessionId: string): void {
    this.sessionSchedulers.delete(sessionId);
  }

  /**
   * Called on global dispose. Stops all schedulers.
   */
  dispose(): void {
    for (const entry of this.workspaceSchedulers.values()) {
      entry.scheduler.stop();
    }
    this.workspaceSchedulers.clear();
    this.sessionSchedulers.clear();
  }
}
