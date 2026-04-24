# Project Audit and Experiment Guide

This document maps the main subsystems in Antigravity Manager and identifies the safest areas for experimentation.

## 1. Executive Summary

Antigravity Manager is a desktop Electron application with three tightly connected layers:

- **Renderer application**: React 19 UI for account management, proxy settings, and app configuration.
- **Electron orchestration layer**: startup lifecycle, IPC wiring, tray behavior, local config, local database, and OAuth helpers.
- **Local proxy server**: NestJS service that exposes OpenAI-compatible, Anthropic-compatible, and Gemini-compatible endpoints backed by local account state.

The main implementation risk is not in the UI itself. It is in the interaction between local config, account/token state, and proxy request routing.

## 2. Architecture Map

### 2.1 App startup

`src/main.ts` is the main bootstrap path. It is responsible for:

- initializing the cloud account repository
- initializing the local database
- loading persisted config
- starting the oRPC bridge
- creating the Electron window
- starting the OAuth helper server
- auto-starting the NestJS proxy when enabled
- starting cloud monitoring and tray integration

This file is the best place to understand global application lifecycle and side effects.

### 2.2 Renderer application

`src/App.tsx` bootstraps:

- i18n
- theme sync
- TanStack Query
- TanStack Router
- toast notifications

The main user-facing routes are:

- `src/routes/index.tsx`: cloud account management home page
- `src/routes/proxy.tsx`: local proxy control, key management, model mapping, and usage examples
- `src/routes/settings.tsx`: app settings, notifications, theme, language, and upstream proxy config

`src/routes/__root.tsx` wraps the app in `MainLayout`, so layout-level experiments should start there.

### 2.3 IPC and local services

`src/ipc/manager.ts` creates the oRPC client over a `MessageChannel`. The renderer uses this client to call main-process handlers through the shared router.

This layer is the bridge between UI actions and local system behavior such as:

- config loading and saving
- database access
- gateway start and stop operations
- cloud account operations
- system-level helpers

### 2.4 Local proxy server

`src/server/main.ts` bootstraps the NestJS server and exposes status helpers used by the Electron process.

The core HTTP proxy surfaces are:

- `src/server/modules/proxy/proxy.controller.ts`
- `src/server/modules/proxy/gemini.controller.ts`

These controllers normalize multiple API shapes:

- OpenAI-style `/v1/chat/completions`, `/v1/completions`, `/v1/responses`
- Anthropic-style `/v1/messages`
- Gemini-style `/v1beta/models/...`

This is the most behaviorally sensitive part of the codebase because it handles protocol translation, streaming, model listing, and error mapping.

## 3. Data and Configuration Surfaces

### 3.1 App config

`src/types/config.ts` defines the typed config schema and defaults for:

- application language and theme
- refresh and sync behavior
- startup behavior
- notification preferences
- model visibility
- proxy configuration
- parity and backend rollout flags

`src/ipc/config/manager.ts` persists config to `gui_config.json` in the app data directory and merges saved values with defaults on load.

### 3.2 Account and quota state

The account system is backed by local storage and IPC/database handlers. This state drives:

- active account selection
- quota refresh and monitoring
- auto-switch behavior
- local proxy routing

Any experiment that changes account state handling should be treated as backend work, even if the trigger starts in the UI.

## 4. Safe Experiment Zones

### 4.1 Lowest-risk changes

These are good first experiments:

- new UI panels or visual refinements in existing routes
- improved loading, empty, and error states
- additional read-only diagnostics in the settings or proxy page
- config-driven renderer features that do not change proxy semantics

These usually stay within renderer components, hooks, and existing IPC reads.

### 4.2 Medium-risk changes

These are reasonable once the project shape is familiar:

- new persisted settings in `AppConfig`
- new IPC queries or status surfaces
- non-invasive proxy observability, such as extra status reporting

These require coordinated changes across types, IPC handlers, and UI state.

### 4.3 High-risk changes

These should be isolated and tested carefully:

- token/account switching logic
- proxy scheduling and fallback behavior
- model translation or routing behavior
- streaming response transformations
- authentication and API key guard behavior

These areas are more likely to cause silent regressions because multiple external client protocols are supported.

## 5. Test Coverage Shape

The repo already includes a meaningful test base under `src/tests`:

- unit tests for utilities and config-adjacent logic
- integration-style tests around proxy controllers and Gemini behavior
- e2e coverage via Playwright

Recommended validation by change type:

- **UI-only**: `npm run type-check`, then targeted unit coverage if logic changed
- **IPC/config**: `npm run type-check` and related Vitest coverage
- **Proxy behavior**: `npm test` or targeted proxy tests, plus `npm run type-check`

## 6. Recommended Implementation Order For Experiments

Use this order for iterative work:

1. Start with renderer-only changes that read existing data.
2. Add config-backed behavior if persistence is needed.
3. Extend IPC surfaces if the renderer needs new local data.
4. Touch proxy routing only when the experiment explicitly requires protocol or account behavior changes.

This sequence minimizes the chance of breaking the app's most complex flows while still allowing visible progress.
