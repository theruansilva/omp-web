import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * Reaps orphaned processes spawned by evaluations, scripts, or test runners
 * (e.g. runner-*.py from /tmp/omp-python-runner or stray chrome/playwright test browsers)
 * that may have detached when a session or server exits.
 */
export async function reapOrphanProcesses(): Promise<void> {
 if (process.platform === "win32") return;

 const patterns = [
  "omp-python-runner/runner-",
  "puppeteer_dev_chrome_profile-",
 ];

 for (const pattern of patterns) {
  try {
   await execAsync(`pkill -9 -f "${pattern}"`);
  } catch {
   // pkill returns non-zero when no matching processes are found
  }
 }
}
