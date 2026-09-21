export type CronJobType = "cron" | "once" | "interval";
export type JobScope = "session" | "workspace";
export type CronJobStatus = "success" | "error" | "running";
export type CronJobTarget = "prompt" | "command";

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  target?: CronJobTarget | undefined;
  prompt?: string | undefined;
  command?: string | undefined;
  enabled: boolean;
  type: CronJobType;
  intervalMs?: number | undefined;
  createdAt: string;
  runCount: number;
  lastRun?: string | undefined;
  lastStatus?: CronJobStatus | undefined;
  nextRun?: string | undefined;
  description?: string | undefined;
  /** scope determina se dispara só na sessão criadora ou em qualquer sessão do workspace */
  scope: JobScope;
  /** sessionId preenchido quando scope === "session"; ausente quando scope === "workspace" */
  sessionId?: string | undefined;
}

export interface CronStore {
  version: 1;
  jobs: CronJob[];
}

/** Update type that allows setting any property to `undefined` for deletion semantics.
 *  Unlike `Partial<CronJob>`, each property explicitly accepts `| undefined` so
 *  `exactOptionalPropertyTypes` does not reject setting a field to `undefined`. */
export type CronJobUpdate = {
  [K in keyof CronJob]?: CronJob[K] | undefined;
};
