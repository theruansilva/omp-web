import type { OmpWebPlugin } from "@ProgmRuanSilva/omp-web/plugin-api";
import { defineMcpsPanelElement, mcpsBadge } from "./mcpsPanelElement.js";

const plugin: OmpWebPlugin = {
  apiVersion: 1,
  name: "MCP Servers",
  activate: ({ pluginId, html, svg }) => {
    defineMcpsPanelElement();
    return {
      contributions: {
        actions: [
          {
            id: "workspace.open-mcps",
            title: "Open MCP Servers",
            description: "Open the MCP Servers panel.",
            group: "Workspace",
            enabled: (context) => context.state.selectedWorkspace !== undefined,
            run: (context) => {
              if (context.state.selectedWorkspace === undefined) return;
              context.selectWorkspaceTool(`${pluginId}:workspace.mcps`);
            },
          },
        ],
        workspacePanels: [
          {
            id: "workspace.mcps",
            title: "MCPs",
            icon: svg`
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                <line x1="6" y1="6" x2="6.01" y2="6"></line>
                <line x1="6" y1="18" x2="6.01" y2="18"></line>
              </svg>
            `,
            order: 55,
            badge: (context) => mcpsBadge(context),
            render: (context) => html`<omp-web-mcps-panel .context=${context}></omp-web-mcps-panel>`,
          },
        ],
      },
    };
  },
};

export default plugin;
