# CLIProxyAPI-MC — Task Completion Workflow

## When a task is completed, run these checks:

### 1. Linting
```bash
npm run lint
```
This runs ESLint on all `.ts` and `.tsx` files and **fails on warnings**. Fix any issues before proceeding.

### 2. Type Checking
```bash
npm run type-check
```
Runs `tsc --noEmit` to verify TypeScript types without emitting files. Catches type errors that ESLint may miss.

### 3. Build (for significant changes)
```bash
npm run build
```
Runs `tsc && vite build` to produce the production output. This is the ultimate verification that the app compiles and bundles correctly.

### 4. Manual Testing
**No automated test framework exists.** Testing must be done manually:
- Start the dev server: `npm run dev`
- Connect to a live CLI Proxy API backend instance
- Verify the changed functionality works as expected in the browser

### 5. GitNexus Index (if applicable)
After committing code changes, update the GitNexus index:
```bash
npx gitnexus analyze
```
If the index previously included embeddings, preserve them:
```bash
npx gitnexus analyze --embeddings
```

### 6. Code Formatting
```bash
npm run format
```
Run Prettier to ensure consistent formatting. This should ideally be done before committing.

## Pre-commit Checklist

- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] `npm run build` succeeds (for significant changes)
- [ ] Manual testing confirms functionality
- [ ] `npm run format` applied
- [ ] GitNexus index updated if relevant
- [ ] Commit message follows project conventions