# Vulnerability audit — 2026-10-22 (#327)

## Method

- Dependency scan: every package in `package-lock.json` (1,455 unique
  name+version pairs) queried against the OSV vulnerability database
  (GHSA records). `npm audit`'s endpoint is unreachable from the audit
  environment; OSV covers the same advisories.
- Process review: repo security settings, existing gates (CI build + browser
  E2E + smoke, SonarCloud SAST, branch protection with required checks and
  review on master).

## Actions taken during this audit

- **Dependabot alerts were DISABLED for the repository — now enabled**
  (vulnerability alerts + automated security fixes, via API 2026-10-22).
  Vulnerable dependencies will now surface as alerts and security PRs
  instead of waiting for a manual audit.
- SonarCloud "Automatic Analysis" still needs the owner's one click OFF
  (project settings) so CI-based analysis is the single source of truth.

## Findings (dependency vulnerabilities)

| Package | Locked | Severity | Fixed in | Reachability in Ouiboo |
| --- | --- | --- | --- | --- |
| handlebars | 4.7.9 | CRITICAL x2, MODERATE (GHSA-8r5x, GHSA-p8wg, GHSA-xw65) | 4.7.10 | Transitive (tooling chain). The flaws need compiling *untrusted* templates; Ouiboo's email/HTML templates are code-defined literals. Not reachable by users — bump via Dependabot anyway. |
| braces | 3.0.3 | HIGH (GHSA-vfj7, stack-exhaustion DoS) | none published | Transitive (glob matching in build/dev tooling). Inputs are repo files, not user data. Low practical risk. |
| qs | 6.15.3 | MODERATE x2 (GHSA-4mjr, GHSA-x5fp, DoS) | 6.16.0 | Runtime-adjacent (query-string parsing). Crafted query strings can waste CPU per request; platform + throttle limits bound the blast radius. Bump via parent updates. |
| i18next-http-backend | 3.0.6 | LOW (GHSA-xvq9, SSRF via URL validation) | 4.0.2 (major) | Runtime (all frontends). Our loadPath is a fixed relative path — not attacker-controlled. The fix is a major bump: schedule with the i18n work (#336), not as a drive-by. |
| @humanfs/node | 0.16.7 | MODERATE (GHSA-p498, symlink copy) | 0.16.8 | Dev tooling only. |
| sprintf-js | 1.0.3 | MODERATE (GHSA-hp3w, ReDoS) | none published | Transitive (logging chain); format strings are code-defined. Low. |
| follow-redirects | (locked) | — | — | The previously noted advisory does **not** cover the locked version (OSV: no match). Closed by the lockfile. |

## Follow-ups (ranked)

1. Merge the Dependabot security PRs as they arrive (handlebars + qs first).
2. i18next-http-backend 3.x -> 4.x evaluation with the #336 i18n regression suite.
3. Owner: SonarCloud Automatic Analysis OFF (one click).
4. Re-run this scan after each release train; Dependabot now covers the gaps
   between audits.
