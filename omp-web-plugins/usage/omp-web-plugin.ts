import type { OmpWebPlugin } from "@ProgmRuanSilva/omp-web/plugin-api";
import { defineUsagePanelElement } from "./usagePanelElement.js";

const plugin: OmpWebPlugin = {
  apiVersion: 1,
  name: "Provider Usage",
  activate: ({ pluginId, html, svg }) => {
    defineUsagePanelElement();
    return {
      contributions: {
        actions: [
          {
            id: "workspace.open-usage",
            title: "Open Provider Usage",
            description: "Show provider usage, rate limits, and quota windows.",
            group: "Workspace",
            enabled: (context) => context.state.selectedWorkspace !== undefined,
            run: (context) => {
              if (context.state.selectedWorkspace === undefined) return;
              context.selectWorkspaceTool(`${pluginId}:workspace.usage`);
            },
          },
        ],
        workspacePanels: [
          {
            id: "workspace.usage",
            title: "Usage",
            icon: svg`
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20v-6M6 20V10M18 20V4"></path>
              </svg>
            `,
            order: 56,
            render: (context) => html`<omp-web-usage-panel .context=${context}></omp-web-usage-panel>`,
          },
        ],
      },
    };
  },
};

export default plugin;
