# CLIProxyAPI-MC — Style and Conventions

## TypeScript

- **Strict mode** enabled (`strict: true` in tsconfig)
- `noUnusedLocals: true`, `noUnusedParameters: true` — unused vars/locals are errors
- `noFallthroughCasesInSwitch: true`
- Module resolution: `bundler`
- JSX: `react-jsx`
- Target: `ES2020`
- Path alias: `@/*` → `./src/*`

## ESLint

- Extends: `@eslint/js:recommended`, `typescript-eslint:recommended`
- React Hooks rules enforced (`react-hooks/configs.recommended`)
- React Refresh rule: `warn` (allows constant exports)
- `@typescript-eslint/no-explicit-any`: `warn`
- `@typescript-eslint/no-unused-vars`: `warn` with `argsIgnorePattern: '^_'` (prefix unused params with `_`)

## Prettier

- `semi: true`
- `trailingComma: "es5"`
- `singleQuote: true`
- `printWidth: 100`
- `tabWidth: 2`
- `arrowParens: "always"`

## SCSS

- **SCSS Modules** with `localsConvention: 'camelCase'`
- Scoped name pattern: `[name]__[local]___[hash:base64:5]`
- Global variables imported via `additionalData: @use "@/styles/variables.scss" as *;`
- Files: `variables.scss`, `themes.scss`, `reset.scss`, `mixins.scss`, `layout.scss`, `global.scss`, `components.scss`

## React Patterns

- **Functional components** with hooks
- **Zustand stores** for state management (no Redux)
- Components organized as: `components/<feature>/` with barrel `index.ts` exports
- Page-level components in `src/pages/` with route handling in `src/router/`
- CSS Modules: `ComponentName.module.scss` alongside component files
- Custom hooks: `use<Something>` pattern (e.g., `useLogScroller`, `useLogFilters`, `useTraceResolver`)

## Naming Conventions

- **Components**: PascalCase (`DashboardPage`, `ToggleSwitch`)
- **Hooks**: camelCase starting with `use` (`useConfigStore`, `useLogScroller`)
- **Utilities**: camelCase (`formatNumber`, `parseQuota`)
- **Types/Interfaces**: PascalCase (`Config`, `AuthProvider`, `UsageData`)
- **Constants**: UPPER_SNAKE_CASE for true constants, camelCase for module-level constants
- **Files**: camelCase or PascalCase for components (matching export name)

## Code Organization

- Barrel exports via `index.ts` in feature directories
- API service layer in `src/services/api/` (one file per domain: config, logs, usage, etc.)
- Type definitions centralized in `src/types/`
- Shared utilities in `src/utils/`