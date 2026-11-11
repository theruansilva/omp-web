# ADR 0001: Native OMP Session Lifecycle and Memory Management

## Status

Accepted

## Date

2026-11-03

## Context

`omp-web` originated as a fork of `pi-web`. In adapting `pi-web` for Oh-My-Pi (`omp`), several custom session management layers were introduced:

1. **Custom Archive Store (`~/.omp-web/archived-sessions/`)**:
   When sessions were archived in `omp-web`, the active `.jsonl` conversation files were copied to `~/.omp-web/archived-sessions/` and unlinked from the native OMP CLI storage directory (`~/.omp/sessions/--cwd--/`).
2. **Aggressive Silent Auto-Archive**:
   A 24-hour idle threshold (`autoArchiveIdleMs = 24 * 60 * 60 * 1000`) ran on a 60-second periodic heartbeat sweep, silently archiving and deleting active CLI session files across all workspaces without user consent.
3. **Data Loss (Discussion #3)**:
   Users reasonably expected `~/.omp-web` to be a disposable web application cache. Deleting `~/.omp-web` resulted in permanent, unrecoverable data loss of OMP CLI session history.
4. **Conflation of RAM Eviction vs. Disk Archiving**:
   There was a misunderstanding that moving/deleting files on disk was necessary to prevent memory leaks. In reality, memory cleanup (server process dormancy and client browser heap management) is completely decoupled from disk file persistence.

## Decision

### 1. Decouple RAM Lifecycle from Disk Storage

- **Server-Side Eviction (Dormancy)**:
  `idleEvictionMs` (default 10 minutes) continues to unload idle in-memory `PiAgentSession` instances, disconnecting listeners and calling `runtime.dispose()`. The session transitions to `dormant: true`, releasing 100% of its server RAM. The underlying `.jsonl` on disk is **never modified or moved**.
- **Client-Side Bounded Memory (LRU)**:
  `ChatTranscriptStore` on the frontend is bounded by an LRU cache (default: 5 sessions). Navigating across dozens of conversations in a single browser tab evicts older in-memory transcript pages from the JavaScript heap while retaining them in browser `sessionStorage` and remote paging APIs.

### 2. Disable Destructive Auto-Archiving by Default

- `autoArchiveIdleMs` defaults to `0` (disabled).
- The server heartbeat sweep (`sweepAutoArchive`) will no longer move or delete inactive CLI sessions behind the user's back.
- Session archiving becomes an explicit, user-initiated action:
  - Through individual or bulk "Archive" actions in the web UI sidebar.
  - Through the manual "Clean Up Sessions" dialog with preview and confirmation.
  - Through the native OMP CLI command (`omp gc --archive`).

### 3. Native OMP CLI Archive Integration (`.jsonl.gz`)

- Archived sessions migrate from `~/.omp-web/archived-sessions/` to the canonical OMP CLI archive path:
  - Directory: `~/.omp/archive/sessions/` (or `<agentDir>/archive/sessions/`).
  - Index: `~/.omp/archive/archived-sessions.json`.
- Files are compressed using gzip (`.jsonl.gz`), matching OMP's `omp gc` specification.
- Companion artifact directories (`~/.omp/sessions/--cwd--/<id>/`) are moved alongside the session file to `~/.omp/archive/sessions/--cwd--/<id>/`.
- Legacy archives in `~/.omp-web/archived-sessions.json` are automatically discovered for backward compatibility.
- `~/.omp-web/` retains only web client configurations and machine definitions, making it completely safe to wipe without risking conversation history.

### 4. Transparent In-Memory Decompression for Archived Inspection

- When inspecting an archived session (`.jsonl.gz`) in the web UI, the server decompresses the file on-the-fly into a temporary view cache.
- The archived `.gz` file remains immutable and untouched.
- If the user sends a new message to an archived session, `ensureWritableOrRestore` decompresses the session back into `~/.omp/sessions/`, making it live for both OMP Web and OMP CLI.

## Consequences

### Positive
- **Zero CLI Data Loss**: CLI session files remain untouched and discoverable in `omp --resume`.
- **Disposable Web Directory**: Deleting `~/.omp-web` never destroys user conversations.
- **Ecosystem Parity**: OMP Web and `omp gc` share the same archive destination and compression format (`.jsonl.gz`).
- **Memory Safety**: RAM is bounded on both server (via dormancy) and client (via LRU) without destructive disk side-effects.

### Trade-offs
- Reading archived sessions requires streaming gunzip decompression on the server.
