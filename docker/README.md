# PI WEB Docker (beta)

This Docker setup is beta. It is useful for trusted local/server testing and development, but it may still have rough edges and is intentionally documented only here for now.

PI WEB has two Docker modes:

- **Runtime/server mode** builds a local image from npm registry packages and runs split `sessiond` + `web` services. This is for users and servers.
- **Development mode** builds from this checkout and runs the same split shape while letting the web/API/client services autoreload. This is for hacking on PI WEB.

No prebuilt image or registry is required in either mode. The single human-facing Docker entrypoint is `omp-web-docker`: runtime mode is the default, and development mode is explicit with `--dev`.

## Trust model: read this first

The Docker setup is for trusted single-user or trusted-admin environments. It is not a sandbox and it is not suitable for untrusted multi-tenant use.

By design, the runtime containers get deliberate host access so PI WEB agents can work on real host paths:

- `/var/run/docker.sock` is mounted into the containers. The Docker socket is root-equivalent on the Docker host.
- On native Linux Docker Engine, existing `/home`, `/srv`, and `/opt` paths are mounted read/write, `/` is mounted read-only at `/host` for inspection, and `hostexec` can run explicit commands in the Linux host namespaces.
- On Docker Desktop for Mac, existing `/Users`, `/Volumes`, and `/private` paths are mounted read/write. `hostexec` is disabled because Docker Desktop containers run inside a Linux VM and cannot enter native macOS namespaces.

Only install this on machines where the PI WEB user, the selected workspaces, and the browser/API clients are trusted. Review scripts before piping them to `sh` if you do not already trust this repository.

The web port is bound to `127.0.0.1` by default. Do **not** expose PI WEB directly to the public internet. For remote access, use one of:

- an SSH tunnel;
- a VPN/private network address such as Tailscale, NetBird, or WireGuard;
- an authenticated reverse proxy that you operate and trust.

## Runtime install/update

Prerequisites:

- one supported Docker host profile:
  - native Linux Docker Engine using the local `/var/run/docker.sock`; or
  - Docker Desktop for Mac;
- Docker Compose through the `docker compose` plugin or `docker-compose`;
- a user that can talk to the Docker daemon;
- `curl` or `wget` for the one-liner installer.

The installer fails closed on unknown or unsupported Docker setups, such as remote Docker contexts, `DOCKER_HOST` overrides outside the supported local Unix socket, rootless/alternate Linux sockets, Docker Desktop for Linux, Colima, or OrbStack. It prints the detected host OS, Docker context, endpoint, `DOCKER_HOST`, socket source, and Docker OS before exiting, and it does not recreate services.

The Docker bootstrap does not require Bun or Node.js on the host. It only needs a supported Docker/Compose setup plus `curl` or `wget`; Bun and PI WEB are installed inside the local Docker image.

Install with the bootstrap one-liner:

```bash
curl -fsSL https://raw.githubusercontent.com/ProgmRuanSilva/omp-web/main/docker/install.sh | sh
```

The one-liner is idempotent. Each run refreshes Docker assets from the requested Git ref, writes host-specific `.env` values, rebuilds the local image from registry packages with `--pull --no-cache`, and recreates the split services without deleting persistent data. After installation, use the canonical runtime command in the install directory, for example `~/.local/share/omp-web-docker/omp-web-docker update`.

Defaults:

- install directory: `~/.local/share/omp-web-docker` (or `$XDG_DATA_HOME/omp-web-docker`);
- persistent data: `<install-dir>/data`, mounted at `/data`;
- browser URL: <http://127.0.0.1:8504>;
- packages: latest `@ProgmRuanSilva/omp-web` and latest Pi Coding Agent package unless pinned.

Updating recreates the Docker `sessiond` container. Active Pi agent runtimes in this Docker install may stop, so update while sessions are idle. Persisted PI WEB state, Pi config, and session history under the data directory are kept.

Inside the Docker runtime, the Updates panel uses `omp-web-docker` for status, update, and restart commands. Update and restart commands first start a detached helper container with the same Docker/host mounts and generated Compose environment, including the project name, ports/data paths, helper image, and generated UID/GID/Docker group. The helper then runs Docker Compose, so work continues even when `web`, `sessiond`, or the PI WEB terminal that launched the command exits.

### Command matrix

From a production/runtime install directory, run `./omp-web-docker <command>`. From a checkout, run `./docker/omp-web-docker --dev <command>` for development mode. Inside PI WEB Docker containers and in the Updates panel, the command name is `omp-web-docker`; development commands include the explicit `--dev` flag, for example `omp-web-docker --dev status`.

