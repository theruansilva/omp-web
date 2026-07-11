#!/usr/bin/env sh
# shellcheck disable=SC2034

omp_web_docker_host_yaml_quote() {
  value=$1
  escaped=$(printf '%s' "$value" | sed "s/'/''/g")
  printf "'%s'" "$escaped"
}

omp_web_docker_host_socket_path_from_endpoint() {
  endpoint=$1
  case "$endpoint" in
    unix://*) printf '%s\n' "${endpoint#unix://}" ;;
    *) return 1 ;;
  esac
}

omp_web_docker_host_mac_desktop_socket_path() {
  [ -n "${HOME:-}" ] || return 1
  printf '%s/.docker/run/docker.sock\n' "$HOME"
}

omp_web_docker_host_endpoint_is_linux_expected() {
  endpoint=$1
  [ "$endpoint" = unix:///var/run/docker.sock ]
}

omp_web_docker_host_endpoint_is_mac_expected() {
  endpoint=$1
  if ! socket_path=$(omp_web_docker_host_socket_path_from_endpoint "$endpoint" 2>/dev/null); then
    return 1
  fi

  case "$socket_path" in
    /var/run/docker.sock)
      return 0
      ;;
  esac

  if mac_socket_path=$(omp_web_docker_host_mac_desktop_socket_path 2>/dev/null); then
    [ "$socket_path" = "$mac_socket_path" ] && return 0
  fi

  return 1
}

omp_web_docker_host_socket_source_for_endpoint() {
  endpoint=$1
  omp_web_docker_host_socket_path_from_endpoint "$endpoint"
}

omp_web_docker_host_detect_docker_gid() {
  case "${OMP_WEB_DETECTED_DOCKER_HOST_PROFILE:-}" in
    mac-docker-desktop)
      printf '0\n'
      return 0
      ;;
  esac

  socket_path=/var/run/docker.sock
  if [ -n "${OMP_WEB_DETECTED_DOCKER_ENDPOINT:-}" ]; then
    if detected_socket_path=$(omp_web_docker_host_socket_path_from_endpoint "$OMP_WEB_DETECTED_DOCKER_ENDPOINT" 2>/dev/null); then
      socket_path=$detected_socket_path
    fi
  fi

  if [ -S "$socket_path" ]; then
    if gid=$(stat -c '%g' "$socket_path" 2>/dev/null); then
      printf '%s\n' "$gid"
      return 0
    fi
    if gid=$(stat -f '%g' "$socket_path" 2>/dev/null); then
      printf '%s\n' "$gid"
      return 0
    fi
  fi

  if [ -S /var/run/docker.sock ]; then
    if gid=$(stat -c '%g' /var/run/docker.sock 2>/dev/null); then
      printf '%s\n' "$gid"
      return 0
    fi
    if gid=$(stat -f '%g' /var/run/docker.sock 2>/dev/null); then
      printf '%s\n' "$gid"
      return 0
    fi
  fi

  if command -v getent >/dev/null 2>&1; then
    if gid=$(getent group docker | awk -F: 'NR == 1 { print $3 }'); then
      if [ -n "$gid" ]; then
        printf '%s\n' "$gid"
        return 0
      fi
    fi
  fi

  printf '0\n'
}

