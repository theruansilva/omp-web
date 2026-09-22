# Changelog

## v2.4.0

- 🐛 Fix attachment delivery failing with TypeError when saving files to workspace.
- ✨ Add file system category icons and default grid view mode to workspace files panel.
- ✨ Support direct shell command execution (`target: "command"`) in scheduled tasks without LLM overhead.
- ⚡ Add REST API endpoints (`/schedule-prompts`) for scheduled tasks and pre-arm workspace schedulers on `sessiond` startup.
- ✨ Support completed and non-interactive checklist states (`interactive="false"`, `checked="true"`) in Generative UI.
- 💄 Add custom tool-specific SVG icons and toggle state tracking to ToolExecutionView.
- 💄 Enhance thinking blocks with single-line preview summaries and refine message spacing in chat timeline.
- 📝 Document mandatory token authentication, token unlock flow, and private/VPN machine configurations.

## v2.3.2

- 🎛️ Add "Allow private & VPN machines" toggle to the Gateway Server settings UI in General Settings.

## v2.3.1

- ✨ Add `allowPrivateMachines` configuration option to allow adding machines on Tailscale (`100.64.0.0/10`), WireGuard, or private LAN networks.
- 🐛 Fix compatibility with `@oh-my-pi/pi-catalog` 18.2.4 using `PROVIDER_DESCRIPTORS`.

## v2.3.0

- 🔒 Hardened application security model with mandatory authentication tokens and HttpOnly cookies.
- 🔒 Implemented timing-safe token comparison and automatic cookie issuance for authenticated web sessions.
- 🔒 Added standalone responsive unlock screen for unauthenticated browser access.
- 🔒 Enforced strict Host header validation and mitigated SSRF via pre-flight DNS resolution against reserved/private IPs.
- 🛡️ Prevented arbitrary filesystem access by blocking registration of system root directories as project roots.
- 🛡️ Masked environment variables in MCP server configuration endpoints to prevent secret exposure.

## v2.0.0

- 🚀 Complete migration of backend services (`sessiond` and `app`) from Fastify to Hono and native `Bun.serve`.
- ⚡ Removed Fastify, `@fastify/websocket`, and `@fastify/static` in favor of standard WHATWG fetch and `createBunWebSocket`.
- ♻️ Streamlined daemon client, gateway contracts, and replaced `nanoid` with native `crypto.randomUUID()`.
- ♻️ Simplified session controller lifecycle and pruned legacy CodeMirror diff mode.
- 🧹 Purged unused developer skills, `knip`, and unused screenshot capture automation.
- 📐 Adopted standard semantic versioning (`v2.0.0`) moving forward.

## v1.202609.0

- ✨ Add mobile sidebar edge swipe gestures, hide-workspaces setting, and bottom navigation bar.
- ✨ Categorize model selection by provider/source with icons and sticky headers.
- ✨ Redesign input composer with inline model selector, squircles, and dynamic action buttons.
- ✨ Render Mermaid diagrams as ASCII representations and styled code blocks.
- ✨ Add configurable display options for reasoning thoughts, runtime events, tool calls, and status indicators.
- 💄 Redesign conversation thread with borderless assistant prose, user message bubbles, and vertical timeline events.
- 🐛 Support default model role resolution and persistence across session restarts.

## v1.202608.0

- ✨ Add `omp-web update` command to CLI for updating installed packages and restarting services.
- ⚡ Run production services with Bun to avoid Node 25 module type-stripping issues.
- 👷 Configure GitHub Actions workflow to publish package to npm on version tag pushes (`v*`).
- ✨ React frontend UI scaffold with centered chat stream and floating composer.
- 🔔 Web Push notifications service and API routes.
