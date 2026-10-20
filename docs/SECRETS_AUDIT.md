# Secrets audit report

**Run date:** 2026-10-20  
**Tool:** gitleaks 8.30.1 with 100% redaction

## Results

- Working-tree scan: 4 findings, all manually classified as documented non-secret placeholders: one CI-only JWT placeholder in `.github/workflows/ci.yml` and three placeholder authorization examples in `docs/READY_FOR_TESTING.md`.
- Reachable `staging` history scan: 48 commits and approximately 6.59 MB scanned; the same 4 placeholder findings appeared in commits `93b7924e597c4fe135e2a18186826df90ec855ba` and `aa100a19a8abe6ce73756c9a027943d0319841b0`. No confirmed live credential was identified in the reachable scan.
- The scan emitted a Git subprocess error after the reachable commits because this checkout contains a broken `refs/codex/snapshots/...` ref and a separate malformed `master` ref. Therefore this is not evidence that every repository ref/history object is clean.
- `PRE_LAUNCH_AUDIT.md` records an earlier credential leak at abbreviated commit `6e8efb4`. That object is not present in this checkout and could not be independently rescanned. Treat the referenced credential as exposed until the repo owner confirms rotation and performs a clean mirror scan over every remote ref.

No matched values are retained in this report. Temporary scanner reports were generated with full redaction.

## Required owner follow-up

1. Repair or remove broken remote refs in a disposable mirror, without rewriting the shared repository during diagnosis.
2. Run `gitleaks git --redact=100` over a fresh `--mirror` clone containing every branch and tag.
3. Rotate/revoke the credential documented by the prior audit regardless of history-purge outcome; verify the old credential fails.
4. Review any additional finding by rule, file, line, and commit without copying values into tickets.
5. Plan history cleanup with repository owners and downstream clone coordination, then rescan the rewritten mirror before force-updating protected refs.
