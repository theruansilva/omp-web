# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Desenvolvedores & Power-Users**: Engenheiros de software e desenvolvedores que utilizam o Oh My Pi como harness principal para desenvolvimento autônomo, execução de tarefas em background e comandos via linguagem natural.
- **Usuários & Criadores**: Pessoas que buscam automatizar rotinas, gerenciar tarefas e interagir com agentes autônomos sem atrito de configuração técnica em terminais de linha de comando.
- **Exploradores de Ferramentas & Plugins**: Usuários interessados em testar fluxos generativos e extensões experimentais centralizadas na área de Labs.

## Product Purpose
Ser o cockpit web definitivo do Oh My Pi (OMP Web), substituindo a interface legada pela nova experiência moderna e fluida inspirada na arquitetura de chat acrílico — unificando chat conversacional com modos de raciocínio, execução autônoma em segundo plano e laboratório de extensões.

## Positioning
Diferente de interfaces de chat genéricas ou terminais CLI áridos, o OMP Web combina a usabilidade de um assistente moderno de alta fidelidade com o motor real de execução do Oh My Pi:
1. **Cockpit Moderno Unificado**: Interface limpa com design acrílico, cantos squircle e tokens semânticos OKLCH, substituindo a interface legada como a experiência padrão do ecossistema.
2. **Composer com Modos de Raciocínio**: Seleção integrada de modos de raciocínio (Smart, Quick, Think), menção rápida de arquivos (`@`) e execução de comandos (`/`).
3. **Persistência & Daemon Desacoplado**: Conexão com o daemon `sessiond`, mantendo execuções ativas e tarefas em andamento mesmo com aba fechada ou troca de dispositivo.
4. **Laboratório Dedicado (Labs)**: Área isolada para testes e experimentação de recursos generativos e protótipos de plugins sem poluir o fluxo de trabalho principal.

## Operating Context
- Navegadores modernos em desktop e dispositivos móveis (drawer lateral retrátil e layout adaptativo touch-friendly).
- Comunicação bidirecional contínua em tempo real via WebSockets para streaming de tokens, status de ferramentas e interações do agente.
- Ferramenta nativa `ask` integrada ao OmpComposer como padrão para opções, perguntas e escolhas interativas do usuário, acompanhada de componentes de Generative UI (`<checklist>`, `<kpi-grid>`, `<card>`, `<callout>`) para exibição estruturada no feed.

## Capabilities and Constraints
- **Navegação Focada**:
  - `New chat`: Tela inicial com hero greeting dinâmico e composer centralizado.
  - `Tasks`: Acompanhamento e controle de tarefas em execução e jobs em segundo plano.
  - `Library`: Histórico de sessões, workspaces e artefatos gerados.
  - `Labs`: Ambiente para prototipar novos recursos e extensões de IA.
  - *(Seções genéricas de consumo como Shopping, Imagine e Discover externo são expressamente descartadas).*
- **Composer Multifuncional**: Entrada de texto com redimensionamento dinâmico, menus suspensos posicionados, anexo de capturas de tela e arquivos locais.
- **Rebranding Total**: Eliminação de marcas e logotipos de terceiros  em prol da identidade visual oficial "OMP Web".
- **Design Tokens Rígidos**: Aderência estrita a tokens OKLCH (`omp-theme.css`), curvatura concêntrica WWDC25 e classes utilitárias de superfície acrílica (`.omp-surface-*`). Cores hexadecimais brutas são proibidas.

## Brand Commitments
- **Nome Oficial**: OMP Web (Oh My Pi Web).
- **Tom de Voz**: Preciso, elegante, responsivo e descomplicado.
- **Identidade Visual**: Acrílica e contemporânea, suporte nativo a temas Dark/Light de alto contraste, tipografia com ajustes ópticos e proporções concêntricas.

## Evidence on Hand
- Implementação de componentes Lit em `src/client/src/omp/` e template de entrada em `src/client/omp.html`.
- Sistema de design semântico documentado em `src/client/omp-theme.css`, `_rules/omp-color-and-tokens-convention.md` e `_rules/shape-taxonomy-and-concentricity.md`.
- Conexão e sincronização com backend em `src/server/` e daemon `sessiond`.

## Product Principles
1. **Clareza & Foco em Execução**: O usuário interage com um chat limpo e poderoso; distrações cosméticas de consumo não pertencem ao cockpit de desenvolvimento.
2. **Raciocínio Sob Medida**: O modo de modelo (Smart para raciocínio geral, Quick para patches ágeis, Think para planejamento complexo) é acessível diretamente no composer.
3. **Fidelidade Visual Semântica**: Toda elevação, borda e fundo deriva de tokens matematicamente consistentes em OKLCH com acessibilidade visual garantida em qualquer tema.
4. **Laboratório Isolado**: Novas capacidades são validadas no Labs antes de alterar fluxos consolidados do dia a dia.

## Accessibility & Inclusion
- Contraste estrito WCAG AA/AAA nos modos claro e escuro através do pareamento de tokens semânticos (`--omp-surface-*` e `--omp-text-*`).
- Suporte a navegação por teclado, foco visível e gaveta colapsável em telas menores (< 768px).
