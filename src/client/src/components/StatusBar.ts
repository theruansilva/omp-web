import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { SessionStatus } from "../api";
import { formatCost, formatTokenCount } from "../utils/format";
import { statusBarStyles } from "./shared";

@customElement("status-bar")
export class StatusBar extends LitElement {
  @property({ attribute: false }) status?: SessionStatus;

  override render() {
    const status = this.status;
    if (status === undefined) return html`<div class="bar muted">No session status yet</div>`;
    const context = status.contextUsage;
    const contextText = context
      ? context.percent == null
        ? `context ${formatTokenCount(context.contextWindow)}`
        : `${context.percent.toFixed(1)}%/${formatTokenCount(context.contextWindow)}`
      : "context unknown";
    const tokens = status.tokens;
    const extensionStatuses = Object.entries(status.extensionStatuses ?? {});

    return html`
      <div class="bar">
        <div class="left">
          ${status.planMode?.enabled ? html`
            <span class="ext-status plan-mode-status ${status.planMode.proposedPlan ? "plan-proposed" : ""}" title=${status.planMode.proposedPlan ? "Plan proposed: click chip above to review" : "Plan mode active"}>
              📋 ${status.planMode.proposedPlan ? `Plan: ${status.planMode.proposedPlan.title}` : "Plan Mode"}
            </span>
          ` : null}
          ${extensionStatuses.map(([key, text]) => html`
            <span class="ext-status" title=${`${key}: ${text}`}>${text}</span>
          `)}
        </div>
        <div class="right">
          <span>↑${formatTokenCount(tokens.input)}</span>
          <span>↓${formatTokenCount(tokens.output)}</span>
          <span class="context">${contextText}</span>
          <span>${formatCost(status.cost)}</span>
          ${status.pendingMessageCount > 0 ? html`<span>${String(status.pendingMessageCount)} queued</span>` : null}
        </div>
      </div>
    `;
  }

  static override styles = statusBarStyles;
}
