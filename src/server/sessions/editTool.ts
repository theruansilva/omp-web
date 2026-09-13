import type { ImageContent } from "@oh-my-pi/pi-ai";
import { Settings } from "@oh-my-pi/pi-coding-agent";
import { EditTool } from "@oh-my-pi/pi-coding-agent/edit";
import type { ToolDefinition } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";
import { computeEditPreview, type EditReplacement } from "./editPreview.js";
import { isRecord } from "../utils.js";

function isEditReplacement(x: unknown): x is EditReplacement {
  return isRecord(x);
}

function isEditParams(params: unknown): params is Parameters<EditTool["execute"]>[1] {
  return isRecord(params) && typeof params["path"] === "string" && Array.isArray(params["edits"]);
}

export function createOmpWebEditToolDefinition(cwd: string): ToolDefinition {
  const editTool = new EditTool({
    cwd,
    hasUI: true,
    getSessionFile: () => null,
    getSessionSpawns: () => null,
    settings: Settings.isolated({}),
  });
  const def: ToolDefinition = {
    name: editTool.name,
    label: editTool.label,
    description: editTool.description,
    parameters: editTool.parameters,
    async execute(toolCallId, params, signal, onUpdate) {
      if (isRecord(params) && typeof params["path"] === "string" && params["path"].length > 0) {
        const path = params["path"];
        const rawEdits = Array.isArray(params["edits"]) ? params["edits"] : [];
        const edits: EditReplacement[] = [];
        for (const item of rawEdits) {
          if (isEditReplacement(item)) edits.push(item);
        }
        const preview = await computeEditPreview(path, edits, cwd);
        if (signal?.aborted !== true) {
          onUpdate?.({ content: [{ type: "text", text: "Edit preview computed." }], details: { preview } });
        }
      }
      type EditExecuteFn = (
        toolCallId: string,
        params: Parameters<EditTool["execute"]>[1],
        signal?: AbortSignal,
        onUpdate?: (partialResult: { content: ({ type: "text"; text: string } | ImageContent)[]; details?: unknown }) => void,
      ) => Promise<{ content: ({ type: "text"; text: string } | ImageContent)[] }>;
      const execute: EditExecuteFn = Reflect.get(editTool, "execute");
      const executeParams = isEditParams(params) ? params : { path: "", edits: [] };
      const res = execute.call(editTool, toolCallId, executeParams, signal, onUpdate);
      return res;
    },
  };
  return def;
}
