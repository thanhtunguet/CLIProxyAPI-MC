# CLIProxyAPI-MC — Project Overview

## Purpose

A single-file Web UI (React + TypeScript) for operating and troubleshooting the **CLI Proxy API** via its **Management API** (`/v0/management`). It provides a web interface to manage config, credentials, logs, and usage statistics for the CLI Proxy API backend.

**Main Project**: https://github.com/router-for-me/CLIProxyAPI
**Minimum Required Backend Version**: ≥ 6.8.0 (recommended ≥ 6.8.15)

## What it does (and doesn't)

- **Does**: Talks to CLI Proxy API Management API to read/update config, upload credentials, view logs, inspect usage, manage API keys, AI providers, OAuth flows, quota management, etc.
- **Does NOT**: Act as a proxy or forward traffic. It's the UI only.

## Tech Stack

- **React 19** + **TypeScript 5.9** (strict mode)
- **Vite 7** with `vite-plugin-singlefile` (bundles to single HTML file)
- **Zustand** — state management (store pattern)
- **Axios** — HTTP client
- **react-router-dom v7** — routing (HashRouter)
- **Chart.js** + `react-chartjs-2` — data visualization
- **CodeMirror 6** (`@uiw/react-codemirror` + `@codemirror/lang-yaml`) — YAML editor
- **SCSS Modules** — styling (camelCase localsConvention)
- **i18next** + `react-i18next` — internationalization
- **motion** — animations
- **ESLint 9** + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`
- **Prettier 3** — code formatting

## Project Structure

```
src/
├── components/        # React components
│   ├── common/        # Shared UI components (SplashScreen, PageTransition, Notification, etc.)
│   ├── config/        # Config editor components (VisualConfigEditor, DiffModal, ConfigSection)
│   ├── layout/        # MainLayout
│   ├── modelAlias/    # Model mapping diagram components
│   ├── providers/     # AI provider sections (Gemini, Claude, OpenAI, Vertex, Codex, Ampcode)
│   ├── quota/         # Quota management components
│   ├── ui/            # Reusable UI primitives (Button, Input, Select, Modal, ToggleSwitch, etc.)
│   └── usage/         # Usage charts and stats displays
├── i18n/              # Internationalization
│   └── locales/       # en.json, zh-CN.json, ru.json
├── pages/             # Page-level components
│   └── hooks/         # Custom hooks for pages (log filtering, parsing, trace resolution)
├── router/            # Routing (ProtectedRoute, MainRoutes)
├── services/          # API and storage services
│   ├── api/           # API clients (apiCall, apiKeys, authFiles, config, logs, usage, etc.)
│   └── storage/       # secureStorage
├── stores/            # Zustand stores (auth, config, models, quota, usage, theme, language, notifications, etc.)
├── styles/            # SCSS (variables, themes, reset, mixins, layout, global, components)
├── types/             # TypeScript type definitions
└── utils/             # Utility functions (constants, helpers, format, encryption, download, etc.)
```

## Internationalization

Currently supports three languages:
- English (en) — default
- Simplified Chinese (zh-CN)
- Russian (ru)

Language is auto-detected from browser settings, manually switchable at the bottom of the page.

## Build & Release

- Vite produces a **single HTML** output (`dist/index.html`) with all assets inlined.
- Tagging `vX.Y.Z` triggers `.github/workflows/release.yml` to publish `dist/management.html`.
- Version shown in footer is injected at build time (env `VERSION`, git tag, or `package.json` fallback).
- Build target: `ES2020`

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive layout for mobile and tablet access