| Command | Runtime/default | Development | Notes |
| --- | --- | --- | --- |
| `install` | one-liner above or `./omp-web-docker install [installer args]` | Not available | Production bootstrap/install only; accepts the installer options below. |
| `start` | `./omp-web-docker start` | `./docker/omp-web-docker --dev start` | Starts the split `web` and `sessiond` stack. |
| `stop` | `./omp-web-docker stop` | `./docker/omp-web-docker --dev stop` | Stops containers without deleting persistent data. |
| `restart` | `./omp-web-docker restart` | `./docker/omp-web-docker --dev restart` | Restarts `web` and `sessiond`. |
| `restart-web` | `./omp-web-docker restart-web` | `./docker/omp-web-docker --dev restart-web` | Restarts only the web/API service. |
| `restart-sessiond` | `./omp-web-docker restart-sessiond` | `./docker/omp-web-docker --dev restart-sessiond` | Restarts the session daemon; active agent runtimes may stop in that Docker stack. |
| `update` | `./omp-web-docker update` | `./docker/omp-web-docker --dev update` | Rebuilds/recreates the stack. Runtime host updates rerun the installer to refresh Docker assets first. |
| `status` | `./omp-web-docker status` | `./docker/omp-web-docker --dev status` | Shows Docker Compose service status. |
| `logs` | `./omp-web-docker logs [web\|sessiond]` | `./docker/omp-web-docker --dev logs [web\|sessiond\|data-init]` | Follows logs; omitting a target follows all services. |
| `shell` | `./omp-web-docker shell [web\|sessiond]` | `./docker/omp-web-docker --dev shell [web\|sessiond]` | Opens Bash in `web` by default. |
| `doctor` | `./omp-web-docker doctor` | `./docker/omp-web-docker --dev doctor` | Prints static Docker command diagnostics and generated asset paths. |
| `cli` | `./omp-web-docker cli <omp-web args...>` | `./docker/omp-web-docker --dev cli <omp-web args...>` | Proxies the existing `omp-web` CLI in the `web` container. |

Do not run `docker compose down -v` unless you intentionally want to remove Compose-managed volumes. The default persistent PI WEB data is a bind mount, but avoiding `-v` keeps the update/stop flow conservative.

### Installer options

The installer accepts flags and equivalent environment variables:

```bash
curl -fsSL https://raw.githubusercontent.com/ProgmRuanSilva/omp-web/main/docker/install.sh \
  | sh -s -- \
      --install-dir ~/.local/share/omp-web-docker \
      --data-dir ~/.local/share/omp-web-docker/data \
      --bind-address 127.0.0.1 \
      --port 8504 \
      --omp-web-version latest \
      --pi-version latest
```

Common environment variables written to `.env`:

| Variable | Purpose |
| --- | --- |
| `OMP_WEB_UID`, `OMP_WEB_GID` | user/group used by the runtime containers and the image's `omp-web` account |
| `DOCKER_GID` | extra group used for Docker socket access |
| `OMP_WEB_DOCKER_DATA_DIR` | persistent data bind mount |
| `OMP_WEB_DOCKER_INSTALL_DIR` | absolute runtime install directory mounted back into the containers for Docker helper commands |
| `OMP_WEB_DOCKER_REF` | Git ref used when `omp-web-docker update` refreshes Docker asset templates |
| `OMP_WEB_DOCKER_HOST_PROFILE`, `HOSTEXEC_MODE` | detected host profile and host-command capability toggle |
| `OMP_WEB_DOCKER_EXTRA_HOST_PATHS` | optional whitespace-separated existing absolute paths to bind-mount read/write at the same path |
| `OMP_WEB_BIND_ADDR`, `OMP_WEB_PORT` | host bind address and port |
| `OMP_WEB_VERSION` | version/range for `@ProgmRuanSilva/omp-web` on npm |
| `PI_VERSION` | version/range for `@earendil-works/pi-coding-agent` on npm |
| `OMP_WEB_OPENSUSE_IMAGE` | openSUSE base image used for the runtime build |
| `OMP_WEB_NODEJS_MAJOR` | Node.js major package to install, defaulting to `22` |
| `OMP_WEB_NODEJS_REPO` | Node.js zypper repository URL, `auto`, or `disabled` |
| `OMP_WEB_EXTRA_ZYPPER_PACKAGES` | extra openSUSE packages installed during the image build |
| `OMP_WEB_IMAGE` | local image tag to build and run |
| `COMPOSE_PROJECT_NAME` | Docker Compose project name used by the runtime and its detached update/restart helpers; defaults to `omp-web` |
| `HOSTEXEC_IMAGE` | helper image used by `hostexec` |

