import { describe, expect, it } from "bun:test";

if (typeof globalThis.document === "undefined") {
  Reflect.set(globalThis, "document", {
    createTreeWalker: () => ({}),
    createComment: () => ({}),
    getElementById: () => null,
    documentElement: { classList: { add: () => {}, remove: () => {}, toggle: () => {} }, setAttribute: () => {} },
    body: { appendChild: () => {}, removeChild: () => {} },
    createElement: () => ({
      content: {
        querySelectorAll: () => [],
      },
      _html: "",
      set innerHTML(val: string) { this._html = val; },
      get innerHTML(): string { return this._html; },
    }),
  });
}

import "./OmpMarkdown";
import { OmpMarkdown } from "./OmpMarkdown";
import { toSafeMarkdownHtml } from "../formatting/markdown";

class TestableOmpMarkdown extends OmpMarkdown {
  public override createRenderRoot() {
    return super.createRenderRoot();
  }
}

function getAllTemplateText(rendered: unknown): string {
  if (rendered == null) return "";
  if (typeof rendered === "string") return rendered;
  if (typeof rendered === "number" || typeof rendered === "boolean") return String(rendered);
  if (Array.isArray(rendered)) {
    return rendered.map(getAllTemplateText).join(" ");
  }
  if (typeof rendered !== "object") return "";
  let text = "";
  if ("strings" in rendered && Array.isArray(rendered.strings)) {
    text += rendered.strings.join(" ");
  }
  if ("values" in rendered && Array.isArray(rendered.values)) {
    for (const val of rendered.values) {
      text += " " + getAllTemplateText(val);
    }
  }
  return text;
}

describe("OmpMarkdown", () => {
  it("registers custom element 'omp-markdown'", () => {
    expect(customElements.get("omp-markdown")).toBeDefined();
  });

  it("renders with Light DOM for Tailwind and semantic token styling", () => {
    const el = new TestableOmpMarkdown();
    expect(el.createRenderRoot()).toBe(el);
  });

  it("renders template with omp-markdown container class", () => {
    const el = new OmpMarkdown();
    el.text = "Hello OMP Web";
    const rendered = el.render();
    expect(rendered).toBeDefined();
    const str = getAllTemplateText(rendered);
    expect(str).toContain("omp-markdown");
  });

  it("transforms generative UI cards and KPIs into safe HTML", () => {
    const markdown = `<card title="Resumo do Sistema" badge="Online" color="green" subtitle="Métricas principais">
<kpi-grid>
  <kpi label="Status" value="OK" color="#3fb950" sub="normal" />
  <kpi label="Latência" value="12ms" />
</kpi-grid>
</card>`;
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain("ui-card");
    expect(html).toContain("ui-card-title");
    expect(html).toContain("Resumo do Sistema");
    expect(html).toContain("ui-badge");
    expect(html).toContain("ui-badge-green");
    expect(html).toContain("Online");
    expect(html).toContain("ui-kpi-grid");
    expect(html).toContain("ui-kpi-label");
    expect(html).toContain("Status");
    expect(html).toContain("ui-kpi-value");
    expect(html).toContain("OK");
  });

  it("transforms generative UI callouts into safe HTML", () => {
    const markdown = '<callout type="warning">Atenção com a chave de API!</callout>';
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain("ui-callout");
    expect(html).toContain("ui-callout-warning");
    expect(html).toContain("Atenção com a chave de API!");
  });

  it("transforms completed non-interactive checklists with is-done indicators", () => {
    const markdown = `<checklist title="Tarefas Concluídas" interactive="false">
  <item label="Configuração de ambiente" done="true" />
  <item label="Instalação de pacotes" done="true" />
</checklist>`;
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain("ui-options-card");
    expect(html).toContain('data-interactive="false"');
    expect(html).toContain("is-done");
    expect(html).toContain("Configuração de ambiente");
    expect(html).not.toContain("ui-options-submit-btn");
  });

  it("transforms interactive options cards with submit button", () => {
    const markdown = `<options title="Selecione um método">
  <option label="Opção A" description="Descrição da opção A" />
  <option label="Opção B" description="Descrição da opção B" />
</options>`;
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain("ui-options-card");
    expect(html).toContain('data-interactive="true"');
    expect(html).toContain("ui-options-submit-btn");
    expect(html).toContain("Opção A");
    expect(html).toContain("Descrição da opção A");
  });

  it("transforms sql code fence into safe highlighted HTML with language-sql class", () => {
    const markdown = "```sql\nSELECT * FROM mensagens WHERE id < 'msg_98432' ORDER BY id DESC;\n```";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain('class="language-sql"');
    expect(html).toContain("tok-keyword");
    expect(html).toContain("SELECT");
    expect(html).toContain("FROM");
    expect(html).toContain("mensagens");
  });
});
