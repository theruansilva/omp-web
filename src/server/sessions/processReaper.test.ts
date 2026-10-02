import { describe, expect, it } from "bun:test";
import { reapOrphanProcesses } from "./processReaper.js";

describe("reapOrphanProcesses", () => {
  it("runs without throwing when no matching orphan processes exist", async () => {
    await expect(reapOrphanProcesses()).resolves.toBeUndefined();
  });
});
