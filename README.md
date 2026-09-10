# OMP WEB

[![CI](https://github.com/theruansilva/omp-web/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/theruansilva/omp-web/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@progmruansilva/omp-web)](https://www.npmjs.com/package/@progmruansilva/omp-web)
[![Node.js](https://img.shields.io/node/v/@progmruansilva/omp-web)](package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**OMP WEB is a web UI for [Pi Coding Agent](https://github.com/earendil-works/pi/tree/main/packages/coding-agent) that keeps agent sessions running in real workspaces on your machine or server.**

Run agents where your code, tools, credentials, and build caches live. Supervise them from any browser.

Website and docs: <https://omp-web.dev/>

![OMP WEB](docs/assets/omp-web-banner.png)

![OMP WEB desktop screenshot](docs/assets/omp-web-desktop.png)

## Why OMP WEB?

Agentic development works better when the work environment is persistent.

OMP WEB lets you:

- keep Oh My Pi Coding Agent sessions alive after browser disconnects;
- run agents inside real repositories and git worktrees;
- supervise multiple sessions in parallel;
- switch between laptop, phone, tablet, and desktop;
- use a server, workstation, or remote dev box as your agent runtime;
- manage projects, workspaces, files, terminals, sessions, and remote machines from one web UI.

Your browser is the control surface. The work stays where it can keep running.

## Quick start

Requirements:

- Bun 1.1 or newer
- Oh My Pi Coding Agent configured for your user
- git and the development tools your agents need

Install and start OMP WEB as per-user services:

```bash
bun install -g @progmruansilva/omp-web
omp-web install
omp-web doctor
```

Then open:

```text
http://127.0.0.1:8504
```

Useful commands:

```bash
omp-web status
omp-web logs
omp-web restart
omp-web doctor
omp-web version
omp-web uninstall
```

For more install options, including one-line install, Pi package install, WSL/manual usage, and remote access, see the [installation guide](https://omp-web.dev/install).

## Core model

OMP WEB organizes work like this:

```text
Machine     a local or remote OMP WEB runtime endpoint
Project     a folder on that machine
Workspace   a git worktree, or the project folder for non-git projects
Session     a Pi Coding Agent chat running inside a workspace
```

A typical flow:

1. Add a project.
2. Choose a workspace or git worktree.
3. Start a session.
4. Let the agent work.
5. Come back later from any browser.

## Remote-first development

OMP WEB is designed for remote AI-driven development.

Instead of tying agent work to your laptop session, run OMP WEB on a machine that stays available: a server, desktop, cloud VM, home lab machine, or remote dev box.

Use a private network, SSH tunnel, trusted reverse proxy, or federated OMP WEB machine setup when accessing it remotely.

Read more: [Remote-first development](https://omp-web.dev/remote-first)

## Machines and fleets

OMP WEB can register other OMP WEB runtimes as remote machines. One browser-facing OMP WEB instance can proxy projects, files, git state, sessions, terminals, activity, Pi package management, and selected-machine settings from trusted remote machines.

When a remote machine is selected, Settings tabs label their target. Pi packages, OMP WEB plugin enablement, session daemon toggles, external file access, and upload defaults target the selected machine. Gateway/server settings such as host, port, allowed hosts, registered machines/tokens, and keyboard shortcuts stay local to the gateway/browser.

Read more: [Fleet and machines guide](https://omp-web.dev/machines)

## Plugins

OMP WEB supports trusted browser-side OMP WEB plugins that can add actions, workspace panels, and workspace metadata.

Pi packages are managed separately through Pi's package manager or **Settings → Pi packages**. In a federated setup, the Pi packages panel targets the selected machine and labels where installs, updates, or removals will run. Use **Settings → OMP WEB plugins** to enable or disable discovered browser plugins on the selected machine.

After installing, updating, or removing a Pi package, type `/reload` in each idle OMP WEB session on that machine to refresh Pi runtime resources such as extensions, skills, prompt templates, themes, and context/system prompt files. Reload the browser page separately for newly discovered or changed OMP WEB plugins.

Read more: [Plugin API](https://omp-web.dev/plugins)

## Configuration

Global config lives at:

```text
$OMP_WEB_CONFIG
~/.config/omp-web/config.json
```

Project-local OMP WEB config lives at:

```text
<project>/.omp-web/config.json
```

Common configuration includes host/port, path access, uploads, OMP WEB plugin enablement, shortcuts, and session daemon options. In Settings, machine-affecting config targets the selected machine; gateway host/port/allowed-hosts, remote machine registration, tokens, and keyboard shortcuts stay local.

Read more: [Configuration reference](https://omp-web.dev/config)

## Development

Clone the repository and run:

```bash
bun install
bun run dev
```

Open the Vite URL, usually:

```text
http://localhost:8505
```

For the split development setup:

```bash
bun run dev:sessiond
bun run dev:web
bun run dev:client
```

Validate changes with:

```bash
bun run verify
```

## Security model

OMP WEB assumes trusted users, trusted repositories, and trusted server paths.

It is not a sandbox, permission system, or multi-tenant platform. Do not expose it directly to the public internet without a trusted network, firewall, VPN, SSH tunnel, or authenticated reverse proxy.

## Documentation

- [Website](https://omp-web.dev/)
- [Install](https://omp-web.dev/install)
- [Remote-first development](https://omp-web.dev/remote-first)
- [Machines / fleet](https://omp-web.dev/machines)
- [Configuration](https://omp-web.dev/config)
- [Plugins](https://omp-web.dev/plugins)
- [FAQ](https://omp-web.dev/faq)

## License

MIT © 2026 Federico Jaramillo Martinez. See [LICENSE](LICENSE).
