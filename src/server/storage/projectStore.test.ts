import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { projectStorePath } from "./projectStore.js";

describe("projectStorePath", () => {
  it("uses OMP_WEB_DATA_DIR by default", () => {
    expect(projectStorePath({ OMP_WEB_DATA_DIR: "demo-data" }, "/tmp/omp-web")).toBe(resolve("/tmp/omp-web", "demo-data", "projects.json"));
  });

  it("uses OMP_WEB_PROJECTS_FILE when configured", () => {
    expect(projectStorePath({ OMP_WEB_PROJECTS_FILE: "demo/projects.json" }, "/tmp/omp-web")).toBe(resolve("/tmp/omp-web", "demo/projects.json"));
  });
});
