# Support Macros And Escalation Matrix

These are launch-safe response templates for traveler, agency, and internal escalation.

## Traveler Macros

### 1. Booking Received

Subject: Your Ouiboo booking was received

Hello {{traveler_name}},

We received your booking for `{{trip_title}}`.
To confirm your booking, please complete the bank transfer using the payment instructions shown at checkout and upload your payment proof from your booking page.

Booking reference: `{{booking_id}}`

Regards,
Ouiboo Support

### 2. Payment Proof Under Review

Subject: Your payment proof is under review

Hello {{traveler_name}},

We received your payment proof for booking `{{booking_id}}`.
Our finance team is reviewing it and your booking will be confirmed once the transfer is validated.

Current review target: within `1 business day`.

Regards,
Ouiboo Support

### 3. Payment Confirmed

Subject: Your booking is confirmed

Hello {{traveler_name}},

Your payment for booking `{{booking_id}}` has been confirmed.
Your trip is now confirmed for `{{trip_title}}`.

Regards,
Ouiboo Support

### 4. Payment Rejected

Subject: Action needed for your booking payment

Hello {{traveler_name}},

We could not approve the payment proof for booking `{{booking_id}}`.

Reason: `{{rejection_reason}}`

Please upload a corrected payment proof or contact support if you need help.

Regards,
Ouiboo Support

### 5. Refund Initiated

Subject: Your refund has been initiated

Hello {{traveler_name}},

Your refund for booking `{{booking_id}}` has been initiated.
We will update you once the refund is completed.

Regards,
Ouiboo Support

### 6. Refund Completed

Subject: Your refund is complete

Hello {{traveler_name}},

Your refund for booking `{{booking_id}}` has been completed.
If you do not see the funds yet, please allow for your bank processing time.

Regards,
Ouiboo Support

## Agency Macros

### 1. Verification Pending

Hello {{agency_name}},

Your agency profile is under review.
We will notify you once verification is complete or if we need additional information.

Regards,
Ouiboo Team

### 2. Payout Requested

Hello {{agency_name}},

We received your payout request for `{{amount}} MAD`.
Our team will review it and update you once it is processed.

Regards,
Ouiboo Team

### 3. Payout Approved

Hello {{agency_name}},

Your payout request for `{{amount}} MAD` has been approved and marked for payment.

Regards,
Ouiboo Team

### 4. Payout Rejected

Hello {{agency_name}},

Your payout request for `{{amount}} MAD` was rejected.

Reason: `{{reason}}`

The amount remains available or has been restored in your wallet balance.

Regards,
Ouiboo Team

## Escalation Matrix

### Finance issue

- Examples: unclear proof, missing transfer, amount mismatch
- Primary owner: `admin finance lead`
- Backup owner: `________________`
- Response target: `________________`

### Booking dispute

- Examples: traveler says they paid, booking still pending, wrong session claim
- Primary owner: `support lead`
- Backup owner: `admin finance lead`
- Response target: `________________`

### Refund exception

- Examples: urgent refund, partial refund request, disputed refund
- Primary owner: `finance approver`
- Backup owner: `founder or ops lead`
- Response target: `________________`

### Payout exception

- Examples: payout rejected unexpectedly, bank details mismatch, missing funds
- Primary owner: `admin finance lead`
- Backup owner: `founder or ops lead`
- Response target: `________________`

## Launch Support Coverage

Fill this in before launch:

- Traveler support owner: `________________`
- Proof review owner: `________________`
- Agency support owner: `________________`
- Technical incident owner: `________________`
- Weekend or after-hours fallback: `________________`
