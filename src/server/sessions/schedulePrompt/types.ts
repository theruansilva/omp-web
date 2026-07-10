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
 /** scope determina se dispara só na sessão criadora ou em qualquer sessão do workspace */
 scope: JobScope;
 /** sessionId preenchido quando scope === "session"; ausente quando scope === "workspace" */
 sessionId?: string;
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