omp_web_docker_host_detect_profile() {
  OMP_WEB_DETECTED_HOST_OS=$(uname -s 2>/dev/null || printf 'unknown')
  OMP_WEB_DETECTED_DOCKER_CONTEXT=
  OMP_WEB_DETECTED_DOCKER_ENDPOINT=
  OMP_WEB_DETECTED_DOCKER_HOST_ENV=${DOCKER_HOST:-}
  OMP_WEB_DETECTED_DOCKER_EFFECTIVE_ENDPOINT=
  OMP_WEB_DETECTED_DOCKER_SOCKET_SOURCE=
  OMP_WEB_DETECTED_DOCKER_OS=
  OMP_WEB_DETECTED_DOCKER_HOST_PROFILE=
  OMP_WEB_DETECTED_HOSTEXEC_MODE=disabled
  OMP_WEB_DOCKER_HOST_PROFILE_ERROR=

  if ! command -v docker >/dev/null 2>&1; then
    OMP_WEB_DOCKER_HOST_PROFILE_ERROR="docker CLI is required"
    return 1
  fi

  OMP_WEB_DETECTED_DOCKER_CONTEXT=$(docker context show 2>/dev/null || printf 'unknown')
  if [ -n "$OMP_WEB_DETECTED_DOCKER_CONTEXT" ] && [ "$OMP_WEB_DETECTED_DOCKER_CONTEXT" != unknown ]; then
    OMP_WEB_DETECTED_DOCKER_ENDPOINT=$(docker context inspect "$OMP_WEB_DETECTED_DOCKER_CONTEXT" --format '{{if .Endpoints.docker}}{{.Endpoints.docker.Host}}{{end}}' 2>/dev/null || printf '')
  fi

  case "$OMP_WEB_DETECTED_HOST_OS" in
    Linux)
      if [ -n "$OMP_WEB_DETECTED_DOCKER_HOST_ENV" ] && ! omp_web_docker_host_endpoint_is_linux_expected "$OMP_WEB_DETECTED_DOCKER_HOST_ENV"; then
        OMP_WEB_DOCKER_HOST_PROFILE_ERROR="native Linux installs require DOCKER_HOST to be unset or exactly unix:///var/run/docker.sock, not $OMP_WEB_DETECTED_DOCKER_HOST_ENV"
        return 1
      fi

      if [ -n "$OMP_WEB_DETECTED_DOCKER_ENDPOINT" ] && ! omp_web_docker_host_endpoint_is_linux_expected "$OMP_WEB_DETECTED_DOCKER_ENDPOINT"; then
        OMP_WEB_DOCKER_HOST_PROFILE_ERROR="native Linux installs require the local /var/run/docker.sock Docker context, not $OMP_WEB_DETECTED_DOCKER_ENDPOINT"
        return 1
      fi

      OMP_WEB_DETECTED_DOCKER_EFFECTIVE_ENDPOINT=${OMP_WEB_DETECTED_DOCKER_HOST_ENV:-$OMP_WEB_DETECTED_DOCKER_ENDPOINT}
      OMP_WEB_DETECTED_DOCKER_SOCKET_SOURCE=/var/run/docker.sock
      if [ ! -S "$OMP_WEB_DETECTED_DOCKER_SOCKET_SOURCE" ]; then
        OMP_WEB_DOCKER_HOST_PROFILE_ERROR="native Linux installs require a local Docker socket at /var/run/docker.sock"
        return 1
      fi
      ;;
    Darwin)
      if [ -n "$OMP_WEB_DETECTED_DOCKER_ENDPOINT" ] && ! omp_web_docker_host_endpoint_is_mac_expected "$OMP_WEB_DETECTED_DOCKER_ENDPOINT"; then
        OMP_WEB_DOCKER_HOST_PROFILE_ERROR="macOS installs require a Docker Desktop local Unix socket context, not $OMP_WEB_DETECTED_DOCKER_ENDPOINT"
        return 1
      fi

      if [ -n "$OMP_WEB_DETECTED_DOCKER_HOST_ENV" ]; then
        if ! omp_web_docker_host_endpoint_is_mac_expected "$OMP_WEB_DETECTED_DOCKER_HOST_ENV"; then
          OMP_WEB_DOCKER_HOST_PROFILE_ERROR="macOS installs require DOCKER_HOST to be unset or a Docker Desktop local Unix socket, not $OMP_WEB_DETECTED_DOCKER_HOST_ENV"
          return 1
        fi
        OMP_WEB_DETECTED_DOCKER_EFFECTIVE_ENDPOINT=$OMP_WEB_DETECTED_DOCKER_HOST_ENV
      else
        OMP_WEB_DETECTED_DOCKER_EFFECTIVE_ENDPOINT=$OMP_WEB_DETECTED_DOCKER_ENDPOINT
      fi

      if [ -n "$OMP_WEB_DETECTED_DOCKER_EFFECTIVE_ENDPOINT" ]; then
        if ! omp_web_docker_host_endpoint_is_mac_expected "$OMP_WEB_DETECTED_DOCKER_EFFECTIVE_ENDPOINT"; then
          OMP_WEB_DOCKER_HOST_PROFILE_ERROR="macOS installs require a Docker Desktop local Unix socket, not ${OMP_WEB_DETECTED_DOCKER_EFFECTIVE_ENDPOINT:-unknown}"
          return 1
        fi
        OMP_WEB_DETECTED_DOCKER_SOCKET_SOURCE=$(omp_web_docker_host_socket_source_for_endpoint "$OMP_WEB_DETECTED_DOCKER_EFFECTIVE_ENDPOINT") || return 1
      elif mac_socket_path=$(omp_web_docker_host_mac_desktop_socket_path 2>/dev/null) && [ -S "$mac_socket_path" ]; then
        OMP_WEB_DETECTED_DOCKER_SOCKET_SOURCE=$mac_socket_path
      else
        OMP_WEB_DETECTED_DOCKER_SOCKET_SOURCE=/var/run/docker.sock
      fi

      if [ ! -S "$OMP_WEB_DETECTED_DOCKER_SOCKET_SOURCE" ]; then
        OMP_WEB_DOCKER_HOST_PROFILE_ERROR="Docker Desktop socket is not accessible at $OMP_WEB_DETECTED_DOCKER_SOCKET_SOURCE"
        return 1
      fi
      ;;
    *)
      OMP_WEB_DOCKER_HOST_PROFILE_ERROR="unsupported host OS: $OMP_WEB_DETECTED_HOST_OS"
      return 1
      ;;
  esac

  if ! docker info >/dev/null 2>&1; then
    OMP_WEB_DOCKER_HOST_PROFILE_ERROR="docker daemon is not reachable by this user"
    return 1
  fi
  OMP_WEB_DETECTED_DOCKER_OS=$(docker info --format '{{.OperatingSystem}}' 2>/dev/null || printf '')

  case "$OMP_WEB_DETECTED_HOST_OS" in
    Linux)
      case "$OMP_WEB_DETECTED_DOCKER_CONTEXT:$OMP_WEB_DETECTED_DOCKER_OS" in
        *desktop-linux*|*"Docker Desktop"*)
          OMP_WEB_DOCKER_HOST_PROFILE_ERROR="Docker Desktop on Linux is not supported by this installer because it runs containers inside a VM instead of the native Linux host"
          return 1
          ;;
      esac

      OMP_WEB_DETECTED_DOCKER_HOST_PROFILE=linux-native-docker
      OMP_WEB_DETECTED_HOSTEXEC_MODE=nsenter
      ;;
    Darwin)
      case "$OMP_WEB_DETECTED_DOCKER_CONTEXT:$OMP_WEB_DETECTED_DOCKER_OS:$OMP_WEB_DETECTED_DOCKER_EFFECTIVE_ENDPOINT" in
        *desktop-linux*|*"Docker Desktop"*|*"/.docker/run/docker.sock"*)
          OMP_WEB_DETECTED_DOCKER_HOST_PROFILE=mac-docker-desktop
          OMP_WEB_DETECTED_HOSTEXEC_MODE=disabled
          ;;
        *)
          OMP_WEB_DOCKER_HOST_PROFILE_ERROR="macOS installs currently require Docker Desktop; detected context '$OMP_WEB_DETECTED_DOCKER_CONTEXT' endpoint '${OMP_WEB_DETECTED_DOCKER_EFFECTIVE_ENDPOINT:-unknown}'"
          return 1
          ;;
      esac
      ;;
  esac

  return 0
}

