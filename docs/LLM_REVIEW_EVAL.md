# LLM PR-review layer — evaluation (#329)

_Question: should an LLM reviewer sit on top of the existing SAST/CI gate?_

## What we already have

- SonarCloud SAST + quality gate on every PR (CI-based analysis).
- GitHub required checks: build, browser E2E, smoke; 1 approving review on
  master; Dependabot for dependency risk.
- The review bottleneck today is a single human reviewer — turnaround and
  consistency, not detection breadth.

## Options

| Option | What it adds | Cost shape | Data flow |
| --- | --- | --- | --- |
| CodeRabbit | Inline PR comments, summaries, style/consistency catches | Free tier for small repos; per-seat after | Repo diffs to vendor cloud |
| Greptile | Codebase-aware review (cross-file context) | Per-seat | Repo indexing by vendor |
| GitHub Copilot code review | Native, low-friction suggestions | Per-seat (existing GH billing) | Microsoft/GitHub cloud |
| Custom GitHub Action (Claude API) | Full control of prompts/rules; can encode AGENTS.md conventions | API tokens per PR | Diffs to Anthropic API |
| None (status quo) | — | 0 | — |

## Assessment

- **Value**: an LLM layer catches a different class than SAST — logic slips,
  misleading names, missing edge cases, PR descriptions that don't match the
  diff. On a one-reviewer team that is real value.
- **Risks**: comment noise trains the team to ignore it; the repo is private
  and contains staging test material in history-adjacent docs, so vendor
  data handling matters; per-seat pricing at team-of-one scale is minor but
  non-zero.
- **Custom Action** is the best fit long-term (prompts can encode this repo's
  rules: expand-contract migrations, no secrets in logs, issue-label flow)
  but is a build project, not a toggle.

## Recommendation

1. Trial **CodeRabbit's free tier** on staging PRs for two weeks. Keep the
   existing gates blocking; the LLM layer is advisory only — it must never
   become a required check during the trial.
2. Measure: comments per PR, % acted on, % noise. Decide with data at the
   next release retrospective.
3. If the trial proves value and noise is low, evaluate the custom Claude
   Action to encode repo conventions; if noise is high, drop the idea —
   SonarCloud + human review remains the gate.

_Decision needed from the owner: approve the CodeRabbit trial (vendor
account + repo install). No code change required for the trial._
