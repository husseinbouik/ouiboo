# Admin Finance Playbook

This playbook governs payment proof review, refunds, and payouts for launch.

## 1. Payment Proof Review SOP

### Where to work

- Open the admin dashboard
- Go to `Payment Proofs`
- Review newest pending submissions first

### Approve proof only if all checks pass

- booking id matches the submitted proof or transfer reference
- transfer amount matches expected booking amount
- payer name is plausible for the traveler or documented payer
- date and time are visible or otherwise verifiable
- proof is readable and not clearly altered

### Reject proof when any of these is true

- amount is wrong
- booking reference cannot be matched
- image or document is unreadable
- duplicate or suspicious receipt is detected
- transfer cannot be found in bank records after review window

### Required rejection reason format

Use one short reason plus one action instruction:

- `Amount does not match the booking total. Please upload proof for the full transfer amount.`
- `We could not match this transfer to your booking reference. Please re-upload proof with the transfer receipt showing the booking reference.`
- `The uploaded proof is unreadable. Please upload a clearer receipt screenshot or PDF.`

## 2. Booking Escalation SOP

Escalate to finance lead when:

- proof is unclear but amount might be correct
- duplicate transfer appears possible
- traveler paid after booking cancellation
- booking was modified after traveler transferred money
- traveler claims transfer succeeded but bank record is missing

Escalation packet must include:

- booking id
- traveler name and email
- claimed amount
- proof file
- bank statement screenshot if available
- current booking, payment, and refund state

## 3. Refund SOP

### Internal approval rule

- Refunds must be approved by: `________________`
- Standard refund SLA: `________________`

### Acceptable refund reasons

- booking cancelled by organizer
- duplicate charge or duplicate transfer
- payment accepted for unavailable session
- valid customer-service exception approved internally

### Refund handling steps

1. verify booking id and payment origin
2. confirm refund eligibility and reason
3. record internal approver
4. trigger refund in admin
5. notify traveler that refund has been initiated
6. verify booking/payment state updated correctly
7. log completion date in finance tracker

## 4. Payout SOP

### Payout readiness rule

Agency funds become payout-eligible when:

- booking is confirmed
- payment is settled and not under refund dispute
- any internal holding period is complete

Internal holding period for launch: `________________`

### Payout review steps

1. confirm payout request amount
2. confirm wallet available balance covers it
3. confirm no active refund/dispute requires holding funds
4. confirm agency bank details are complete
5. approve or reject with reason

### Rejection guidance

Use one of these reasons:

- `Missing or invalid bank details`
- `Requested amount exceeds available balance`
- `Funds are temporarily held due to refund or dispute review`

When rejecting, communicate that:

- the payout request was rejected
- the reason is specified
- the funds remain or are restored in the agency wallet

## 5. Daily Reconciliation Checklist

- [ ] pending proofs reviewed
- [ ] refunds in progress checked
- [ ] rejected payouts reviewed
- [ ] wallet balances spot-checked against recent booking activity
- [ ] exceptions logged for support follow-up

## Ownership

- Admin finance lead: `________________`
- Backup reviewer: `________________`
- Escalation approver: `________________`
