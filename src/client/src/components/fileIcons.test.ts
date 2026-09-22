import { describe, expect, it } from "bun:test";
import { getFileCategory, renderDownloadIcon, renderFileIcon, renderFolderIcon, renderGridViewIcon, renderListViewIcon, renderTreeChevron, renderUpFolderIcon } from "./fileIcons";

describe("fileIcons", () => {
  it("classifies code and script files correctly", () => {
    expect(getFileCategory("app.ts")).toBe("typescript");
    expect(getFileCategory("Component.tsx")).toBe("typescript");
    expect(getFileCategory("index.js")).toBe("javascript");
    expect(getFileCategory("Button.jsx")).toBe("javascript");
    expect(getFileCategory("script.py")).toBe("python");
    expect(getFileCategory("lib.rs")).toBe("rust");
    expect(getFileCategory("main.go")).toBe("go");
    expect(getFileCategory("main.c")).toBe("c");
    expect(getFileCategory("header.hpp")).toBe("c");
    expect(getFileCategory("Program.cs")).toBe("csharp");
    expect(getFileCategory("Main.java")).toBe("java");
    expect(getFileCategory("deploy.sh")).toBe("shell");
    expect(getFileCategory("setup.bash")).toBe("shell");
  });

  it("classifies web and config files correctly", () => {
    expect(getFileCategory("index.html")).toBe("html");
    expect(getFileCategory("styles.css")).toBe("css");
    expect(getFileCategory("theme.scss")).toBe("css");
    expect(getFileCategory("data.json")).toBe("json");
    expect(getFileCategory("config.yaml")).toBe("config");
    expect(getFileCategory("settings.toml")).toBe("config");
    expect(getFileCategory(".env")).toBe("config");
    expect(getFileCategory(".env.production")).toBe("config");
  });

  it("classifies special filenames correctly", () => {
    expect(getFileCategory("Dockerfile")).toBe("docker");
    expect(getFileCategory("docker-compose.yml")).toBe("docker");
    expect(getFileCategory(".gitignore")).toBe("git");
    expect(getFileCategory("package.json")).toBe("package");
    expect(getFileCategory("bun.lock")).toBe("lock");
    expect(getFileCategory("package-lock.json")).toBe("lock");
  });

  it("classifies media and documents correctly", () => {
    expect(getFileCategory("photo.png")).toBe("image");
    expect(getFileCategory("vector.svg")).toBe("image");
    expect(getFileCategory("song.mp3")).toBe("audio");
    expect(getFileCategory("video.mp4")).toBe("video");
    expect(getFileCategory("archive.zip")).toBe("archive");
    expect(getFileCategory("notes.md")).toBe("markdown");
    expect(getFileCategory("log.txt")).toBe("text");
    expect(getFileCategory("document.pdf")).toBe("pdf");
    expect(getFileCategory("database.sqlite")).toBe("database");
    expect(getFileCategory("unknown.weirdext")).toBe("default");
  });

  it("renders templates without error", () => {
    expect(renderFolderIcon(false)).toBeDefined();
    expect(renderFolderIcon(true)).toBeDefined();
    expect(renderTreeChevron(false)).toBeDefined();
    expect(renderTreeChevron(true)).toBeDefined();
    expect(renderDownloadIcon()).toBeDefined();
    expect(renderGridViewIcon()).toBeDefined();
    expect(renderListViewIcon()).toBeDefined();
    expect(renderUpFolderIcon()).toBeDefined();
    expect(renderFileIcon("test.ts")).toBeDefined();
    expect(renderFileIcon("test.unknown")).toBeDefined();
  });
});

import { loadFilesViewMode } from "./WorkspaceFilesPanel";

describe("loadFilesViewMode", () => {
  it("defaults to grid view mode", () => {
    expect(loadFilesViewMode()).toBe("grid");
  });
});
