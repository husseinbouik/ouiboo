# Ouiboo MVP Scope

## Traveler MVP

The pre-launch MVP must reliably support:

- account registration, authentication and recovery;
- discover/search and trip results;
- trip details and departure selection;
- selling-agency identity and verification status;
- price and relevant cancellation/refund policy understanding;
- booking creation;
- the supported manual-payment process;
- confirmation and booking access/status;
- a basic, human-operated support/cancellation path.

## Agency MVP

The MVP must reliably support:

- registration and authentication;
- agency information and verification;
- required booking/payment configuration;
- trip creation and editing;
- departure creation and management;
- publishing;
- booking management;
- supported payment-proof inspection/review responsibilities;
- essential operational information and only the analytics already proven reliable.

## Admin MVP

The MVP must support the existing essential marketplace operations:

- agency verification;
- trip oversight;
- booking and payment-proof oversight;
- currently supported refund, payout and payment operations;
- audit visibility and necessary manual intervention.

## Minimum support process for the controlled pilot

A new support-ticket domain is not required for the first controlled pilot. Before admitting real users, operations must:

1. publish one monitored traveler/agency support contact;
2. require every request to include the Ouiboo booking reference;
3. record the request and decision in the approved operations log;
4. route payment-proof issues to the finance-review owner;
5. route cancellation/refund requests to the named approver;
6. record any booking/payment state change in Ouiboo's existing audited admin workflow;
7. communicate the final outcome to the traveler and agency.

The support contact, coverage owners and response target are human launch inputs. Do not invent them in code. If pilot volume makes this process unreliable, that evidence may justify a small booking-linked case model later.

# NOT PART OF MVP

- Full CRM or marketing automation
- Supplier, hotel, restaurant, museum or attraction portals
- Supplier marketplace
- Full accounting ERP, payroll, general ledger or tax filing
- Airline/GDS booking
- OTA channel manager
- Native mobile applications
- Loyalty or traveler wallet
- Advanced multi-currency wallet
- AI itinerary planner, AI booking agent or dynamic AI pricing
- Social network/community
- Complex recommendation engine

## Future possibilities, not commitments

### Product-market fit

Traveler preferences, improved comparison, recently viewed, better messaging, richer notifications, booking participants, a pre-trip hub and behavioral analytics.

### Agency SaaS

CRM-lite, manifests, agency team roles, commission reporting, accounting exports and an internal supplier registry.

### Marketplace expansion

Supplier partnerships, supplier/distribution integrations and selectively validated supplier access.

### Advanced platform

Semantic search, AI-assisted discovery constrained to real inventory, and international market configuration.

Every future item requires evidence from pilot users and a separate scope decision.

## Supplier strategy

Do not build a supplier portal for MVP. If validated later, begin with a generic internal registry for supplier organizations, contacts, categories, services, agreements, documents and expirations. Do not create a separate system for every supplier category. A portal requires evidence of repeated shared workflows between agencies and suppliers.

## Finance boundary

Ouiboo may own booking payments, refunds, commissions, platform fees, payouts, settlement records, receipts, legally appropriate platform invoices and accounting exports.

Ouiboo should not become a general accounting ERP. General ledger, payroll, statutory tax filing, company expenses and general bank reconciliation should normally remain in dedicated systems or integrations.

## Success metrics to establish during the pilot

Agency funnel:

```text
registration → profile completion → verification → first trip
→ first departure → first published trip → first booking
```

Traveler funnel:

```text
visit → search → trip view → departure selection → checkout start
→ booking created → payment completed/approved → booking confirmed
```

Operational measures: failed bookings, payment-review time, cancellations, support requests and technical error rate. This task does not authorize building a large analytics platform.
