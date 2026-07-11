import type { OmpWebPlugin } from "../types";
import { createCoreActions } from "./actions";
import { createCoreWorkspacePanels } from "./panels";

export const corePlugin: OmpWebPlugin = {
  apiVersion: 1,
  name: "PI WEB Core",
  activate: () => ({
    contributions: {
      actions: createCoreActions(),
      workspacePanels: createCoreWorkspacePanels(),
    },
  }),
};
