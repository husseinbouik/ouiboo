# Banking And Settlement Checklist

This checklist is for the real bank-transfer launch path.

## Account Readiness

- [ ] Business bank account is opened and active
- [ ] Account holder legal name is verified
- [ ] Bank name is verified
- [ ] RIB or IBAN to show in checkout is verified by finance
- [ ] Bank account is approved internally for customer receipts

## Checkout Transfer Details

Fill these exact values:

- Account holder name: `________________`
- Bank name: `________________`
- RIB/IBAN: `________________`
- Branch or agency code if needed: `________________`
- Support contact for payment issues: `________________`

## Required Transfer Reference Rule

Choose and freeze one rule:

- required traveler transfer reference format: `OUIBOO-{bookingId}`
- if traveler omits the reference:
  - support asks for transfer receipt screenshot
  - admin finance matches amount, sender name, and timestamp before approval
- if traveler uses the wrong reference:
  - booking stays in review until admin finance confirms the transfer manually

## Internal Test Transfers

Run and record these before launch:

1. Correct reference
- [ ] sent
- [ ] received
- [ ] matched correctly
- Notes: `________________`

2. Missing reference
- [ ] sent
- [ ] received
- [ ] manual reconciliation completed
- Notes: `________________`

3. Delayed settlement
- [ ] sent
- [ ] delay observed/documented
- [ ] support guidance updated
- Notes: `________________`

## Settlement Expectations

Document actual timing from the tests:

- Same-bank expected timing: `________________`
- Interbank expected timing: `________________`
- Weekend or holiday behavior: `________________`

## Reconciliation Source Of Truth

Use this order when reconciling money:

1. bank statement or bank app confirmation
2. booking id or traveler transfer reference
3. uploaded proof
4. booking state in Ouiboo
5. wallet and payout status in Ouiboo

## Signoff

- Finance owner: `________________`
- Ops owner: `________________`
- Date completed: `________________`
