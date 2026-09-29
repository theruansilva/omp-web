import "./OmpStatusButton";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  renderCloseIcon,
  renderLockIcon,
  renderUserIcon,
  renderEyeIcon,
  renderEyeOffIcon,
  renderCheckIcon,
} from "./icons";

export interface LoginSubmitDetail {
  username: string;
}

@customElement("omp-login-modal")
export class OmpLoginModal extends LitElement {
  @property({ type: Boolean }) isOpen = false;
  @property({ type: String }) theme: "dark" | "light" = "dark";

  @property({ type: Boolean }) setupRequired = false;

  @state() private username = "";
  @state() private password = "";
  @state() private confirmPassword = "";
  @state() private token = "";
  @state() private showPassword = false;
  @state() private tokenMode = false;
  @state() private errorMessage = "";
  @state() private isLoading = false;
  @state() private isSuccess = false;

  protected override createRenderRoot() {
    return this;
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && this.isOpen) {
      this.handleClose();
    }
  };

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.handleKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("isOpen") && this.isOpen) {
      this.username = "";
      this.password = "";
      this.confirmPassword = "";
      this.errorMessage = "";
      this.isLoading = false;
      this.isSuccess = false;
      this.tokenMode = false;

      if (typeof window !== "undefined") {
        const queryToken = new URLSearchParams(window.location.search).get("token");
        if (queryToken) {
          this.token = queryToken;
        }
      }

      void this.checkSetupStatus();

      requestAnimationFrame(() => {
        const input = this.querySelector<HTMLInputElement>(
          "#login-username-input",
        );
        input?.focus();
      });
    }
  }

  private async checkSetupStatus() {
    try {
      const res = await fetch("/api/omp-web/auth");
      if (res.ok) {
        const data = await res.json() as { setupRequired?: boolean };
        if (data.setupRequired) {
          this.setupRequired = true;
        }
      }
    } catch {
      // offline or error
    }
  }

  private handleClose() {
    this.dispatchEvent(
      new CustomEvent("close", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();
    this.errorMessage = "";

    // 1. Direct Token mode
    if (this.tokenMode) {
      const tokenVal = this.token.trim();
      if (!tokenVal) {
        this.errorMessage = "Insira o token de acesso";
        return;
      }

      this.isLoading = true;
      try {
        const res = await fetch("/api/omp-web/auth", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: tokenVal }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          this.errorMessage = data.error || "Token de acesso inválido";
          this.isLoading = false;
          return;
        }
        if (data.token || tokenVal) {
          try {
            localStorage.setItem("omp_web_token", data.token || tokenVal);
          } catch { }
        }

        this.isLoading = false;
        this.isSuccess = true;
        this.dispatchEvent(
          new CustomEvent("login-success", {
            detail: { username: "admin" } as LoginSubmitDetail,
            bubbles: true,
            composed: true,
          }),
        );
        setTimeout(() => {
          this.handleClose();
        }, 400);
      } catch {
        this.errorMessage = "Erro de conexão ao autenticar token";
        this.isLoading = false;
      }
      return;
    }

    // 2. Setup mode (Primeiro Acesso)
    if (this.setupRequired) {
      if (!this.username.trim() || !this.password) {
        this.errorMessage = "Preencha o nome e a senha";
        return;
      }
      if (this.password !== this.confirmPassword) {
        this.errorMessage = "As senhas não coincidem";
        return;
      }
      if (this.password.length < 6) {
        this.errorMessage = "A senha deve ter no mínimo 6 caracteres";
        return;
      }


      this.isLoading = true;
      try {
        const res = await fetch("/api/omp-web/setup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            username: this.username.trim(),
            password: this.password,
            token: this.token.trim(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          this.errorMessage = data.error || "Erro ao configurar credenciais";
          this.isLoading = false;
          return;
        }
        if (data.token) {
          try {
            localStorage.setItem("omp_web_token", data.token);
          } catch { }
        }

        this.isLoading = false;
        this.isSuccess = true;
        this.setupRequired = false;
        this.dispatchEvent(
          new CustomEvent("login-success", {
            detail: { username: (data as any)?.username || this.username.trim() || "admin" } as LoginSubmitDetail,
            bubbles: true,
            composed: true,
          }),
        );
        setTimeout(() => {
          this.handleClose();
        }, 400);
      } catch {
        this.errorMessage = "Erro de conexão ao salvar credenciais";
        this.isLoading = false;
      }
      return;
    }

    // 3. Normal Username + Password login
    if (!this.username.trim() || !this.password) {
      this.errorMessage = "Preencha o nome e a senha";
      return;
    }

    this.isLoading = true;
    try {
      const res = await fetch("/api/omp-web/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: this.username.trim(),
          password: this.password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        this.errorMessage = data.error || "Usuário ou senha incorretos";
        this.isLoading = false;
        return;
      }
      if (data.token) {
        try {
          localStorage.setItem("omp_web_token", data.token);
        } catch { }
      }

      this.isLoading = false;
      this.isSuccess = true;
      this.dispatchEvent(
        new CustomEvent("login-success", {
          detail: { username: this.username.trim() } as LoginSubmitDetail,
          bubbles: true,
          composed: true,
        }),
      );
      setTimeout(() => {
        this.handleClose();
      }, 400);
    } catch {
      this.errorMessage = "Erro de conexão ao realizar login";
      this.isLoading = false;
    }
  }

  override render() {
    if (!this.isOpen) return nothing;

    return html`
      <style>
        .omp-squircle-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background-color: rgba(0, 0, 0, 0.40);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          animation: ompFadeIn 0.2s ease-out;
        }

        .dark .omp-squircle-backdrop,
        [data-theme="dark"] .omp-squircle-backdrop {
          background-color: rgba(0, 0, 0, 0.70);
        }

        @keyframes ompFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Squircle Wrapper with Drop Shadow following the curvature */
        .omp-squircle-wrapper {
          position: relative;
          width: 100%;
          max-width: 360px;
          filter: drop-shadow(0 20px 36px rgba(0, 0, 0, 0.22));
          animation: ompScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .dark .omp-squircle-wrapper,
        [data-theme="dark"] .omp-squircle-wrapper {
          filter: drop-shadow(0 28px 60px rgba(0, 0, 0, 0.65));
        }

        @keyframes ompScaleIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(6px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        /* Squircle-36 Modal Card using color-muted-100 / color-muted-150 */
        .omp-squircle-card {
          position: relative;
          width: 100%;
          padding: 24px 22px 20px 22px;
          clip-path: var(--clip-path-squircle-36);
          background-color: rgb(var(--color-muted-100, 255 251 248) / 0.98);
          backdrop-filter: blur(28px) saturate(200%);
          -webkit-backdrop-filter: blur(28px) saturate(200%);
          color: rgb(var(--color-foreground-900, 17 24 39));
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          user-select: none;
          box-sizing: border-box;
        }

        .dark .omp-squircle-card,
        [data-theme="dark"] .omp-squircle-card {
          background-color: rgb(var(--color-muted-150, 22 26 36) / 0.95);
          color: rgb(var(--color-muted-900, 251 252 254));
        }

        /* 1px Squircle-36 Stroke Border using color-muted-450 */
        .omp-squircle-stroke-overlay {
          pointer-events: none;
          position: absolute;
          inset: 0;
          clip-path: var(--clip-path-squircle-stroke-36);
          background-color: rgb(var(--color-muted-450, 135 103 78) / 0.20);
        }

        .dark .omp-squircle-stroke-overlay,
        [data-theme="dark"] .omp-squircle-stroke-overlay {
          background-color: rgb(var(--color-muted-450, 82 92 123) / 0.30);
        }

        /* Header: Clean Title + Close */
        .omp-squircle-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .omp-squircle-title {
          margin: 0;
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: rgb(var(--color-foreground-900, 17 24 39));
          font-family: "Ginto", -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .dark .omp-squircle-title,
        [data-theme="dark"] .omp-squircle-title {
          color: rgb(var(--color-muted-900, 251 252 254));
        }

        .omp-squircle-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          border: none;
          background: transparent;
          color: rgb(var(--color-muted-450, 135 103 78) / 0.85);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .dark .omp-squircle-close,
        [data-theme="dark"] .omp-squircle-close {
          color: rgb(var(--color-muted-450, 82 92 123) / 0.90);
        }

        .omp-squircle-close:hover {
          color: rgb(var(--color-foreground-900, 17 24 39));
          background-color: rgb(var(--color-muted-450, 135 103 78) / 0.12);
        }

        .dark .omp-squircle-close:hover,
        [data-theme="dark"] .omp-squircle-close:hover {
          color: rgb(var(--color-muted-900, 251 252 254));
          background-color: rgb(var(--color-muted-450, 82 92 123) / 0.20);
        }

        /* Form Fields */
        .omp-squircle-field {
          margin-bottom: 12px;
        }

        .omp-squircle-label {
          display: block;
          font-size: 11.5px;
          font-weight: 600;
          color: rgb(var(--color-muted-450, 135 103 78));
          margin-bottom: 4px;
        }

        .dark .omp-squircle-label,
        [data-theme="dark"] .omp-squircle-label {
          color: rgb(var(--color-muted-700, 196 205 224));
        }

        .omp-squircle-input-wrapper {
          position: relative;
          width: 100%;
        }

        /* Squircle-16 Input Box with harmonized color-muted background */
        .omp-squircle-input-row {
          position: relative;
          display: flex;
          align-items: center;
          clip-path: var(--clip-path-squircle-16);
          background-color: rgb(var(--color-muted-200, 246 232 221) / 0.30);
          transition: background-color 0.15s ease;
          box-sizing: border-box;
        }

        .dark .omp-squircle-input-row,
        [data-theme="dark"] .omp-squircle-input-row {
          background-color: rgb(var(--color-muted-200, 31 36 49) / 0.50);
        }

        .omp-squircle-input-row:focus-within {
          background-color: rgb(var(--color-muted-200, 246 232 221) / 0.50);
        }

        .dark .omp-squircle-input-row:focus-within,
        [data-theme="dark"] .omp-squircle-input-row:focus-within {
          background-color: rgb(var(--color-muted-200, 31 36 49) / 0.75);
        }

        /* 1px Squircle-16 Stroke Border using color-muted-450 */
        .omp-squircle-input-stroke {
          pointer-events: none;
          position: absolute;
          inset: 0;
          clip-path: var(--clip-path-squircle-stroke-16);
          background-color: rgb(var(--color-muted-450, 135 103 78) / 0.20);
          transition: background-color 0.15s ease;
        }

        .dark .omp-squircle-input-stroke,
        [data-theme="dark"] .omp-squircle-input-stroke {
          background-color: rgb(var(--color-muted-450, 82 92 123) / 0.25);
        }

        .omp-squircle-input-wrapper:focus-within .omp-squircle-input-stroke {
          background-color: rgb(var(--color-muted-450, 135 103 78) / 0.70);
        }

        .dark .omp-squircle-input-wrapper:focus-within .omp-squircle-input-stroke {
          background-color: rgb(var(--color-muted-450, 82 92 123) / 0.75);
        }

        .omp-squircle-input-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          padding-left: 12px;
          padding-right: 8px;
          color: rgb(var(--color-muted-450, 135 103 78) / 0.75);
          pointer-events: none;
          flex-shrink: 0;
        }

        .dark .omp-squircle-input-icon,
        [data-theme="dark"] .omp-squircle-input-icon {
          color: rgb(var(--color-muted-450, 82 92 123) / 0.85);
        }

        .omp-squircle-input {
          width: 100%;
          height: 44px;
          padding: 0 12px 0 0;
          background: transparent;
          border: none;
          font-size: 13.5px;
          color: rgb(var(--color-foreground-900, 17 24 39));
          outline: none !important;
          box-sizing: border-box;
        }

        .dark .omp-squircle-input,
        [data-theme="dark"] .omp-squircle-input {
          color: rgb(var(--color-muted-900, 251 252 254));
        }

        .omp-squircle-input::placeholder {
          color: rgb(var(--color-muted-450, 135 103 78) / 0.60);
        }

        .dark .omp-squircle-input::placeholder,
        [data-theme="dark"] .omp-squircle-input::placeholder {
          color: rgb(var(--color-muted-450, 82 92 123) / 0.65);
        }

        .omp-squircle-toggle-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border: none;
          background: transparent;
          color: rgb(var(--color-muted-450, 135 103 78) / 0.75);
          cursor: pointer;
          border-radius: 6px;
          transition: color 0.15s ease;
          z-index: 10;
        }

        .dark .omp-squircle-toggle-btn,
        [data-theme="dark"] .omp-squircle-toggle-btn {
          color: rgb(var(--color-muted-450, 82 92 123) / 0.85);
        }

        .omp-squircle-toggle-btn:hover {
          color: rgb(var(--color-foreground-900, 17 24 39));
        }

        .dark .omp-squircle-toggle-btn:hover,
        [data-theme="dark"] .omp-squircle-toggle-btn:hover {
          color: rgb(var(--color-muted-900, 251 252 254));
        }

        .omp-squircle-error {
          margin-bottom: 12px;
          padding: 8px 12px;
          border-radius: 12px;
          background-color: rgba(239, 68, 68, 0.10);
          color: #dc2626;
          font-size: 11.5px;
          font-weight: 500;
        }

        .dark .omp-squircle-error,
        [data-theme="dark"] .omp-squircle-error {
          background-color: rgba(239, 68, 68, 0.15);
          color: #f87171;
        }

        /* Primary Action Button using color-muted-450 (and color-muted-550 on hover) */
        .omp-squircle-btn-wrap {
          position: relative;
          width: 100%;
          margin-top: 18px;
        }

        .omp-squircle-submit-btn {
          width: 100%;
          height: 44px;
          clip-path: var(--clip-path-squircle-16);
          background-color: var(--omp-primary);
          color: var(--omp-on-primary);
          border: none;
          font-size: 13.5px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
          transition: background-color 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
        }

        .dark .omp-squircle-submit-btn,
        [data-theme="dark"] .omp-squircle-submit-btn {
          background-color: var(--omp-primary);
          color: var(--omp-on-primary);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.28);
        }

        .omp-squircle-submit-btn:hover:not(:disabled) {
          background-color: var(--omp-primary-hover);
          transform: translateY(-1px);
        }

        .dark .omp-squircle-submit-btn:hover:not(:disabled),
        [data-theme="dark"] .omp-squircle-submit-btn:hover:not(:disabled) {
          background-color: var(--omp-primary-hover);
          transform: translateY(-1px);
        }

        .omp-squircle-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .omp-squircle-submit-btn.omp-status-success {
          background-color: oklch(62% 0.17 145) !important;
          color: #ffffff !important;
        }

        .omp-squircle-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .omp-squircle-spinner {
          width: 15px;
          height: 15px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 9999px;
          animation: ompSpin 0.7s linear infinite;
        }

        @keyframes ompSpin {
          to { transform: rotate(360deg); }
        }
      </style>

      <!-- Backdrop -->
      <div
        class="omp-squircle-backdrop"
        @click=${() => this.handleClose()}
      >
        <!-- Squircle-36 Modal Wrapper with Curved Drop Shadow -->
        <div
          class="omp-squircle-wrapper"
          @click=${(e: Event) => e.stopPropagation()}
        >
          <!-- Squircle-36 Card -->
          <div class="omp-squircle-card">
            <!-- Header: Title + Close -->
            <div class="omp-squircle-header">
              <h2 class="omp-squircle-title">${this.setupRequired ? "Primeiro Acesso" : this.tokenMode ? "Token de Acesso" : "Entrar"}</h2>
              <button
                type="button"
                aria-label="Fechar"
                class="omp-squircle-close"
                @click=${() => this.handleClose()}
              >
                ${renderCloseIcon("size-4")}
              </button>
            </div>

            <!-- Form -->
            <form @submit=${this.handleSubmit}>
              ${this.tokenMode ? html`
                <!-- Direct Token Input -->
                <div class="omp-squircle-field">
                  <label for="login-token-input" class="omp-squircle-label">
                    Token de Acesso
                  </label>
                  <div class="omp-squircle-input-wrapper">
                    <div class="omp-squircle-input-row">
                      <div class="omp-squircle-input-icon">
                        ${renderLockIcon("size-4")}
                      </div>
                      <input
                        id="login-token-input"
                        type="password"
                        placeholder="Token de 64 caracteres"
                        .value=${this.token}
                        @input=${(e: Event) => (this.token = (e.target as HTMLInputElement).value)}
                        class="omp-squircle-input"
                      />
                    </div>
                    <div class="omp-squircle-input-stroke"></div>
                  </div>
                </div>
              ` : html`
                <!-- Username (Squircle-16) -->
                <div class="omp-squircle-field">
                  <label for="login-username-input" class="omp-squircle-label">
                    Seu nome
                  </label>
                  <div class="omp-squircle-input-wrapper">
                    <div class="omp-squircle-input-row">
                      <div class="omp-squircle-input-icon">
                        ${renderUserIcon("size-4")}
                      </div>
                      <input
                        id="login-username-input"
                        type="text"
                        autocomplete="username"
                        placeholder="Como quer ser chamado? (ex: João, Ruan)"
                        .value=${this.username}
                        @input=${(e: Event) => (this.username = (e.target as HTMLInputElement).value)}
                        class="omp-squircle-input"
                      />
                    </div>
                    <div class="omp-squircle-input-stroke"></div>
                  </div>
                </div>

                <!-- Password (Squircle-16) -->
                <div class="omp-squircle-field">
                  <label for="login-password-input" class="omp-squircle-label">
                    Senha de acesso
                  </label>
                  <div class="omp-squircle-input-wrapper">
                    <div class="omp-squircle-input-row">
                      <div class="omp-squircle-input-icon">
                        ${renderLockIcon("size-4")}
                      </div>
                      <input
                        id="login-password-input"
                        type=${this.showPassword ? "text" : "password"}
                        autocomplete=${this.setupRequired ? "new-password" : "current-password"}
                        placeholder=${this.setupRequired ? "Mínimo 6 caracteres" : "••••••••"}
                        .value=${this.password}
                        @input=${(e: Event) => (this.password = (e.target as HTMLInputElement).value)}
                        class="omp-squircle-input"
                        style="padding-right: 36px;"
                      />
                      <button
                        type="button"
                        aria-label=${this.showPassword ? "Ocultar senha" : "Ver senha"}
                        class="omp-squircle-toggle-btn"
                        @click=${() => (this.showPassword = !this.showPassword)}
                      >
                        ${this.showPassword ? renderEyeOffIcon("size-4") : renderEyeIcon("size-4")}
                      </button>
                    </div>
                    <div class="omp-squircle-input-stroke"></div>
                  </div>
                </div>

                ${this.setupRequired ? html`
                  <!-- Confirm Password -->
                  <div class="omp-squircle-field">
                    <label for="login-confirm-input" class="omp-squircle-label">
                      Confirme a senha
                    </label>
                    <div class="omp-squircle-input-wrapper">
                      <div class="omp-squircle-input-row">
                        <div class="omp-squircle-input-icon">
                          ${renderLockIcon("size-4")}
                        </div>
                        <input
                          id="login-confirm-input"
                          type="password"
                          autocomplete="new-password"
                          placeholder="Repita a senha"
                          .value=${this.confirmPassword}
                          @input=${(e: Event) => (this.confirmPassword = (e.target as HTMLInputElement).value)}
                          class="omp-squircle-input"
                        />
                      </div>
                      <div class="omp-squircle-input-stroke"></div>
                    </div>
                  </div>


                ` : nothing}
              `}

              <!-- Error -->
              ${this.errorMessage
        ? html`<div class="omp-squircle-error">${this.errorMessage}</div>`
        : nothing
      }

              <!-- Submit Button (Squircle-16) with color-muted-450 -->
              <div class="omp-squircle-btn-wrap">
                <omp-status-button
                  type="submit"
                  class="w-full block"
                  variant="squircle"
                  size="lg"
                  button-class="omp-squircle-submit-btn"
                  .status=${this.isSuccess ? "success" : this.isLoading ? "loading" : "neutral"}
                  .label=${this.isSuccess ? "Conectado" : this.isLoading ? (this.setupRequired ? "Salvando..." : "Entrando...") : (this.setupRequired ? "Criar Administrador" : this.tokenMode ? "Entrar com Token" : "Entrar")}
                  .showIcon=${false}
                  ?disabled=${this.isLoading || this.isSuccess}
                ></omp-status-button>

                ${!this.setupRequired ? html`
                  <div style="text-align: center; margin-top: 10px;">
                    <button
                      type="button"
                      style="background: none; border: none; font-size: 11px; color: var(--omp-muted-450, #8b949e); cursor: pointer; text-decoration: underline;"
                      @click=${() => { this.tokenMode = !this.tokenMode; this.errorMessage = ""; }}
                    >
                      ${this.tokenMode ? "Voltar para Usuário e Senha" : "Ou entrar com Token direto"}
                    </button>
                  </div>
                ` : nothing}
              </div>
            </form>
          </div>

          <!-- Squircle-36 Stroke Overlay using color-muted-450 -->
          <div class="omp-squircle-stroke-overlay"></div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "omp-login-modal": OmpLoginModal;
  }
}
