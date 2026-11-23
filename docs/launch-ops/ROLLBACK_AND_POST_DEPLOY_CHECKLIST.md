# Rollback And Post-Deploy Checklist

Use this during and immediately after staging or production deployment.

## 1. When To Roll Back

Roll back immediately if any of these happens after deploy:

- smoke checks fail
- API health fails
- traveler cannot sign up or log in
- booking creation fails
- proof upload fails
- admin cannot review proofs
- wallet or payout views fail
- major email delivery path fails
- migrations break application startup

## 2. Rollback Decision Rules

### App-only rollback

Use app-only rollback when:

- deployment artifact is broken
- migration did not damage schema compatibility
- previous app version is still compatible with the current DB state

### Escalated rollback

Escalate before rollback when:

- migration changed schema incompatibly
- data may have been partially written
- wallet, payout, or booking state looks inconsistent

## 3. Immediate Rollback Steps

1. stop public promotion of the release
2. restore last known-good app deployment in the hosting platform
3. rerun smoke checks against the restored version
4. verify signup, booking, proof upload, and admin review manually
5. document incident and release status

### Worker and environment rollback

Roll API and worker back to the same last-known-good immutable SHA. Do not leave a newer worker consuming jobs against an older API/schema. Restore environment variables from the approved versioned secret-store revision, never from shell history or an ad-hoc local file. Re-run API readiness and the worker heartbeat/Redis probe before resuming scheduled jobs.

### Database migration boundary

Do not automatically run a down migration or restore a database over a live environment. If the applied migration is additive and the previous application remains schema-compatible, prefer application/worker rollback while keeping the schema. If compatibility is uncertain or data was rewritten, stop processing, preserve evidence, and require the database owner and rollback approver to choose a forward fix or isolated backup restore. Migration `20260915133000_add_currency_status_enums_and_indexes` converts status columns and backfills booking currency; its synthetic rehearsal is not permission to reverse it in place.

### Rehearsal evidence required

Record the failed SHA, restored SHA, configuration revision, API/worker health results, smoke result, database decision, start/end time, and approver. Documentation without this execution record is `PARTIAL`, not verified rollback readiness.

## 4. Post-Deploy Validation Checklist

Run these immediately after a successful deployment:

### Public surfaces

- [ ] landing page loads
- [ ] traveler app loads
- [ ] agency app loads
- [ ] admin app loads

### Core auth

- [ ] signup works
- [ ] email verification works
- [ ] login works

### Core booking flow

- [ ] search works
- [ ] trip detail loads
- [ ] booking can be created
- [ ] bank transfer instructions appear correctly
- [ ] proof upload works

### Operator flow

- [ ] admin can see pending proof
- [ ] admin can approve proof
- [ ] booking becomes confirmed
- [ ] agency sees booking
- [ ] agency wallet loads
- [ ] payout request flow loads

### Service dependencies

- [ ] storage upload works
- [ ] storage download works
- [ ] email delivery works
- [ ] health endpoints are green

## 5. Launch-Day Manual Monitoring

During the first hours after launch, watch:

- new bookings count
- proofs waiting for review
- proof review time
- refund requests
- payout requests
- failed uploads

## 6. Incident Log

- Issue time: `________________`
- Environment: `Dev / Staging / Production`
- Symptoms: `________________`
- Rollback needed: `Yes / No`
- Decision owner: `________________`
- Resolution: `________________`
