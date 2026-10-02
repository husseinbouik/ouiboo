# Ouiboo Launch Operations Kit

This folder turns the non-repo launch work into concrete operating documents.

Launch assumptions for Morocco:

- launch payment method: `bank transfer + manual payment proof`
- proof approval owner: `admin finance`
- agency can inspect proof state but cannot finalize proof verification
- `CMI` and `CashPlus` stay hidden until commercial approval, credentials, callback validation, and live test payments are complete
- `Wafacash` is out of launch scope

Use these documents in order:

1. [Payment Rollout Decisions](./PAYMENT_ROLLOUT_DECISIONS.md)
2. [Deployment Start Here](./DEPLOYMENT_START_HERE.md)
3. [Staging Setup Checklist](./STAGING_SETUP_CHECKLIST.md)
4. [Production Release Runbook](./PRODUCTION_RELEASE_RUNBOOK.md)
5. [Rollback And Post-Deploy Checklist](./ROLLBACK_AND_POST_DEPLOY_CHECKLIST.md)
6. [Banking And Settlement Checklist](./BANKING_AND_SETTLEMENT_CHECKLIST.md)
7. [Admin Finance Playbook](./ADMIN_FINANCE_PLAYBOOK.md)
8. [Support Macros And Escalation Matrix](./SUPPORT_MACROS_AND_ESCALATION.md)
9. [Environment Validation And Dress Rehearsal](./ENVIRONMENT_VALIDATION_AND_DRESS_REHEARSAL.md)
10. [Provider Approval Tracker](./PROVIDER_APPROVAL_TRACKER.md)
11. [Launch Day Go No Go](./LAUNCH_DAY_GO_NO_GO.md)

Expected owners:

- founder or ops lead: business banking, policy signoff, provider approvals
- admin finance lead: proof review, refunds, payouts, reconciliation
- support lead: traveler and agency macros, escalations, coverage roster
- technical lead: staging rehearsal, production secrets, callbacks, smoke validation

Definition of launch-ready for this kit:

- a traveler can book, pay by bank transfer, upload proof, and receive a confirmed booking through a human-reviewed workflow
- admin finance can review proofs, process refunds, and resolve payouts without engineering help
- agencies can receive bookings and request payouts with clear operating rules
- no unapproved provider is exposed in production
