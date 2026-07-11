# syntax=docker/dockerfile:1.7

ARG OPENSUSE_IMAGE=opensuse/tumbleweed
ARG DOCKER_CLI_VERSION=29-cli

FROM docker:${DOCKER_CLI_VERSION} AS docker-cli

FROM ${OPENSUSE_IMAGE} AS base

ARG NODEJS_MAJOR=22
ARG NODEJS_REPO=auto
ARG OMP_WEB_EXTRA_ZYPPER_PACKAGES=""
ARG OMP_WEB_UID=1000
ARG OMP_WEB_GID=1000

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
  SHELL=/bin/bash \
  TERM=xterm-256color

COPY internal/image/install-opensuse-base /usr/local/sbin/install-omp-web-opensuse-base
RUN chmod 0755 /usr/local/sbin/install-omp-web-opensuse-base \
  && install-omp-web-opensuse-base

FROM base AS package

ARG OMP_WEB_VERSION=latest
ARG PI_VERSION=latest
ARG CACHE_BUST=local

RUN set -eux; \
  echo "PI WEB Docker build cache bust: ${CACHE_BUST}"; \
  npm install -g --omit=dev --no-audit --no-fund \
    "@ProgmRuanSilva/omp-web@${OMP_WEB_VERSION}" \
    "@earendil-works/pi-coding-agent@${PI_VERSION}"; \
  npm cache clean --force

FROM base AS runtime

ENV NODE_ENV=production \
  NPM_CONFIG_UPDATE_NOTIFIER=false \
  HOME=/data/home \
  XDG_CONFIG_HOME=/data/config \
  OMP_WEB_HOST=0.0.0.0 \
  OMP_WEB_PORT=8504 \
  OMP_WEB_DATA_DIR=/data/omp-web \
  OMP_WEB_SESSIOND_SOCKET=/data/omp-web/sessiond.sock \
  PI_CODING_AGENT_DIR=/data/pi-agent \
  HOSTEXEC_IMAGE=alpine:3.22 \
  SHELL=/bin/bash \
  TERM=xterm-256color

COPY --from=package /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=package /usr/local/bin /usr/local/bin
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker-cli /usr/local/libexec/docker/cli-plugins /usr/local/libexec/docker/cli-plugins
COPY internal/bin/hostexec /usr/local/bin/hostexec
COPY omp-web-docker /usr/local/bin/omp-web-docker
RUN chmod 0755 /usr/local/bin/hostexec /usr/local/bin/omp-web-docker

COPY custom-image.d/ /tmp/omp-web-custom-image.d/
RUN bash -euxo pipefail -c '\
  shopt -s nullglob; \
  for script in /tmp/omp-web-custom-image.d/*.sh; do \
    echo "Running PI WEB custom image hook: ${script}"; \
    bash "${script}"; \
  done; \
  rm -rf /tmp/omp-web-custom-image.d; \
  zypper clean --all; \
  rm -rf /var/cache/zypp/* \
'

WORKDIR /workspace
USER omp-web

EXPOSE 8504

ENTRYPOINT ["tini", "--"]
CMD ["omp-web-server"]
