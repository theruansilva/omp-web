import { constants } from "node:fs";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "bun:test";
import { gunzipFile, SessionArchiveStore } from "./sessionArchiveStore.js";

const tempRoots: string[] = [];

describe("SessionArchiveStore", () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
  });

  it("moves archived session files out of the active session directory and restores them", async () => {
    const root = await mkdtemp(join(tmpdir(), "omp-web-archive-"));
    tempRoots.push(root);
    const activeDir = join(root, "active");
    await mkdir(activeDir, { recursive: true });
    const sourcePath = join(activeDir, "2026-01-01_s1.jsonl");
    await writeFile(sourcePath, "session contents\n", "utf8");

    const store = new SessionArchiveStore(join(root, "archived-sessions.json"), join(root, "archived-files"));
    const record = await store.archive({
      sessionId: "s1",
      cwd: "/workspace",
      path: sourcePath,
      created: "2026-01-01T00:00:00.000Z",
      modified: "2026-01-01T00:01:00.000Z",
      messageCount: 2,
      firstMessage: "hello",
    });

    expect(await exists(sourcePath)).toBe(false);
    expect(record.originalPath).toBe(sourcePath);
    if (record.archivePath === undefined) throw new Error("Expected archive path");
    expect(record.archivePath.endsWith(".gz")).toBe(true);
    const unzippedTemp = join(root, "unzipped.jsonl");
    await gunzipFile(record.archivePath, unzippedTemp);
    expect(await readFile(unzippedTemp, "utf8")).toBe("session contents\n");
    await expect(store.list()).resolves.toMatchObject([{ sessionId: "s1", originalPath: sourcePath, archivePath: record.archivePath, messageCount: 2 }]);

    await store.restore("s1");

    expect(await readFile(sourcePath, "utf8")).toBe("session contents\n");
    expect(await exists(record.archivePath)).toBe(false);
    await expect(store.list()).resolves.toEqual([]);
  });

  it("permanently deletes archived session files and records", async () => {
    const root = await mkdtemp(join(tmpdir(), "omp-web-archive-delete-"));
    tempRoots.push(root);
    const activeDir = join(root, "active");
    await mkdir(activeDir, { recursive: true });
    const sourcePath = join(activeDir, "2026-01-01_s1.jsonl");
    await writeFile(sourcePath, "session contents\n", "utf8");

    const store = new SessionArchiveStore(join(root, "archived-sessions.json"), join(root, "archived-files"));
    const record = await store.archive({
      sessionId: "s1",
      cwd: "/workspace",
      path: sourcePath,
      created: "2026-01-01T00:00:00.000Z",
      modified: "2026-01-01T00:01:00.000Z",
      messageCount: 2,
      firstMessage: "hello",
    });

    if (record.archivePath === undefined) throw new Error("Expected archive path");
    await store.deleteArchived("s1");

    expect(await exists(sourcePath)).toBe(false);
    expect(await exists(record.archivePath)).toBe(false);
    await expect(store.list()).resolves.toEqual([]);
  });

  it("archives and permanently deletes sessions in batches", async () => {
    const root = await mkdtemp(join(tmpdir(), "omp-web-archive-batch-"));
    tempRoots.push(root);
    const activeDir = join(root, "active");
    await mkdir(activeDir, { recursive: true });
    const sourceA = join(activeDir, "2026-01-01_a.jsonl");
    const sourceB = join(activeDir, "2026-01-01_b.jsonl");
    await writeFile(sourceA, "a\n", "utf8");
    await writeFile(sourceB, "b\n", "utf8");

    const store = new SessionArchiveStore(join(root, "archived-sessions.json"), join(root, "archived-files"));
    const records = await store.archiveMany([
      {
        sessionId: "a",
        cwd: "/workspace",
        path: sourceA,
        created: "2026-01-01T00:00:00.000Z",
        modified: "2026-01-01T00:01:00.000Z",
        messageCount: 1,
        firstMessage: "a",
      },
      {
        sessionId: "b",
        cwd: "/workspace",
        path: sourceB,
        created: "2026-01-01T00:00:00.000Z",
        modified: "2026-01-01T00:02:00.000Z",
        messageCount: 2,
        firstMessage: "b",
      },
    ]);

    expect(records.map((record) => record.sessionId)).toEqual(["a", "b"]);
    expect(await exists(sourceA)).toBe(false);
    expect(await exists(sourceB)).toBe(false);
    await expect(store.list()).resolves.toMatchObject([{ sessionId: "a" }, { sessionId: "b" }]);

    const archivePaths = records.map((record) => record.archivePath);
    if (archivePaths.some((path) => path === undefined)) throw new Error("Expected archive paths");
    await expect(store.deleteArchivedMany(["a", "b", "missing"])).resolves.toEqual(["a", "b"]);
    for (const archivePath of archivePaths) {
      if (archivePath === undefined) throw new Error("Expected archive path");
      expect(await exists(archivePath)).toBe(false);
    }
    await expect(store.list()).resolves.toEqual([]);
  });

  it("moves artifact directories to archive and restores them", async () => {
    const root = await mkdtemp(join(tmpdir(), "omp-web-archive-artifacts-"));
    tempRoots.push(root);
    const activeDir = join(root, "active");
    await mkdir(activeDir, { recursive: true });
    const sourcePath = join(activeDir, "2026-01-01_s2.jsonl");
    const artifactsDir = join(activeDir, "2026-01-01_s2");
    await mkdir(artifactsDir, { recursive: true });
    await writeFile(sourcePath, "session with artifacts\n", "utf8");
    await writeFile(join(artifactsDir, "artifact.txt"), "some artifact\n", "utf8");

    const store = new SessionArchiveStore(join(root, "archived-sessions.json"), join(root, "archived-files"));
    const record = await store.archive({
      sessionId: "s2",
      cwd: "/workspace",
      path: sourcePath,
      created: "2026-01-01T00:00:00.000Z",
      modified: "2026-01-01T00:01:00.000Z",
      messageCount: 1,
      firstMessage: "artifacts test",
    });

    if (record.archivePath === undefined) throw new Error("Expected archive path");
    const archivedArtifacts = record.archivePath.slice(0, -".jsonl.gz".length);
    expect(await exists(artifactsDir)).toBe(false);
    expect(await exists(join(archivedArtifacts, "artifact.txt"))).toBe(true);

    await store.restore("s2");
    expect(await exists(artifactsDir)).toBe(true);
    expect(await readFile(join(artifactsDir, "artifact.txt"), "utf8")).toBe("some artifact\n");
    expect(await exists(archivedArtifacts)).toBe(false);
  });
});

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
