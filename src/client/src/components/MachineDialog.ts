import { LitElement, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

export interface MachineDialogSubmit {
  name: string;
  baseUrl: string;
  token?: string;
}

@customElement("machine-dialog")
export class MachineDialog extends LitElement {
  @property({ attribute: false }) onSubmit?: (input: MachineDialogSubmit) => void | Promise<void>;
  @property({ attribute: false }) onCancel?: () => void;
  @property() error = "";

  @state() private url = "";
  @state() private name = "";
  @state() private token = "";
  @state() private submitting = false;
  @query("input[name='baseUrl']") private urlInput?: HTMLInputElement;
  @query("input[name='name']") private nameInput?: HTMLInputElement;

  private nameEdited = false;
  private previousSuggestedName = "";

  override firstUpdated(): void {
    this.urlInput?.focus();
  }

  private handleUrlInput(event: InputEvent): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    const url = event.target.value;
    const suggestedName = suggestedMachineNameFromUrl(url);
    if (!this.nameEdited || this.name.trim() === "" || this.name === this.previousSuggestedName) this.name = suggestedName;
    this.previousSuggestedName = suggestedName;
    this.url = url;
  }

  private handleNameInput(event: InputEvent): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    this.nameEdited = true;
    this.name = event.target.value;
  }

  private handleTokenInput(event: InputEvent): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    this.token = event.target.value;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      this.onCancel?.();
      return;
    }
    if (event.key === "Enter" && event.target instanceof HTMLInputElement && event.target.name === "baseUrl" && machineBaseUrlValidationMessage(this.url) === undefined) {
      event.preventDefault();
      void this.updateComplete.then(() => {
        this.nameInput?.focus();
        this.nameInput?.select();
      });
    }
  }

  private handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.submit();
  }

  private async submit(): Promise<void> {
    const input = this.validInput();
    if (input === undefined || this.submitting) return;
    this.submitting = true;
    try {
      await this.onSubmit?.(input);
    } finally {
      if (this.isConnected) this.submitting = false;
    }
  }

  private validInput(): MachineDialogSubmit | undefined {
    const baseUrl = this.url.trim();
    const name = this.name.trim();
    if (baseUrl === "" || name === "" || machineBaseUrlValidationMessage(baseUrl) !== undefined) return undefined;
    const token = this.token.trim();
    return { name, baseUrl, ...(token === "" ? {} : { token }) };
  }

  override render() {
    const hasUrl = this.url.trim() !== "";
    const urlError = hasUrl ? machineBaseUrlValidationMessage(this.url) : undefined;
    const canSubmit = this.validInput() !== undefined && !this.submitting;
    return html`
      <div class="backdrop" @click=${() => this.onCancel?.()}>
        <section @click=${(event: Event) => { event.stopPropagation(); }}>
          <form @submit=${(event: SubmitEvent) => { this.handleSubmit(event); }} @keydown=${(event: KeyboardEvent) => { this.handleKeyDown(event); }}>
            <header>
              <strong>Add machine</strong>
              <button type="button" @click=${() => { this.onCancel?.(); }} aria-label="Close">×</button>
            </header>
            <div class="body">
              ${this.error === "" ? null : html`<div class="dialog-error" role="alert">${this.error}</div>`}
              <label>
                Remote OMP Web URL
                <input name="baseUrl" type="url" .value=${this.url} @input=${(event: InputEvent) => { this.handleUrlInput(event); }} placeholder="http://dev-box.local:8504" autocomplete="url" inputmode="url" autofocus />
              </label>
              <small class=${urlError === undefined ? "hint" : "field-error"}>${urlError ?? "Enter the reachable base URL first, including http:// or https://."}</small>
              ${hasUrl ? html`
                <label>
                  Machine name
                  <input name="name" type="text" .value=${this.name} @input=${(event: InputEvent) => { this.handleNameInput(event); }} placeholder=${this.previousSuggestedName || "Dev Box"} autocomplete="off" />
                </label>
                <small class="hint">Suggested from the URL. Edit it to use a friendlier sidebar label.</small>
                <label>
                  Bearer token <span class="optional">optional</span>
                  <input name="token" type="password" .value=${this.token} @input=${(event: InputEvent) => { this.handleTokenInput(event); }} placeholder="Leave blank if the remote machine does not require one" autocomplete="off" />
                </label>
                <small class="hint">Paste only the token value; OMP Web sends it as an Authorization: Bearer header.</small>
              ` : html`<p class="hint intro">After you enter a URL, OMP Web will suggest a machine name and let you add an optional bearer token.</p>`}
            </div>
            <footer>
              <button type="button" @click=${() => { this.onCancel?.(); }}>Cancel</button>
              <button class="primary" type="submit" ?disabled=${!canSubmit}>${this.submitting ? "Adding…" : "Add machine"}</button>
            </footer>
          </form>
        </section>
      </div>
    `;
  }

  static override styles = css`
    :host {
      position: fixed;
      inset: 0;
      z-index: 9999;
      color: var(--pi-text, #e6edf3);
      font: 14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .backdrop {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      background: var(--pi-overlay, rgba(0, 0, 0, 0.65));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      padding: 16px;
    }
    section {
      width: min(520px, calc(100vw - 32px));
      max-height: min(640px, calc(100vh - 40px));
      border: 1px solid var(--pi-border, rgba(255, 255, 255, 0.12));
      border-radius: 16px;
      background: var(--pi-bg, #1a1a20);
      color: var(--pi-text, #f3f4f6);
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
      overflow: hidden;
      animation: dialogIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    :host-context([data-theme="light"]) section,
    :host-context(.light) section {
      background: #ffffff;
      color: #111827;
      border-color: rgba(0, 0, 0, 0.12);
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.15);
    }
    form {
      display: flex;
      flex-direction: column;
      max-height: inherit;
      min-height: 0;
    }
    header, footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 14px 18px;
      border-bottom: 1px solid var(--pi-border, rgba(255, 255, 255, 0.1));
      background: var(--pi-surface, rgba(255, 255, 255, 0.03));
    }
    :host-context([data-theme="light"]) header,
    :host-context([data-theme="light"]) footer {
      border-color: rgba(0, 0, 0, 0.08);
      background: #fcfcfd;
    }
    footer {
      border-top: 1px solid var(--pi-border, rgba(255, 255, 255, 0.1));
      border-bottom: 0;
      justify-content: flex-end;
    }
    .body {
      display: grid;
      gap: 12px;
      padding: 18px;
      min-height: 0;
      overflow: auto;
    }
    label {
      display: grid;
      gap: 6px;
      color: var(--pi-muted, #9ca3af);
      font-size: 13px;
      font-weight: 500;
    }
    :host-context([data-theme="light"]) label {
      color: #4b5563;
    }
    input {
      box-sizing: border-box;
      width: 100%;
      border: 1px solid var(--pi-border, rgba(255, 255, 255, 0.15));
      border-radius: 10px;
      background: var(--pi-bg, #111115);
      color: var(--pi-text, #f3f4f6);
      padding: 10px 12px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    :host-context([data-theme="light"]) input {
      background: #f9fafb;
      color: #111827;
      border-color: rgba(0, 0, 0, 0.15);
    }
    input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
    }
    .hint {
      color: var(--pi-muted, #9ca3af);
      font-size: 12px;
      line-height: 1.4;
    }
    :host-context([data-theme="light"]) .hint {
      color: #6b7280;
    }
    .intro {
      margin: 4px 0 0;
      line-height: 1.5;
    }
    .optional {
      color: var(--pi-muted, #6b7280);
      font-weight: 400;
      font-size: 11px;
    }
    .field-error {
      color: var(--pi-danger, #ef4444);
      font-size: 12px;
    }
    .dialog-error {
      border: 1px solid var(--pi-danger, #ef4444);
      border-radius: 10px;
      background: rgba(239, 68, 68, 0.1);
      color: var(--pi-danger, #f87171);
      padding: 10px 12px;
      font-size: 13px;
      line-height: 1.4;
    }
    button {
      border: 1px solid var(--pi-border, rgba(255, 255, 255, 0.15));
      border-radius: 10px;
      background: var(--pi-surface, rgba(255, 255, 255, 0.08));
      color: var(--pi-text, #f3f4f6);
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.15s, opacity 0.15s;
    }
    button:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.12);
    }
    :host-context([data-theme="light"]) button:not(.primary) {
      background: #f3f4f6;
      color: #1f2937;
      border-color: rgba(0, 0, 0, 0.12);
    }
    :host-context([data-theme="light"]) button:not(.primary):hover:not(:disabled) {
      background: #e5e7eb;
    }
    header button {
      border: 0;
      background: transparent;
      color: var(--pi-muted, #9ca3af);
      font-size: 20px;
      padding: 4px 8px;
      border-radius: 6px;
    }
    header button:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--pi-text, #f3f4f6);
    }
    :host-context([data-theme="light"]) header button {
      color: #6b7280;
    }
    :host-context([data-theme="light"]) header button:hover {
      background: rgba(0, 0, 0, 0.06);
      color: #111827;
    }
    .primary {
      border-color: #2563eb;
      background: #2563eb;
      color: #ffffff;
    }
    .primary:hover:not(:disabled) {
      background: #1d4ed8;
    }
    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    @keyframes dialogIn {
      from { opacity: 0; transform: scale(0.96) translateY(6px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `;
}

