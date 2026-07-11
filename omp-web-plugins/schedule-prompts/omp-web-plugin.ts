import type { OmpWebPlugin } from "@ProgmRuanSilva/omp-web/plugin-api";
import { defineSchedulePromptsPanelElement, schedulePromptsBadge } from "./schedulePromptsPanelElement.js";

const plugin: OmpWebPlugin = {
  apiVersion: 1,
  name: "Schedule Prompts",
  activate: ({ pluginId, html, svg }) => {
    defineSchedulePromptsPanelElement();
    return {
      contributions: {
        actions: [
          {
            id: "workspace.open-schedule-prompts",
            title: "Open Scheduled Prompts",
            description: "Open the Scheduled Prompts panel.",
            group: "Workspace",
            enabled: (context) => context.state.selectedWorkspace !== undefined,
            run: (context) => {
              if (context.state.selectedWorkspace === undefined) return;
              context.selectWorkspaceTool(`${pluginId}:workspace.schedule-prompts`);
            },
          },
        ],
        workspacePanels: [
          {
            id: "workspace.schedule-prompts",
            title: "Schedule",
            icon: svg`
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M12 7v5l3 3"></path>
              </svg>
            `,
            order: 50,
            badge: (context) => schedulePromptsBadge(context),
            render: (context) => html`<omp-web-schedule-prompts-panel .context=${context}></omp-web-schedule-prompts-panel>`,
          },
        ],
      },
    };
  },
};

export default plugin;
