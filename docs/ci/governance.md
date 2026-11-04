# CI governance — which checks block, which are advisory (#245)

Verified against `.github/workflows/` and the `staging` branch-protection
rule on 2026-11-04.

## Blocking (required contexts on `staging`)

Branch protection requires these 8 contexts; a failure in any of them
blocks merge. None of them may carry `continue-on-error`:

| Context | Workflow | Job |
| --- | --- | --- |
| `build (20.x)` | `ci.yml` | build |
| `browser-e2e` | `browser-e2e.yml` | browser-e2e |
| `review` | `dependency-review.yml` | review |
| `Secret scanning (Gitleaks)` | `security-scan.yml` | gitleaks |
| `SAST (CodeQL)` | `security-scan.yml` | codeql |
| `SAST (Semgrep)` | `security-scan.yml` | semgrep |
| `CodeQL` | GitHub default code scanning setup | — |
| `smoke` | `production-smoke.yml` | smoke |

The three `security-scan.yml` jobs state `continue-on-error: false`
explicitly in the workflow so the blocking intent survives edits; the
other required jobs simply have no `continue-on-error` at all.
`production-smoke.yml`'s test step does not swallow failures (a red
smoke run fails the job and still files its failure issues via the
`failure()` step).

Also blocking by design, though not branch-protection contexts:
the axe + keyboard accessibility steps inside `lighthouse-a11y.yml`
(a red step fails the job and the PR — see that workflow's header), and
the `Staging Release` gate/migration jobs (they block a staging
*release*, not a merge; see `docs/launch-ops/STAGING_RELEASE_PATH.md`).

## Advisory (explicitly non-blocking — do not promote silently)

| Check | Where | Why advisory |
| --- | --- | --- |
| Lighthouse CI budgets step | `lighthouse-a11y.yml`, `continue-on-error: true` on the step only | Budgets bundle runner-dependent performance timings with accessibility; the a11y gate itself is the blocking axe/keyboard steps in the same job. |
| SonarCloud scan + coverage prep | `sonarcloud.yml` (coverage steps `continue-on-error: true`) | Reporting/trend surface. Enforced coverage lives in the API coverage floor (`docs/ci/coverage.md`), not here; this workflow overrides thresholds to `{}` on purpose for reporting. |
| PR size warning | `pr-hygiene.yml` `size` job | Not a required context; an oversized PR fails that job but does not block merge. It is a prompt to split, not a gate. |
| `lighthouse-a11y`, `SonarCloud Scan` job outcomes as a whole | — | Neither job name is a required context. |

## Rules

- A required check must never gain `continue-on-error: true` (job or
  step level). Reviewers: treat any such diff as a governance change
  requiring explicit justification on the PR.
- An advisory check may only become blocking by (1) removing its
  `continue-on-error`, (2) adding its exact context name to branch
  protection, and (3) updating this document — in the same PR.
- Proof that blocking works: a controlled failing-fixture PR is run
  whenever this governance changes materially (throwaway branch,
  intentional failure in one required check, merge attempt observed
  rejected by branch protection, PR closed unmerged). The latest proof
  is linked from issue #245.