omp_web_docker_host_write_volume() {
  source_path=$1
  target_path=$2
  read_only=${3:-false}

  {
    printf '  - type: bind\n'
    printf '    source: %s\n' "$(omp_web_docker_host_yaml_quote "$source_path")"
    printf '    target: %s\n' "$(omp_web_docker_host_yaml_quote "$target_path")"
    if [ "$read_only" = true ]; then
      printf '    read_only: true\n'
    fi
  } >>"$OMP_WEB_DOCKER_HOST_OVERRIDE_TEMP"
}

omp_web_docker_host_write_existing_volume() {
  source_path=$1
  target_path=$2
  read_only=${3:-false}

  if [ -e "$source_path" ]; then
    omp_web_docker_host_write_volume "$source_path" "$target_path" "$read_only"
  fi
}

omp_web_docker_host_write_extra_volumes() {
  extra_paths=$1

  for extra_path in $extra_paths; do
    case "$extra_path" in
      /*) ;;
      *)
        printf '%s\n' "OMP_WEB_DOCKER_EXTRA_HOST_PATHS entries must be absolute paths: $extra_path" >&2
        return 1
        ;;
    esac

    if [ ! -e "$extra_path" ]; then
      printf '%s\n' "OMP_WEB_DOCKER_EXTRA_HOST_PATHS entry does not exist: $extra_path" >&2
      return 1
    fi

    omp_web_docker_host_write_volume "$extra_path" "$extra_path" false
  done
}

omp_web_docker_host_write_compose_override() {
  target_file=$1
  host_profile=$2
  extra_paths=${3:-}
  control_path=${4:-}
  target_dir=$(dirname "$target_file")
  mkdir -p "$target_dir" || return 1
  OMP_WEB_DOCKER_HOST_OVERRIDE_TEMP=$target_file.$$

  case "$host_profile" in
    linux-native-docker) hostexec_mode=nsenter ;;
    mac-docker-desktop) hostexec_mode=disabled ;;
    *)
      printf '%s\n' "unsupported PI WEB Docker host profile: $host_profile" >&2
      return 1
      ;;
  esac

  cat >"$OMP_WEB_DOCKER_HOST_OVERRIDE_TEMP" <<EOF
# Generated by PI WEB Docker host profile detection. Do not edit by hand.
# Re-run the installer or docker/omp-web-docker --dev to refresh this file.

x-omp-web-host-volumes: &omp-web-host-volumes
EOF

  socket_source=${OMP_WEB_DETECTED_DOCKER_SOCKET_SOURCE:-/var/run/docker.sock}
  omp_web_docker_host_write_volume "$socket_source" /var/run/docker.sock false

  case "$host_profile" in
    linux-native-docker)
      omp_web_docker_host_write_existing_volume /home /home false
      omp_web_docker_host_write_existing_volume /srv /srv false
      omp_web_docker_host_write_existing_volume /opt /opt false
      omp_web_docker_host_write_volume / /host true
      ;;
    mac-docker-desktop)
      omp_web_docker_host_write_existing_volume /Users /Users false
      omp_web_docker_host_write_existing_volume /Volumes /Volumes false
      omp_web_docker_host_write_existing_volume /private /private false
      ;;
  esac

  if ! omp_web_docker_host_write_extra_volumes "$extra_paths"; then
    rm -f "$OMP_WEB_DOCKER_HOST_OVERRIDE_TEMP"
    return 1
  fi

  if [ -n "$control_path" ]; then
    if [ ! -e "$control_path" ]; then
      printf '%s\n' "PI WEB Docker control path does not exist: $control_path" >&2
      rm -f "$OMP_WEB_DOCKER_HOST_OVERRIDE_TEMP"
      return 1
    fi
    omp_web_docker_host_write_volume "$control_path" "$control_path" false
  fi

  cat >>"$OMP_WEB_DOCKER_HOST_OVERRIDE_TEMP" <<EOF

services:
  sessiond:
    environment:
      HOSTEXEC_MODE: $hostexec_mode
    volumes: *omp-web-host-volumes

  web:
    environment:
      HOSTEXEC_MODE: $hostexec_mode
    volumes: *omp-web-host-volumes
EOF

  mv "$OMP_WEB_DOCKER_HOST_OVERRIDE_TEMP" "$target_file"
}

omp_web_docker_host_print_detection_failure() {
  printf '%s\n' "PI WEB Docker setup could not determine a supported host profile." >&2
  printf '%s\n' "" >&2
  printf '%s\n' "Detected:" >&2
  printf '  host OS: %s\n' "${OMP_WEB_DETECTED_HOST_OS:-unknown}" >&2
  printf '  docker context: %s\n' "${OMP_WEB_DETECTED_DOCKER_CONTEXT:-unknown}" >&2
  printf '  docker endpoint: %s\n' "${OMP_WEB_DETECTED_DOCKER_ENDPOINT:-unknown}" >&2
  printf '  DOCKER_HOST: %s\n' "${OMP_WEB_DETECTED_DOCKER_HOST_ENV:-unset}" >&2
  printf '  effective endpoint: %s\n' "${OMP_WEB_DETECTED_DOCKER_EFFECTIVE_ENDPOINT:-unknown}" >&2
  printf '  docker socket source: %s\n' "${OMP_WEB_DETECTED_DOCKER_SOCKET_SOURCE:-unknown}" >&2
  printf '  docker OS: %s\n' "${OMP_WEB_DETECTED_DOCKER_OS:-unknown}" >&2
  printf '%s\n' "" >&2
  printf '%s\n' "Supported profiles:" >&2
  printf '%s\n' "  - native Linux Docker Engine using /var/run/docker.sock" >&2
  printf '%s\n' "  - Docker Desktop for Mac" >&2
  if [ -n "${OMP_WEB_DOCKER_HOST_PROFILE_ERROR:-}" ]; then
    printf '%s\n' "" >&2
    printf 'Reason: %s\n' "$OMP_WEB_DOCKER_HOST_PROFILE_ERROR" >&2
  fi
}

omp_web_docker_compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    printf '%s\n' "Docker Compose is required (docker compose plugin or docker-compose)" >&2
    return 1
  fi
}
