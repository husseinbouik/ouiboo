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