Host-derived IDs and the Docker host profile are refreshed on rerun unless you explicitly override the IDs. User-facing values such as data directory, bind address, port, image names, upload limit, extra host paths, base image, Node.js settings, extra packages, and version pins are preserved from an existing `.env` unless you pass a flag or environment override.

The installer also writes a generated `compose.override.yml` in the install directory. `omp-web-docker` loads the generated `.env` and Compose override explicitly for runtime commands and passes the generated `COMPOSE_PROJECT_NAME` to Docker Compose, so an unrelated ambient Compose project name cannot redirect lifecycle commands. Re-run `omp-web-docker install` or `omp-web-docker update` instead of editing generated files by hand.

### Base image and tooling

The Docker runtime and development images are openSUSE Tumbleweed based by default. They install Node.js 22, npm, `npx`, and Corepack through zypper for native addon builds, and install Bun for package management and running the server. The image's `omp-web` account is created with `OMP_WEB_UID:OMP_WEB_GID` and `/data/home` as its home directory, so shells have a passwd entry instead of showing `I have no name!` while user config stays in the persistent `/data` mount. The image also includes common agent/development tools such as Git/Git LFS, GitHub CLI, OpenSSH, Python with pip/virtualenv and headers, native build tooling, `jq`, `ripgrep`, `fd`, `fzf`, `bat`, ShellCheck, archive tools, network utilities, and the Docker CLI with Compose and Buildx plugins.

Install extra distro packages without writing a hook by setting a whitespace-delimited package list:

```bash
OMP_WEB_EXTRA_ZYPPER_PACKAGES="go rustup kubernetes-client" \
  curl -fsSL https://raw.githubusercontent.com/ProgmRuanSilva/omp-web/main/docker/install.sh | sh
```

You can also pass installer flags such as `--opensuse-image`, `--nodejs-major`, `--nodejs-repo`, and `--extra-zypper-packages`, or edit the generated `.env` and rerun the installer.

### Custom image hooks

The runtime image can be extended without changing PI WEB's Dockerfile. Put local Bash scripts ending in `.sh` under:

```text
~/.local/share/omp-web-docker/custom-image.d/
```

The installer preserves that directory, includes the `*.sh` files in the Docker build context, and runs each script as `root` during the image build in lexical order. Use this for optional tools such as `glab`, `kubectl`, cloud CLIs, or language toolchains that you do not want in the default image.

Example:

```bash
mkdir -p ~/.local/share/omp-web-docker/custom-image.d
cat >~/.local/share/omp-web-docker/custom-image.d/10-extra-tools.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
zypper --gpg-auto-import-keys --non-interactive refresh
zypper --non-interactive install --no-recommends glab kubernetes-client
zypper clean --all
EOF
chmod +x ~/.local/share/omp-web-docker/custom-image.d/10-extra-tools.sh
curl -fsSL https://raw.githubusercontent.com/ProgmRuanSilva/omp-web/main/docker/install.sh | sh
```

Keep credentials out of these scripts. Authenticate tools after the container starts so secrets live in the persistent `/data` mount, for example through `/data/home` and `/data/config`.

For Docker development from this checkout, use the equivalent local directory:

```text
docker/custom-image.d/
```

Files in that development hook directory are ignored by Git except for the placeholder that keeps the directory available to Docker builds.

### Version pinning

Pin package versions when you want repeatable rebuilds:

```bash
curl -fsSL https://raw.githubusercontent.com/ProgmRuanSilva/omp-web/main/docker/install.sh \
  | sh -s -- --omp-web-version 1.202606.4 --pi-version 0.79.1
```

You can also edit `.env` in the install directory:

```dotenv
OMP_WEB_VERSION=1.202606.4
PI_VERSION=0.79.1
```

Then rerun the one-liner to rebuild/recreate with those pins. Use `latest` again when you want the runtime to track the newest releases.

To pin the Docker asset templates themselves, fetch the installer from a specific Git branch, tag, or commit and pass the same ref as the asset source:

```bash
ref=<git-ref>
curl -fsSL "https://raw.githubusercontent.com/ProgmRuanSilva/omp-web/$ref/docker/install.sh" \
  | sh -s -- --asset-ref "$ref"
```

