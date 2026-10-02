# Install investigation notes

## Observations

- `node_modules/caniuse-lite` exists but is empty, and the expected
  `dist/unpacker/agents` path is missing.
- `npm run install:ci` currently fails with `ENOTEMPTY` while renaming the
  `baseline-browser-mapping` directory.
- npm registry access through the proxy responds with `403 Forbidden` for
  `/-/ping`, which blocks registry reachability checks.
- All four Next.js apps fail to boot because `caniuse-lite/dist/unpacker/agents`
  cannot be resolved when loading Next.js.

## Local reproduction

1. Confirm the missing `caniuse-lite` assets:

   ```bash
   node -e "require('caniuse-lite/dist/unpacker/agents')"
   ```

   This fails with `MODULE_NOT_FOUND` because `node_modules/caniuse-lite` is empty.

2. Confirm the registry ping failure behind the proxy:

   ```bash
   npm ping --registry https://registry.npmjs.org/
   ```

   This returns `403 Forbidden` from `/-/ping`.

## Fix plan

- Run a clean, repeatable install that clears partial `node_modules`, uses a
  fresh cache, and prefers online fetches so npm doesn't keep empty packages:

  ```bash
  npm run install:ci
  ```

- The root `.npmrc` now includes retry and online settings to make installs more
  resilient behind the proxy, and it disables audit/fund checks so the install
  focuses on fetching packages.