export function suggestedMachineNameFromUrl(value: string): string {
  const raw = value.trim();
  if (raw === "") return "";
  const parsed = parseUrlForSuggestion(raw) ?? parseUrlForSuggestion(`http://${raw.replace(/^\/+/u, "")}`);
  if (parsed !== undefined && parsed.hostname !== "") return parsed.hostname.replace(/^\[(.*)\]$/u, "$1");
  return fallbackSuggestedName(raw);
}

export function machineBaseUrlValidationMessage(value: string): string | undefined {
  const raw = value.trim();
  if (raw === "") return "Remote OMP Web URL is required.";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "Enter a valid URL including http:// or https://.";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "Use an http:// or https:// URL.";
  if (url.username !== "" || url.password !== "") return "Do not include credentials in the machine URL.";
  if (url.search !== "" || url.hash !== "") return "Do not include a query string or fragment.";
  return undefined;
}

function parseUrlForSuggestion(value: string): URL | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

function fallbackSuggestedName(value: string): string {
  const withoutProtocol = value.replace(/^[a-z][a-z\d+.-]*:\/\//iu, "");
  const withoutCredentials = withoutProtocol.slice(withoutProtocol.lastIndexOf("@") + 1);
  const host = withoutCredentials.split(/[/?#]/u)[0] ?? "";
  if (host.startsWith("[") && host.includes("]")) return host.slice(1, host.indexOf("]"));
  return host.replace(/:\d+$/u, "");
}
