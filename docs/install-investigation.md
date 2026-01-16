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

