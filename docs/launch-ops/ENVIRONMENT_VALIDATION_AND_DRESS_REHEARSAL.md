# Environment Validation And Dress Rehearsal

This is the non-repo validation checklist for staging and production readiness.

## Secrets And Service Setup

Verify both staging and production have:

- [ ] database connection configured
- [ ] email provider configured
- [ ] storage configured
- [ ] frontend app URLs configured
- [ ] API base URL configured
- [ ] webhook and callback base URLs configured

Record locations:

- Staging secret store: `________________`
- Production secret store: `________________`

## Staging Dress Rehearsal Script

Run this in staging with real team members, not mocks.

### Traveler flow

- [ ] sign up
- [ ] receive and complete email verification
- [ ] search for a trip
- [ ] open trip details
- [ ] create a booking
- [ ] confirm bank transfer instructions are shown correctly
- [ ] upload payment proof

### Admin finance flow

- [ ] open pending payment proof
- [ ] inspect uploaded proof
- [ ] approve proof
- [ ] confirm booking state changes to confirmed

### Agency flow

- [ ] agency sees the confirmed booking
- [ ] agency sees wallet state update
- [ ] agency submits payout request

### Admin payout flow

- [ ] admin sees payout request
- [ ] admin approves or rejects payout
- [ ] agency wallet state reflects the result correctly

## Email Validation

Validate these live:

- [ ] verify-email message is delivered
- [ ] proof-review related communication is deliverable
- [ ] refund email path is deliverable if currently enabled

Record sender and inbox tested:

- Sender: `________________`
- Inbox used: `________________`

## Storage Validation

- [ ] traveler proof upload succeeds
- [ ] admin can download proof
- [ ] unauthorized access is blocked
- [ ] uploaded file remains available for review window

## Exit Criteria

Staging rehearsal is complete only when:

- no step required engineering intervention
- booking state, wallet state, and payout state all match expected outcomes
- no missing secret or callback issue remains open

## Signoff

- Technical lead: `________________`
- Ops lead: `________________`
- Finance lead: `________________`
- Rehearsal date: `________________`
