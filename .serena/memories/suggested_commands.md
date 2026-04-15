# CLIProxyAPI-MC — Suggested Commands

## Development

```bash
# Start Vite dev server (hot reload)
npm run dev

# Build for production (TypeScript check + Vite build → dist/index.html)
npm run build

# Preview the production build locally
npm run preview

# Lint (ESLint on .ts/.tsx files, fails on warnings)
npm run lint

# Format code with Prettier
npm run format

# Type-check without emitting files
npm run type-check
```

## Git

```bash
# Standard workflow
git status
git add <files>
git commit -m "message"
git push

# Check recent commits
git log -n 5
```

## System utilities (Darwin/macOS)

- `ls` — list directory contents
- `cd <path>` — change directory
- `grep` — search text patterns in files
- `find <path> -name <pattern>` — find files by name
- `cat` / `head` / `tail` — read file contents
- `which <cmd>` — locate a command

Note: Darwin's `sed`, `grep`, `find` may differ slightly from GNU versions. Use `gsed`, `ggrep` if GNU coreutils are installed.

## Testing

**No test framework is currently configured.** The project has no `.test.ts` or `.spec.ts` files. Testing is done manually via the UI against a live CLI Proxy API backend instance.

## Version Info

- Git: 2.50.1
- Node: v22.22.0
- npm: 11.8.0
- OS: Darwin (macOS)