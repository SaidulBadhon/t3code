# AGENTS.md

## Task Completion Requirements

- All of `bun fmt`, `bun lint`, and `bun typecheck` must pass before considering tasks completed.
- NEVER run `bun test`. Always use `bun run test` (runs Vitest).

## Project Snapshot

T3 Code is a minimal web GUI for using coding agents like Codex and Claude.

This repository is a VERY EARLY WIP. Proposing sweeping changes that improve long-term maintainability is encouraged.

## Core Priorities

1. Performance first.
2. Reliability first.
3. Keep behavior predictable under load and during failures (session restarts, reconnects, partial streams).

If a tradeoff is required, choose correctness and robustness over short-term convenience.

## Maintainability

Long term maintainability is a core priority. If you add new functionality, first check if there is shared logic that can be extracted to a separate module. Duplicate logic across multiple files is a code smell and should be avoided. Don't be afraid to change existing code. Don't take shortcuts by just adding local logic to solve a problem.

## Package Roles

- `apps/server`: Node.js WebSocket server. Wraps Codex app-server (JSON-RPC over stdio), serves the React web app, and manages provider sessions.
- `apps/web`: React/Vite UI. Owns session UX, conversation/event rendering, and client-side state. Connects to the server via WebSocket.
- `packages/contracts`: Shared effect/Schema schemas and TypeScript contracts for provider events, WebSocket protocol, and model/session types. Keep this package schema-only — no runtime logic.
- `packages/shared`: Shared runtime utilities consumed by both server and web. Uses explicit subpath exports (e.g. `@t3tools/shared/git`) — no barrel index.

## Codex App Server (Important)

T3 Code is currently Codex-first. The server starts `codex app-server` (JSON-RPC over stdio) per provider session, then streams structured events to the browser through WebSocket push messages.

How we use it in this codebase:

- Session startup/resume and turn lifecycle are brokered in `apps/server/src/codexAppServerManager.ts`.
- Provider dispatch and thread event logging are coordinated in `apps/server/src/providerManager.ts`.
- WebSocket server routes NativeApi methods in `apps/server/src/wsServer.ts`.
- Web app consumes orchestration domain events via WebSocket push on channel `orchestration.domainEvent` (provider runtime activity is projected into orchestration events server-side).

Docs:

- Codex App Server docs: https://developers.openai.com/codex/sdk/#app-server

## Reference Repos

- Open-source Codex repo: https://github.com/openai/codex
- Codex-Monitor (Tauri, feature-complete, strong reference implementation): https://github.com/Dimillian/CodexMonitor

Use these as implementation references when designing protocol handling, UX flows, and operational safeguards.

## Cursor Cloud specific instructions

### Runtime prerequisites

- **Node.js 24.13.1** and **Bun 1.3.9** (pinned in `.mise.toml`). The VM update script installs both via nvm and the Bun installer.
- No external databases — persistence is embedded SQLite via `node:sqlite` (experimental warning is expected and harmless).
- No Docker or docker-compose required.

### Running services in dev

- `T3CODE_NO_BROWSER=1 bun dev` starts the full dev stack (contracts watch-build + server on `:3773` + Vite web on `:5733`). The `--no-browser` flag prevents attempting to open a browser.
- The dev runner uses turbo TUI. To run server or web independently: `bun dev:server` / `bun dev:web`.
- Dev data is stored at `~/.t3/dev/` (separate from production `~/.t3/userdata/`).

### Quality gates (see `package.json` scripts)

- `bun lint` — oxlint
- `bun fmt` — oxfmt (use `bun fmt --check` for CI-style check)
- `bun typecheck` — tsc via turbo across all packages
- `bun run test` — Vitest via turbo (NEVER use `bun test` directly)

### Known test flakes

- `apps/server` git integration tests (`GitCore.test.ts`) have 2–3 tests that may fail with timeouts or assertion errors related to remote URL deduplication. These are pre-existing and not caused by environment setup.