## Localhost binding and remote access

The runtime listens on `0.0.0.0:8504` inside the container but publishes it to `127.0.0.1:8504` on the host by default.

For SSH access from your laptop:

```bash
ssh -L 8504:127.0.0.1:8504 user@server
# open http://127.0.0.1:8504 locally
```

For a trusted VPN/private interface, bind to that private address:

```bash
curl -fsSL https://raw.githubusercontent.com/ProgmRuanSilva/omp-web/main/docker/install.sh \
  | sh -s -- --bind-address 100.x.y.z --port 8504
```

If you use a reverse proxy, keep the container bound to localhost or a private address and put authentication/TLS at the proxy. Avoid `--bind-address 0.0.0.0` unless another trusted layer restricts access.

## `hostexec` examples

`hostexec [--root] <command...>` is the native Linux host command bridge provided by this Docker setup. It is enabled only for the `linux-native-docker` profile and intentionally does not abstract package managers or detect distributions. By default, commands run as the same numeric user/group as the PI WEB container. Use `--root` only for administrative host commands.

On Docker Desktop for Mac, `hostexec` exits with a clear disabled message because the Docker daemon and containers run inside a Linux VM, not in native macOS namespaces. Docker CLI and Docker Compose commands still work through the mounted Docker socket.

Run it from a PI WEB session, a PI WEB terminal, or by execing into the runtime container on native Linux:

```bash
hostexec uname -a
hostexec systemctl status docker
hostexec --root zypper refresh
hostexec --root sh -lc 'zypper refresh && zypper dup -y'
hostexec --root apt-get update
```

From the host shell, for a quick smoke test:

```bash
cd ~/.local/share/omp-web-docker
docker compose exec web hostexec uname -a
```

On native Linux, `hostexec` starts a temporary privileged helper container through the mounted Docker socket, enters the host namespaces with `nsenter`, and runs exactly the command you passed. Treat it like privileged host access even when the final command drops back to the container user.

## Development Docker setup

Use this mode when developing PI WEB from this checkout. It bind-mounts the source tree, keeps dependencies in a Docker volume, stores PI WEB/Pi data in the same host data directory as runtime mode by default, and preserves the split runtime model:

- `sessiond` runs `bun run start:sessiond` as the long-lived owner of Pi agent runtimes;
- `web` runs `bun run dev:web` and `bun run dev:client` so API, plugin, and Vite changes can autoreload without restarting `sessiond`.

From the repository root, use the canonical Docker command so the same fail-closed host profile detection is applied as runtime mode:

```bash
./docker/omp-web-docker --dev start
```

The command creates `.omp-web/docker-compose-dev.local.env` on first run, writes `.omp-web/docker-compose-dev.generated.env` and `.omp-web/docker-compose-dev.host.generated.yml`, then runs Docker Compose with `docker/compose.dev.yml` plus that generated host override. The generated environment includes the host repository root as `OMP_WEB_DOCKER_DEV_REPO_ROOT`, and the generated override mounts that path back into the containers so Docker helper commands can run Compose from the same absolute path. Edit only the `.local.env` file for persistent dev settings; the `.generated.env` and `.host.generated.yml` files are refreshed by the command.

Values used by the command are resolved in this order:

1. `.omp-web/docker-compose-dev.local.env`;
2. previous generated values in `.omp-web/docker-compose-dev.generated.env`, when present;
3. current shell environment, on first generation only;
4. runtime installer env, usually `$HOME/.local/share/omp-web-docker/.env`;
5. built-in defaults.

`COMPOSE_PROJECT_NAME`, `OMP_WEB_UID`, and `OMP_WEB_GID` are the exceptions to runtime-env reuse. Development mode defaults the Compose project to `omp-web-dev` and defaults the container user/group to the current host user, unless you set values in the shell or `.omp-web/docker-compose-dev.local.env`. This keeps development and runtime stacks from accidentally sharing one Docker Compose project and prevents bind-mounted checkout files from being written as root or as a different runtime service user.

If you already ran the runtime installer, dev mode therefore reuses shared defaults such as Docker group, data directory, extra host paths, image build inputs, upload limit, and bind address unless you set a more specific value in the shell or `.local.env`. If an older `.omp-web/docker-compose-dev.env` exists, the first run copies its dev bind/port values into `.local.env` so previous local exposure settings are easy to see and edit.

To expose the dev API and Vite UI beyond localhost persistently, edit `.omp-web/docker-compose-dev.local.env`:

