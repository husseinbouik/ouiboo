# Payment Rollout Decisions

Freeze these decisions before public launch.

## Launch Payment Policy

- Public launch payment method: `bank transfer only`
- Traveler action: upload payment proof after transfer
- Approval owner: `admin finance`
- Agency role: inspect booking and proof state only
- Booking becomes confirmed only after proof is approved by admin finance

## Customer-Facing Promise

Use this exact operational promise unless leadership explicitly changes it:

- Proof review target SLA: `within 1 business day`
- Booking confirmation trigger: `proof approved by admin finance`
- If proof is rejected: traveler receives rejection reason and is asked to re-upload valid proof or contact support
- Refund handling: traveler receives refund status update after admin finance starts processing

## Production Visibility Rules

- `CMI`: hidden in production until all of the following are true:
  - contract approved
  - merchant account created
  - credentials received
  - callback URLs validated
  - at least one real successful payment and one refund test completed
- `CashPlus`: hidden in production until all of the following are true:
  - commercial approval granted
  - credentials or merchant references received
  - settlement flow explained by provider
  - end-to-end live test completed
- `Wafacash`: not shown, not promised, not treated as launch-ready

## Internal Signoff

Fill this in before launch:

- Operations owner: `________________`
- Finance owner: `________________`
- Product owner: `________________`
- Date frozen: `________________`
- Next review date: `________________`

## Launch Copy Inputs To Finalize

Complete these values and hand them to support/product:

- Review SLA shown to traveler: `________________`
- Refund SLA shown to traveler: `________________`
- Support email or WhatsApp contact: `________________`
- Bank transfer instructions version approved: `Yes / No`

## Gateway Enablement — Two-Control Rule (#635)

Card (gateway) payments activate only when BOTH independent controls are ON:

1. **Env flag** — `ENABLE_GATEWAY_PAYMENTS=true` in the API environment (deploy layer).
2. **Platform setting** — the `PlatformSetting` row `gateway.enablement = 'true'` in the database (data layer). The row is absent by default, and absence means OFF.

Either control alone is never enough: with only one ON, every gateway endpoint
still refuses with `503 'Gateway payments are not enabled'`. The setting can be
changed only through `POST /admin/payments/gateway-enablement` by an admin who
completes an MFA (TOTP) step-up; every change writes an AuditLog row
(`GATEWAY_ENABLEMENT_CHANGED`). Status is visible at
`GET /admin/payments/gateway-enablement`.

This code-level lock is one part of the card-payments enablement gate; the
remaining items (Payments re-run of the negative-test set on a gateway-enabled
build, the agency as merchant of record under its own contract with a
BAM-authorised payment institution, and counsel sign-off under Law 103-12)
stay tracked with the card-payments phase.
