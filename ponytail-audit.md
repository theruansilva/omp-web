## Ponytail Audit — `omp-web` (repo-wide)

---

- **`delete` `parsers.ts` 943-line hand-written runtime field validator.** Every API response re-validated field-by-field (`requireString`/`requireNumber`/etc.) redundant against the TypeScript types that already describe the same server contract. Delete the parsing layer; trust the server you own. `[src/client/src/api/parsers.ts]`

- **`delete` `isRecord`/`errorMessage`/`isNodeErrorWithCode` private-copied in 20+ files.** Each file redeclares 3–8 identical utility lines. One `src/shared/utils.ts` eliminates ~200 lines of duplication across `piSessionService.ts`, `sessionRoutes.ts`, `machineProxyRoutes.ts`, `configRoutes.ts`, `ompWebStatus.ts`, `projectStore.ts`, `machineStore.ts`, `chatDisclosure.ts`, `external.ts`, and more. `[src/server/**, src/client/src/**]`

- **`delete` `SAFE_RESPONSE_HEADERS`/`applySafeHeaders`/`sendGatewayError` private-copied in both proxy route files.** Extract once; each copy is identical. `[src/server/machines/machineProxyRoutes.ts, machinePluginProxyRoutes.ts]`

- **`yagni` `PiSessionService` 200-line adapter class in `piSessionService.ts` that delegates every method 1:1.** A 2643-line file with ~15 interfaces and a wholesale delegation adapter is the dominant debt in the repo. The adapter adds zero logic — inline it. `[src/server/sessions/piSessionService.ts]`

- **`yagni` `sessionCommandService.ts` — 6 interfaces for one implementation + `if`-chain dispatch.** Replace with a `Map<string, handler>` and drop the interface scaffolding. `[src/server/sessions/sessionCommandService.ts]`

- **`stdlib` `stringToHex`/`hexToString`/`isHexString` hand-rolled in `machinePluginIds.ts`.** `Buffer.from(str).toString('hex')` and `Buffer.from(hex, 'hex').toString()` do this. ~30 lines → 2 one-liners. `[src/shared/machinePluginIds.ts]`

- **`stdlib` `withTimeout` hand-rolled via `Promise.race`.** `AbortSignal.timeout(ms)` + `fetch(..., { signal })` is the platform answer. `[src/ompWebVersionReport.ts]`

- **`stdlib` `fileSuggestions.ts` recursive directory walker.** `Bun.glob` / `fs.glob` (Node 22+) handles recursive file enumeration. ~60–80 lines of manual walk → one call. `[src/server/workspaces/fileSuggestions.ts]`

- **`yagni` `ChatScrollStorage`/`ChatScrollScheduler` interfaces with single implementations + DI constructor.** The whole file wraps `localStorage` and `setTimeout`. No test doubles use the interfaces; `vi.useFakeTimers` handles the timer half. `[src/client/src/chatScrollPosition.ts]`

- **`yagni` `GatewaySettingsLoaders` interface with one implementation.** Single caller, no variants exist or are planned. `[src/client/src/components/settings/settingsDataLoading.ts]`

- **`yagni` `FileExists`/`FileStat`/`FileAccess` DI type parameters in `nodePtySpawnHelper.ts`.** Injected only in tests; `vi.mock('node:fs')` makes them unnecessary. `[src/server/diagnostics/nodePtySpawnHelper.ts]`

- **`yagni` `machineService.ts` injectable `clock`/`TTL` constructor deps.** Testing indirection for `Date.now()` — `vi.useFakeTimers` handles this without DI. `[src/server/machines/machineService.ts]`

- **`yagni` `PiPackageProvider` interface + `DefaultPiPackageProvider` stub that returns empty arrays.** Single-impl interface; the stub is not a real implementation. Inline the concrete type, delete the interface. `[src/server/ompWebPluginService.ts]`

- **`yagni` `ompWebStatusCache.ts` `onError`/`now` injectable deps.** Single consumer; `vi.useFakeTimers` replaces both. `[src/server/ompWebStatusCache.ts]`

- **`shrink` `settingsMachineTarget()` ≅ `piPackageTargetContext()` — structurally identical functions in two files.** Same labels, same shape; merge to one shared helper. `[src/client/src/components/settings/settingsMachineTarget.ts, piPackageSettings.ts]`

- **`delete` `appendRequestPath` duplicated in both `fileTreeService.ts` and `fileSuggestions.ts`.** One location. `[src/server/workspaces/fileTreeService.ts, fileSuggestions.ts]`

- **`delete` `humanizeCron`/`formatISOShort` duplicated between `scheduler.ts` and the schedule-prompts panel element.** Move to shared; the plugin re-imports from the same package anyway. `[src/server/sessions/schedulePrompt/scheduler.ts, omp-web-plugins/schedule-prompts/schedulePromptsPanelElement.ts]`

- **`yagni` `schedulePromptService.ts` — thin lifecycle wrapper with a single caller.** `PiSessionService` is the only consumer; the service indirection adds a layer with no abstraction value. `[src/server/sessions/schedulePrompt/schedulePromptService.ts]`

- **`shrink` `parseRelativeTime`/`parseInterval` in `scheduler.ts` — near-identical regex + unit-map loops.** One parameterized function. `[src/server/sessions/schedulePrompt/scheduler.ts]`

- **`yagni` `OmpWebConfig` type alias for `OmpWebConfigValues`.** Same type, two names, one is never independently useful. `[src/config.ts]`

- **`shrink` `clampNumber` reinvents `Math.min(Math.max(lo, n), hi)`.** Three lines → one expression; `clampPercent` then also inlines. `[src/client/src/components/ChatView.ts]`

- **`shrink` `fileListToArray` wraps `Array.from`.** One callsite; inline it. `[src/client/src/components/WorkspaceFilesPanel.ts]`

- **`shrink` `cwdPathsEqual` wraps `resolve(a) === resolve(b)` at one callsite.** Inline the expression; delete the function. `[src/server/workingDirectory.ts]`

- **`native` `TypeBox` dependency used for a single schema definition in `tool.ts`.** The schema could be a plain `zod`-free TS type + manual narrow (already done everywhere else in the codebase) or Fastify's built-in JSON Schema. Removes one dep. `[src/server/sessions/schedulePrompt/tool.ts]`

- **`delete` `outputText` 3-line helper used exactly once in `cli.ts`.** Inline it. `[src/cli.ts:~300]`

- **`delete` `isHttpNotFound` single-use predicate in `ompWebVersionReport.ts`.** Inline `response.status === 404`. `[src/ompWebVersionReport.ts]`

- **`yagni` `idPattern`/`localIdPattern` are the same regex in `registry.ts`.** One constant. `[src/client/src/plugins/registry.ts]`

- **`delete` `detectPiPackageInstallation` dead stub in `ompWebStatus.ts`.** Never called meaningfully; returns undefined/empty. `[src/server/ompWebStatus.ts]`

- **`yagni` `AuthServiceDependencies` interface with one required field.** Inline the type at the callsite. `[src/server/sessions/authService.ts]`

---

**net: −800 to −1200 lines, −1 dep (`typebox`) possible.**

The single biggest lever is `parsers.ts` (delete ~900 lines) followed by the `isRecord`/`errorMessage`/`isNodeErrorWithCode` consolidation (−200 lines across 20+ files) and the `piSessionService.ts` adapter class (−200 lines). Everything else is noise-level.

