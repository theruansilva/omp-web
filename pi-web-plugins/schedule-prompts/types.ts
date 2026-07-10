export type CronJobType = "cron" | "once" | "interval";
export type JobScope = "session" | "workspace";
export type CronJobStatus = "success" | "error" | "running";

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  prompt: string;
  enabled: boolean;
  type: CronJobType;
  intervalMs?: number;
  createdAt: string;
  runCount: number;
  lastRun?: string;
  lastStatus?: CronJobStatus;
  nextRun?: string;
  description?: string;
  scope: JobScope;
  sessionId?: string;
}

export interface CronStore {
  version: 1;
  jobs: CronJob[];
}
