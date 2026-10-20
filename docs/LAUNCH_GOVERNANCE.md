# Launch governance checklist

This is a draft control checklist, not legal approval or production-readiness evidence.

## Production ownership and access

- Name business and technical owners plus backups for cloud, DNS, GitHub, database, payment, email, storage, observability, support, and secret manager accounts.
- Use company-controlled identities, least-privilege roles, separate staging/production accounts, quarterly access review, and auditable time-bound elevation. Ban shared daily-use accounts.
- Require phishing-resistant MFA for privileged users; record recovery methods and test that no single person can bypass approval.

## Break glass and offboarding

Keep two sealed, monitored emergency identities in the secret manager. Require incident/change ticket, two-person approval where available, short expiry, immediate alerting, session recording, post-use credential rotation, access review, and retrospective.

For offboarding: disable SSO first; revoke sessions, SSH/API keys, PATs, provider seats and recovery codes; transfer ownership; remove groups/on-call; rotate shared or exposed credentials; review recent audit activity; obtain manager/system-owner sign-off.

## Exposed test/admin credential rotation

- Inventory each exposed credential without copying its value; identify environment, privileges, logs, automation, owner, and last use.
- Revoke/rotate test and admin credentials in the authoritative provider/secret manager.
- Re-run repository/history and log scans; purge history only under a repo-owner plan because rotation is the primary containment.
- Update approved consumers, verify old credentials fail and new credentials pass, record timestamp/operators, and monitor anomalous use.

## Providers and incident contacts

Maintain restricted records for provider data-processing terms, subprocessors, regions, retention/deletion, webhook endpoints/signers, payment dispute contacts, security incident contacts, breach-notification commitments, status pages, and escalation paths. Never store credentials in this register.

## Legal/privacy sign-off required from the owner

- Terms of service, including agency/traveler obligations and acceptable use.
- Privacy notice, lawful bases, purposes, sharing/processors, cross-border transfers, rights, retention, and contact details.
- Cookie/analytics consent banner, categories, withdrawal, regional behavior, and cookie inventory.
- Refund/cancellation policy aligned with actual booking/payment behavior and provider rules.
- Data-processing/provider records, incident contacts, and privacy-rights operating procedure.

For each document capture version/hash, jurisdiction/language, product behavior reviewed, approver name/role, approval date, effective date, and next review. Do not mark approved until qualified counsel and the accountable business owner sign.
