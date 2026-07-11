import { CronStorage } from "./storage.js";
import { CronScheduler } from "./scheduler.js";

interface SchedulerEntry {
 scheduler: CronScheduler;
 storage: CronStorage;
}

/**
 * Manages CronScheduler lifecycle per session.
 * Instantiated once per PiSessionService and shared across sessions.
 */
export class SchedulePromptService {
 private readonly schedulers = new Map<string, SchedulerEntry>();

 /**
  * Called when a session is opened. Creates storage + scheduler for that
  * session/cwd, loads jobs from disk, and starts the timer chain.
  *
  * @param sessionId  The session's unique id (used to scope session-bound jobs)
  * @param cwd        The session's working directory (determines the .omp-web path)
  * @param dispatchPrompt  Function to inject a prompt into the session's chat
  */
 startForSession(
  sessionId: string,
  cwd: string,
  dispatchPrompt: (text: string) => Promise<void>,
 ): { storage: CronStorage; scheduler: CronScheduler } {
  const storage = new CronStorage(cwd);
  const scheduler = new CronScheduler(storage, sessionId, dispatchPrompt);
  scheduler.start();
  this.schedulers.set(sessionId, { scheduler, storage });
  return { storage, scheduler };
 }

 /**
  * Called when a session is closed. Stops the scheduler and removes from map.
  */
 stopForSession(sessionId: string): void {
  const entry = this.schedulers.get(sessionId);
  if (!entry) return;
  entry.scheduler.stop();
  this.schedulers.delete(sessionId);
 }

 /**
  * Called on global dispose. Stops all schedulers.
  */
 dispose(): void {
  for (const entry of this.schedulers.values()) {
   entry.scheduler.stop();
  }
  this.schedulers.clear();
 }
}
