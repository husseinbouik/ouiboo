# API coverage floor + ratchet (#643)

## The gate

`.github/workflows/api-coverage.yml` runs the `apps/api` unit suite with
coverage on every PR to `staging` (and `master`). Two enforcers, both
measured from the same baseline:

- **Global floor** — jest itself, via `apps/api/package.json` →
  `jest.coverageThreshold.global`; jest exits non-zero below it.
- **Per-module floors** — `apps/api/coverage-floors.json`, enforced by
  `scripts/check-api-coverage-floors.mjs` from the jest json-summary
  report. (Jest's glob thresholds apply per *file*, not per directory —
  verified locally: a `**/payments/**` threshold failed individual
  low-coverage files inside a module whose aggregate passes. So module
  floors are aggregated by the script instead.)

The job's context name
is **`API coverage floor`** — it is named so it can be added to branch
protection as-is. There is no `continue-on-error` in that workflow.

(SonarCloud's coverage is reporting-only and stays advisory: its
workflow overrides the thresholds to `{}` on purpose. See
`docs/ci/governance.md`.)

## Measured baseline — 2026-11-04, staging @ 92627fa

`npx jest --coverage --runInBand` in `apps/api`: **111/111 suites,
1209/1209 tests passing.**

| Scope | Lines | Statements | Branches | Functions |
| --- | --- | --- | --- | --- |
| Global | 68.66% | 67.88% | 63.62% | 63.77% |
| payments | 48.25% | 48.33% | 42.54% | 50.75% |
| bookings | 80.23% | 79.49% | 75.03% | 66.67% |
| auth | 71.16% | 71.12% | 58.21% | 80.00% |
| messages | 71.35% | 70.50% | 60.20% | 53.57% |

There is no `tenants` module in `apps/api` — tenancy isolation lives in
`database/` (93.07% lines) and `agency/` (83.78% lines), both above the
global floor, so no separate per-module floor was set for them.

## Floors in force (floor of the measured values)

| Scope | Lines | Statements | Branches | Functions |
| --- | --- | --- | --- | --- |
| Global | 68 | 67 | 63 | 63 |
| payments | 48 | 48 | 42 | 50 |
| bookings | 80 | 79 | 75 | 66 |
| auth | 71 | 71 | 58 | 80 |
| messages | 71 | 70 | 60 | 53 |

These replace the older, never-enforced global placeholder
(50 branches / 60 elsewhere) that no CI job actually applied.

## Local proof the gate bites (2026-11-04)

- Final configuration: `npx jest --coverage --runInBand` → **exit 0**
  (111/111 suites, 1209/1209 tests; global + floors satisfied), and
  `node scripts/check-api-coverage-floors.mjs` against that report →
  **exit 0**, all 16 module/metric pairs OK.
- Scratch run with the global floor temporarily raised to 99%:
  jest → **exit 1** with `Coverage for lines (68.64%) does not meet
  "global" threshold (99%)` (and the same for statements/branches/
  functions). The suite itself still passed — the failure is the gate.
- Scratch run of the floors script with `payments.lines` temporarily
  raised to 90 in a copy of the floors file: **exit 1**,
  `payments lines 48.25% vs floor 90% — BELOW FLOOR`.

## Ratchet rule

- **The floor may only move up.** Lowering any number in
  `jest.coverageThreshold` or `apps/api/coverage-floors.json` is a
  governance regression — reviewers must reject it without an explicit,
  issue-backed exception.
- Raising the floor is a deliberate PR: re-measure with the command
  above, set the new floor at or below the newly measured values
  (rounded down), and update this document's tables in the same PR.
- New critical modules (money, tenancy, auth, messaging) get their own
  per-module floor when they appear, set from their first measurement.
- The long-term direction is up (the ECC "test it" pattern that prompted
  #643 targets 80%); there is no big-bang jump — each raise must be
  earned by tests that already pass at the new floor.
