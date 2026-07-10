import * as fs from "node:fs";
import * as path from "node:path";
import type { CronJob, CronJobUpdate, CronStore } from "./types.js";

/**
 * Handles persistence of scheduled prompts to .pi-web/schedule-prompts.json
 */
export class CronStorage {
 private readonly storePath: string;
 private readonly storeDir: string;

 constructor(workspaceCwd: string) {
  this.storeDir = path.join(workspaceCwd, ".pi-web");
  this.storePath = path.join(this.storeDir, "schedule-prompts.json");
 }

 /**
  * Load scheduled prompts from disk
  */
 load(): CronStore {
  try {
   if (fs.existsSync(this.storePath)) {
    const data = fs.readFileSync(this.storePath, "utf-8");
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- JSON.parse returns unknown
    const store = JSON.parse(data) as CronStore;
    return store;
   }
  } catch (error) {
   console.error("Failed to load scheduled prompts:", error);
  }

  // Return empty store if file doesn't exist or is corrupted
  return { jobs: [], version: 1 };
 }

 /**
  * Save scheduled prompts to disk
  */
 save(store: CronStore): void {
  try {
   // Ensure store directory exists
   if (!fs.existsSync(this.storeDir)) {
    fs.mkdirSync(this.storeDir, { recursive: true });
   }

   // Write atomically using temp file
   const tempPath = `${this.storePath}.tmp`;
   fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), "utf-8");
   fs.renameSync(tempPath, this.storePath);
  } catch (error) {
   console.error("Failed to save scheduled prompts:", error);
   throw error;
  }
 }

 /**
  * Check if a job name already exists
  */
 hasJobWithName(name: string): boolean {
  const store = this.load();
  return store.jobs.some((j) => j.name === name);
 }

 /**
  * Add a new job
  */
 addJob(job: CronJob): void {
  const store = this.load();
  store.jobs.push(job);
  this.save(store);
 }

 /**
  * Remove a job by ID
  */
 removeJob(id: string): boolean {
  const store = this.load();
  const initialLength = store.jobs.length;
  store.jobs = store.jobs.filter((j) => j.id !== id);

  if (store.jobs.length < initialLength) {
   this.save(store);
   return true;
  }
  return false;
 }

 /**
  * Update a job by ID
  */
 updateJob(id: string, partial: CronJobUpdate): boolean {
  const store = this.load();
  const job = store.jobs.find((j) => j.id === id);

  if (job) {
   for (const [key, value] of Object.entries(partial)) {
    if (value === undefined) {
     Reflect.deleteProperty(job, key);
    } else {
     // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- dynamic key value assignment on CronJob
     (job as unknown as Record<string, unknown>)[key] = value;
    }
   }
   this.save(store);
   return true;
  }
  return false;
 }

 /**
  * Get a single job by ID
  */
 getJob(id: string): CronJob | undefined {
  const store = this.load();
  return store.jobs.find((j) => j.id === id);
 }

 /**
  * Get all jobs
  */
 getAllJobs(): CronJob[] {
  const store = this.load();
  return store.jobs;
 }

 /**
  * Get storage file path
  */
 getStorePath(): string {
  return this.storePath;
 }
}
