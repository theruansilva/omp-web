import { describe, expect, it } from "bun:test";
import "./OmpSettingsView";
import { OmpSettingsView } from "./OmpSettingsView";

describe("OmpSettingsView", () => {
  it("registers custom element and renders settings shell", () => {
    expect(customElements.get("omp-settings-view")).toBeDefined();
    const view = new OmpSettingsView();
    const rendered = view.render();
    expect(rendered).toBeDefined();

    const str = JSON.stringify(rendered);
    expect(str).toContain("Configurações");
    expect(str).toContain("Geral");
    expect(str).toContain("Sessões & Daemon");
    expect(str).toContain("Plugins");
    expect(str).toContain("Pacotes Pi");
    expect(str).toContain("Atalhos");
  });

  it("renders account card with active user and sign-out button when authenticated", () => {
    const view = new OmpSettingsView();
    view.activeSection = "general";
    view.currentUser = "admin";
    const str = JSON.stringify(view.render());
    expect(str).toContain("Conta & Sessão");
    expect(str).toContain("admin");
    expect(str).toContain("Sessão ativa");
    expect(str).toContain("Sair da conta");
  });

  it("renders account card with sign-in button when not authenticated", () => {
    const view = new OmpSettingsView();
    view.activeSection = "general";
    view.currentUser = null;
    const str = JSON.stringify(view.render());
    expect(str).toContain("Conta & Sessão");
    expect(str).toContain("Não conectado");
    expect(str).toContain("Entrar");
  });

  it("renders general section by default with chat preferences and gateway fields", () => {
    const view = new OmpSettingsView();
    view.activeSection = "general";
    const str = JSON.stringify(view.render());
    expect(str).toContain("Aparência & Tema");
    expect(str).toContain("Exibição do Chat");
    expect(str).toContain("Raciocínio do Modelo");
    expect(str).toContain("Execuções de Ferramentas");
    expect(str).toContain("Eventos de Sessão");
    expect(str).toContain("Modo Vim");
    expect(str).toContain("Servidor Gateway");
    expect(str).toContain("Autenticação & Segurança");
  });

  it("renders sessiond section with spawn sessions and uploads config", () => {
    const view = new OmpSettingsView();
    view.activeSection = "sessiond";
    const str = JSON.stringify(view.render());
    expect(str).toContain("Autonomia & Subagentes");
    expect(str).toContain("Spawn Sessions");
    expect(str).toContain("Subsessões Rastreadas (Beta)");
    expect(str).toContain("Uploads & Limites de Arquivo");
    expect(str).toContain("Salvar Configurações de Sessão");
  });

  it("renders plugins section", () => {
    const view = new OmpSettingsView();
    view.activeSection = "plugins";
    const str = JSON.stringify(view.render());
    expect(str).toContain("Plugins do OMP Web");
    expect(str).toContain("Recarregar");
  });

  it("renders packages section with install form", () => {
    const view = new OmpSettingsView();
    view.activeSection = "packages";
    const str = JSON.stringify(view.render());
    expect(str).toContain("Instalar Pacote Pi");
    expect(str).toContain("Pacotes Instalados");
    expect(str).toContain("Atualizar Todos");
  });

  it("renders shortcuts section with keyboard bindings", () => {
    const view = new OmpSettingsView();
    view.activeSection = "shortcuts";
    const str = JSON.stringify(view.render());
    expect(str).toContain("Atalhos de Teclado");
    expect(str).toContain("Shift + Enter");
    expect(str).toContain("Ctrl + B / Cmd + B");
    expect(str).toContain("/btw <pergunta>");
  });

  it("updates activeSection when handleSectionSelect is called", () => {
    const view = new OmpSettingsView();
    (view as unknown as { handleSectionSelect: (s: string) => void }).handleSectionSelect("shortcuts");
    expect(view.activeSection).toBe("shortcuts");

    (view as unknown as { handleSectionSelect: (s: string) => void }).handleSectionSelect("sessiond");
    expect(view.activeSection).toBe("sessiond");
  });

  it("renders notification banner when notification state is active", () => {
    const view = new OmpSettingsView();
    (view as unknown as { notification: { type: string; message: string } }).notification = { type: "success", message: "Configuração gravada" };
    const str = JSON.stringify(view.render());
    expect(str).toContain("Configuração gravada");
  });
});
