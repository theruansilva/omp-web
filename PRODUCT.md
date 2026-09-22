# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Público Primário Expandido**: Usuários que não são da área de TI ou desenvolvedores iniciantes que precisam de agentes autônomos para automatizar tarefas, criar fluxos de trabalho e resolver problemas sem atrito de configuração técnica.
- **Desenvolvedores & Power-Users**: Desenvolvedores e engenheiros de software que utilizam o Oh My Pi como harness principal para desenvolvimento autônomo, execução de tarefas longas e supervisão em múltiplos dispositivos.
- **Criadores de Plugins & Adaptadores**: Usuários que adaptam a interface e criam extensões/plugins personalizados para seus próprios casos de uso e rotinas diárias.

## Product Purpose
Tornar o ecossistema do Oh My Pi Coding Agent verdadeiramente acessível e amigável para qualquer pessoa (mesmo sem background técnico em TI), permitindo conectar múltiplos provedores e contas de IA via OAuth em poucos cliques, executar agentes autônomos persistentes em segundo plano e estender facilmente a experiência por meio de plugins próprios.

## Positioning
Diferente de IDEs complexas (Cursor, VS Code) ou harnesses restritos a terminais CLI para programadores, o OMP Web é o cockpit de agentes autônomos mais acessível do ecossistema:
1. **Conectividade Multi-Provedor/Multi-Conta via OAuth**: Conexão simples e transparente de múltiplos provedores e contas sem a barreira de configurar variáveis de ambiente complexas ou arquivos de configuração no terminal.
2. **Abstração Gradual (Beginner-Friendly com Profundidade)**: Interface intuitiva e limpa para quem está começando, sem jargões desnecessários na visão principal, mantendo o poder de terminais e git worktrees acessível sob demanda para quem precisa.
3. **Persistência Real**: Daemon desacoplado (`sessiond`) que mantém os agentes trabalhando em segundo plano com segurança, permitindo fechar o navegador ou alternar entre celular e desktop sem interromper o trabalho.
4. **Ecossistema de Plugins Amigável**: Arquitetura que permite a qualquer usuário adaptar e criar plugins para seu próprio fluxo de trabalho.

## Operating Context
- Acesso via navegadores web modernos (desktop, tablets e smartphones com modo PWA).
- Operação em máquinas locais, home labs, servidores remotos ou instâncias em nuvem com o daemon em execução contínua.
- Sessões de interação via linguagem natural assistidas por componentes ricos de Generative UI, cartões de ferramentas compreensíveis e visualização clara de progresso.

## Capabilities and Constraints
- **Multi-Provedor & OAuth**: Gerenciamento e alternância de múltiplas contas e provedores de IA integrados nativamente.
- **Sistema de Plugins Extensível**: Suporte a plugins no cliente e servidor para customização de ações, visualizações e ferramentas.
- **Comunicação em Tempo Real**: Streaming contínuo e bidirecional via WebSockets para chat, ferramentas e terminais.
- **Workspace & Arquivos**: Gerenciamento de diretórios, git worktrees e arquivos do projeto com edição em tempo real.
- **Terminais Integrados**: Terminal xterm.js interativo disponível para inspeção técnica quando necessário.
- **Progressive Disclosure**: A interface deve priorizar simplicidade e clareza visual para iniciantes, revelando detalhes técnicos (logs crus, terminais, diffs de git) de forma progressiva.

## Brand Commitments
- **Nome**: OMP Web (Oh My Pi Web).
- **Tom de Voz**: Convidativo, claro, empoderador e descomplicado. Evitar jargões técnicos excessivos nas interações principais com o usuário.
- **Identidade Visual**: Moderna, ergonômica, suporte nativo a temas (Dark/Light) e alta legibilidade.

## Evidence on Hand
- Código-fonte e documentação em `docs/frontend-features.md`, `README.md` e `package.json`.
- Implementação ativa de WebSockets, Hono backend, Lit components e plugins em `src/`.
- Suporte a comandos do Oh My Pi e arquitetura de sessões daemon em `src/server/sessiond.ts`.

## Product Principles
1. **Simplicidade por Padrão, Poder Sob Demanda**: Qualquer pessoa deve conseguir autenticar suas contas via OAuth e interagir com o agente sem precisar abrir um terminal. O poder técnico existe, mas nunca é imposto como barreira.
2. **Autonomia Sem Ansiedade**: O usuário deve entender claramente o que o agente está fazendo através de cartões visuais limpos e feedback em tempo real, sem logs indecifráveis.
3. **Trabalho Contínuo e Sem Fricção**: A sessão do agente pertence ao ambiente, não à aba do navegador. Fechar a aba ou trocar de aparelho não perde o contexto nem interrompe a execução.
4. **Adaptabilidade Pessoal**: O usuário é dono do seu fluxo e deve conseguir adaptar a ferramenta para suas tarefas do dia a dia através de plugins simples.

## Accessibility & Inclusion
- Interface responsiva adaptada para desktop, tablet e celular (touch-friendly com áreas de toque adequadas).
- Textos claros, suporte a contraste adequado em temas claro e escuro, e semântica web para navegação facilitada.