```dotenv
OMP_WEB_DEV_API_BIND_ADDR=0.0.0.0
OMP_WEB_DEV_BIND_ADDR=0.0.0.0
```

For temporary overrides, prefix the command:

```bash
OMP_WEB_DEV_API_BIND_ADDR=0.0.0.0 \
OMP_WEB_DEV_BIND_ADDR=0.0.0.0 \
  ./docker/omp-web-docker --dev start
```

You can run the dev stack in the background with:

```bash
./docker/omp-web-docker --dev start
```

Open the Vite UI at <http://127.0.0.1:8505>. The dev API is published on <http://127.0.0.1:8504>.

Useful development commands:

```bash
./docker/omp-web-docker --dev status
./docker/omp-web-docker --dev logs web
./docker/omp-web-docker --dev logs data-init
./docker/omp-web-docker --dev restart-web
./docker/omp-web-docker --dev restart-sessiond
./docker/omp-web-docker --dev update
./docker/omp-web-docker --dev stop
```

Restart `sessiond` manually after changes that affect `src/server/sessiond.ts`, daemon ownership, or session-daemon-only code paths. Restarting only `web` is enough for ordinary API/client/plugin development reloads. Commands launched from the Updates panel use the same detached `omp-web-docker` helper as runtime mode, so update/restart work continues after the current PI WEB terminal or container exits. In both modes detached helpers load the generated Docker env and run as the generated `OMP_WEB_UID:OMP_WEB_GID` with the generated Docker group; development helpers still refuse UID 0 unless `--allow-root` is explicit.

The dev setup intentionally has the same Docker socket and profile-specific host mounts as the runtime setup. The same trust warnings apply. The command refuses to run development mode as UID 0, or to generate a dev env with `OMP_WEB_UID=0`, unless you pass `--allow-root`; use that override only when root-owned checkout writes are intentional.

On startup, a short `data-init` service creates the shared `/data` subdirectories and gives them to `OMP_WEB_UID:OMP_WEB_GID`. This handles the common Flatcar/Docker case where a missing bind-mount directory is created as root by the Docker daemon. Because the image also builds its `omp-web` account with those IDs, rebuild the image if you change `OMP_WEB_UID` or `OMP_WEB_GID`.

### Sharing runtime and development state

Runtime and dev mode both use `/data` inside the containers. By default they now point at the same host directory:

```text
$HOME/.local/share/omp-web-docker/data
```

Pi session files are therefore shared at:

```text
$HOME/.local/share/omp-web-docker/data/pi-agent/sessions/
```

Set `OMP_WEB_DOCKER_DATA_DIR=/some/path` for both modes if you want that shared data somewhere else.

Use this shared directory to switch between runtime and dev mode, not to run both at the same time. Stop one Compose stack before starting the other so two session daemons do not share the same socket/state directory concurrently.

For sessions to appear under the same workspace in both modes, use the same project path in PI WEB. On Linux, prefer host-mounted paths such as `/home/core/<repo>`, `/srv/<project>`, or `/opt/<project>`. On Mac, prefer paths under `/Users/<you>/...`. The dev container also exposes this checkout as `/workspace` so the PI WEB dev server can run from it, but sessions started against `/workspace` are organized under that different working-directory path and will not line up with runtime sessions for the host-mounted path.

When `package-lock.json` changes, rebuild the dev image and recreate the `node_modules` volume so the bind-mounted checkout sees the new dependency tree:

```bash
./docker/omp-web-docker --dev stop
docker volume rm omp-web-dev_node_modules
./docker/omp-web-docker --dev start
```

## Local checkout validation

For installer validation from a checkout without starting containers:

```bash
OMP_WEB_DOCKER_SKIP_COMPOSE=1 \
OMP_WEB_DOCKER_ASSET_DIR="$PWD/docker" \
OMP_WEB_DOCKER_HOME="$(mktemp -d)" \
sh docker/install.sh
```

For Compose validation after generating host overrides:

```bash
tmp_home=$(mktemp -d)
OMP_WEB_DOCKER_SKIP_COMPOSE=1 \
OMP_WEB_DOCKER_ASSET_DIR="$PWD/docker" \
OMP_WEB_DOCKER_HOME="$tmp_home" \
sh docker/install.sh

docker compose -f "$tmp_home/compose.yml" -f "$tmp_home/compose.override.yml" config
./docker/internal/dev/compose config
docker build --check -f docker/Dockerfile docker
docker build --check -f docker/Dockerfile.dev .
```
