# Changelog

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
