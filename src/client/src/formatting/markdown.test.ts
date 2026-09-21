import { describe, expect, it } from "bun:test";

if (typeof globalThis.document === "undefined") {
  Reflect.set(globalThis, "document", {
    createTreeWalker: () => ({}),
    createComment: () => ({}),
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
import { toSafeMarkdownHtml } from "./markdown.js";

describe("toSafeMarkdownHtml", () => {
  it("renders valid mermaid code blocks as ASCII diagrams", () => {
    const markdown = "```mermaid\ngraph TD\n  Client --> Server\n```";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain("mermaid-diagram-wrapper");
    expect(html).toContain("ascii-diagram");
    expect(html).toContain("diagram-badge");
    expect(html).toContain("Mermaid Diagram");
    expect(html).toContain("diagram-zoom-button");
    expect(html).toContain("diagram-toggle-button");
    expect(html).toContain("Client");
    expect(html).toContain("Server");
    expect(html).toContain("mermaid-source");
  });

  it("falls back to standard code block when mermaid syntax is invalid", () => {
    const markdown = "```mermaid\ninvalid mermaid graph syntax !!!\n```";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).not.toContain("mermaid-diagram-wrapper");
    expect(html).toContain('<pre><code class="language-mermaid">');
    expect(html).toContain("invalid mermaid graph syntax");
  });

  it("marks code blocks with box-drawing characters as ascii-diagram", () => {
    const markdown = "```\n┌─────────┐\n│ Service │\n└─────────┘\n```";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain('<pre class="ascii-diagram"><code>');
    expect(html).toContain("Service");
  });

  it("marks code blocks with lang ascii as ascii-diagram", () => {
    const markdown = "```ascii\n[A] -> [B]\n```";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain('<pre class="ascii-diagram"><code class="language-ascii">');
  });

  it("leaves standard code blocks without ascii-diagram class", () => {
    const markdown = "```typescript\nconst a = 1;\n```";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).not.toContain("ascii-diagram");
    expect(html).toContain('<pre><code class="language-typescript">');
  });

  it("syntax-highlights supported code blocks with tok classes", () => {
    const markdown = "```javascript\nconst count = 42;\n```";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain('class="tok-keyword"');
    expect(html).toContain("const");
    expect(html).toContain('class="tok-number"');
    expect(html).toContain("42");
  });

  it("renders image with Obsidian-style width syntax ![alt|300](url)", () => {
    const markdown = "![my image|300](/api/preview?path=img.png)";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain('<img src="/api/preview?path=img.png"');
    expect(html).toContain('alt="my image"');
    expect(html).toContain('width="300"');
  });

  it("renders image with Obsidian-style width and height syntax ![alt|300x200](url)", () => {
    const markdown = "![my image|300x200](/api/preview?path=img.png)";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain('width="300"');
    expect(html).toContain('height="200"');
    expect(html).toContain('alt="my image"');
  });

  it("renders image with standalone dimension ![300](url)", () => {
    const markdown = "![300](/api/preview?path=img.png)";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain('width="300"');
    expect(html).toContain('alt=""');
  });

  it("renders video files as video elements with controls", () => {
    const markdown = "![demo video](/api/preview?path=demo.mp4)";
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain('<video class="markdown-video" controls preload="metadata"');
    expect(html).toContain('<source src="/api/preview?path=demo.mp4">');
    expect(html).toContain("demo video");
  });

  it("renders LaTeX math using KaTeX", () => {
    const inlineMath = toSafeMarkdownHtml("Formula: $E = mc^2$");
    expect(inlineMath).toContain("katex");
    expect(inlineMath).toContain("annotation");

    const delimiterMath = toSafeMarkdownHtml("Formula: \\(a^2 + b^2 = c^2\\)");
    expect(delimiterMath).toContain("katex");

    const blockMath = toSafeMarkdownHtml("$$\\int x dx$$");
    expect(blockMath).toContain("katex-display");
  });

  it("renders generative UI card and KPI components", () => {
    const markdown = `
<card title="Mês 1 — Validação" badge="Fase: Tráfego" color="orange" subtitle="1 público · 1 criativo">

<kpi-grid>
  <kpi label="Por dia" value="R$ 15" />
  <kpi label="Total do mês" value="R$ 450" color="#58a6ff" sub="acumulado" />
</kpi-grid>

| Semana | Foco | Total |
|---|---|---|
| Sem 1 | Subir anúncio | R$ 105 |

</card>
`;
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain("ui-card");
    expect(html).toContain("ui-card-title");
    expect(html).toContain("Mês 1 — Validação");
    expect(html).toContain("ui-badge ui-badge-orange");
    expect(html).toContain("Fase: Tráfego");
    expect(html).toContain("ui-card-subtitle");
    expect(html).toContain("ui-kpi-grid");
    expect(html).toContain("ui-kpi");
    expect(html).toContain("Por dia");
    expect(html).toContain("R$ 15");
    expect(html).toContain("Total do mês");
    expect(html).toContain("R$ 450");
    expect(html).toContain("acumulado");
    expect(html).toContain("<table>");
  });

  it("renders generative UI QA cards and callouts", () => {
    const markdown = `
<qa-card>
**Qual o orçamento?**
R$ 500 – R$ 1.000
</qa-card>

<callout type="warning">
Importante: monitorar CTR na primeira semana.
</callout>
`;
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain("ui-qa-card");
    expect(html).toContain("Qual o orçamento?");
    expect(html).toContain("ui-callout ui-callout-warning");
    expect(html).toContain("Importante: monitorar CTR");
  });

  it("renders generative UI checklist and option cards", () => {
    const markdown = `
<checklist title="Quais recursos incluir?" badge="Próximos passos">
  <item label="Autenticação JWT" desc="Tokens seguros stateless" />
  <item label="Suporte a OAuth2" desc="Google e GitHub" />
</checklist>
`;
    const html = toSafeMarkdownHtml(markdown);

    expect(html).toContain("ui-options-card");
    expect(html).toContain('data-mode="multi"');
    expect(html).toContain("Quais recursos incluir?");
    expect(html).toContain("Próximos passos");
    expect(html).toContain("ui-option-item");
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('data-value="Autenticação JWT"');
    expect(html).toContain('data-label="Autenticação JWT"');
    expect(html).toContain("Tokens seguros stateless");
    expect(html).toContain("Suporte a OAuth2");
    expect(html).toContain("✓");
    expect(html).not.toContain("ui-options-apply-btn");
    expect(html).toContain("ui-options-submit-btn");
  });

  it("differentiates single-choice options and multi-choice checklist with overrides", () => {
    const singleMd = `
<options title="Qual arquitetura?">
  <option label="Monólito" desc="Simples" />
  <option label="Microserviços" desc="Escalável" />
</options>
`;
    const singleHtml = toSafeMarkdownHtml(singleMd);
    expect(singleHtml).toContain('data-mode="single"');
    expect(singleHtml).toContain('role="radio"');
    expect(singleHtml).toContain("●");
    expect(singleHtml).toContain("Opções");

    const multiOverrideMd = `
<options multi="true" title="Selecione múltiplos">
  <option label="Opt A" />
  <option label="Opt B" />
</options>
`;
    const multiHtml = toSafeMarkdownHtml(multiOverrideMd);
    expect(multiHtml).toContain('data-mode="multi"');
    expect(multiHtml).toContain('role="checkbox"');
    expect(multiHtml).toContain("✓");

    const singleOverrideChecklist = `
<checklist single="true" title="Escolha um só">
  <item label="Item 1" />
  <item label="Item 2" />
</checklist>
`;
    const singleChecklistHtml = toSafeMarkdownHtml(singleOverrideChecklist);
    expect(singleChecklistHtml).toContain('data-mode="single"');
    expect(singleChecklistHtml).toContain('role="radio"');
    expect(singleChecklistHtml).toContain("●");
  });

  it("renders flexible options with arbitrary attribute order and <option> tags", () => {
    const markdown = `
<options badge="Opções" subtitle="Escolha um" title="Qual arquitetura prefere?">
  <option description="Mais simples" label="Monólito" />
  <opt label="Microserviços" desc="Escalável" />
</options>
`;
    const html = toSafeMarkdownHtml(markdown);
    expect(html).toContain("ui-options-card");
    expect(html).toContain("Qual arquitetura prefere?");
    expect(html).toContain("Escolha um");
    expect(html).toContain("Monólito");
    expect(html).toContain("Mais simples");
    expect(html).toContain("Microserviços");
    expect(html).toContain("Escalável");
  });

  it("renders options with markdown bullet list fallback", () => {
    const markdown = `
<options title="Escolha um método">
- **JWT**: Tokens stateless
- **OAuth2**: Login com provedor externo
</options>
`;
    const html = toSafeMarkdownHtml(markdown);
    expect(html).toContain("ui-options-card");
    expect(html).toContain("Escolha um método");
    expect(html).toContain("JWT");
    expect(html).toContain("Tokens stateless");
    expect(html).toContain("OAuth2");
    expect(html).toContain("Login com provedor externo");
  });

  it("renders non-interactive checklist with done items and no submit button", () => {
    const markdown = `
<checklist title="Tarefas Concluídas" badge="Concluído" color="green" interactive="false">
  <item label="Configurar banco" desc="Postgres rodando" checked="true" />
  <item label="Criar migrações" desc="Tabelas criadas" done="true" />
</checklist>
`;
    const html = toSafeMarkdownHtml(markdown);
    expect(html).toContain('data-interactive="false"');
    expect(html).toContain("ui-options-card");
    expect(html).toContain("Tarefas Concluídas");
    expect(html).toContain("Concluído");
    expect(html).toContain("ui-badge-green");
    expect(html).toContain("is-done");
    expect(html).toContain("selected");
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain(" checked ");
    expect(html).not.toContain("ui-options-submit-btn");
  });

  it("auto-detects non-interactive mode when all checklist items are checked", () => {
    const markdown = `
<checklist title="Status do Deploy">
  <item label="Passo 1" checked="true" />
  <item label="Passo 2" checked="true" />
</checklist>
`;
    const html = toSafeMarkdownHtml(markdown);
    expect(html).toContain('data-interactive="false"');
    expect(html).toContain("is-done");
    expect(html).toContain("selected");
    expect(html).not.toContain("ui-options-submit-btn");
  });

  it("renders interactive checklist with submit button when some items are pending", () => {
    const markdown = `
<checklist title="Sprint Backlog">
  <item label="Tarefa Concluída" checked="true" />
  <item label="Tarefa Pendente" />
</checklist>
`;
    const html = toSafeMarkdownHtml(markdown);
    expect(html).toContain('data-interactive="true"');
    expect(html).toContain("ui-options-submit-btn");
    expect(html).toContain("Tarefa Concluída");
    expect(html).toContain("Tarefa Pendente");
  });

  it("supports markdown bullet checkboxes with [x] in checklist", () => {
    const markdown = `
<checklist title="Progresso">
- [x] **Item 1**: Feito
- [x] **Item 2**: Finalizado
</checklist>
`;
    const html = toSafeMarkdownHtml(markdown);
    expect(html).toContain('data-interactive="false"');
    expect(html).toContain("is-done");
    expect(html).toContain("selected");
    expect(html).toContain("Item 1");
    expect(html).toContain("Feito");
    expect(html).not.toContain("ui-options-submit-btn");
  });
});