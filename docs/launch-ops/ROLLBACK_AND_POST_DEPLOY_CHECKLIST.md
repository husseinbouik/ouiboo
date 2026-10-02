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
