# Multi-Currency Wallet/Payout Design (#220)

Status: Design only — no implementation in this change.

## Current state

### Prisma models (`packages/database/prisma/schema.prisma`)
- `Wallet`: has `currency String @default("MAD")`, `availableBalance`/`pendingBalance` as `Decimal(18,2)`
- `WalletTransaction`: has `amount Decimal(18,2)` but **no currency field** — implicitly inherits wallet currency
- `PayoutRequest`: has `currency String @default("MAD")`, `amount Decimal(18,2)`
- `ExchangeRate`: cached rates from exchangerate-api.io (see `currency.service.ts`)

### Current invariant
One wallet per agency (`agencyId @unique`), single currency (MAD). All amounts in a wallet are in the wallet's currency.

## Design principles (per AGENTS.md)

> "Financial records must carry immutable currency context. Do not mix currencies inside one wallet or payout ledger without an explicit model and invariant."

## Proposed model: one wallet per (agency, currency)

### Schema changes (additive, backward-compatible)

```prisma
model Wallet {
  id               String              @id @default(cuid())
  agencyId         String
  agency           AgencyProfile       @relation(fields: [agencyId], references: [id])
  currency         String              @default("MAD")
  availableBalance Decimal             @default(0) @db.Decimal(18, 2)
  pendingBalance   Decimal             @default(0) @db.Decimal(18, 2)
  transactions     WalletTransaction[]

  // Changed: was @unique on agencyId alone
  @@unique([agencyId, currency])
  @@index([agencyId])
}

model WalletTransaction {
  id             String          @id @default(cuid())
  walletId       String
  wallet         Wallet          @relation(fields: [walletId], references: [id])
  amount         Decimal         @db.Decimal(18, 2)
  // NEW: immutable currency context on every transaction
  currency       String          @default("MAD")
  // NEW: for cross-currency operations, record the FX rate used
  fxRate         Decimal?        @db.Decimal(18, 8)
  fxSource       String?         // e.g. "exchangerate-api.io"
  type           TransactionType
  reason         String
  referenceId    String?
  idempotencyKey String?         @unique
  createdAt      DateTime        @default(now())

  @@index([walletId, createdAt])
}

model PayoutRequest {
  // ... existing fields ...
  // NEW: immutable FX context for the payout
  fxRate         Decimal?        @db.Decimal(18, 8)
  fxSource       String?
  fxAppliedAt    DateTime?
}
```

### Invariants
1. **No mixed-currency wallets**: `@@unique([agencyId, currency])` enforces one wallet per currency per agency.
2. **Immutable transaction currency**: `WalletTransaction.currency` is set at creation, never updated. Must equal the wallet's currency.
3. **Explicit FX**: any operation converting between currencies records `fxRate`, `fxSource`, and timestamp. No silent conversions.
4. **Authoritative amounts**: all amounts are in the transaction's stated currency. Display conversions happen at read time, never stored.

## Exchange rate handling

### Current
`CurrencyService` fetches from `exchangerate-api.io`, caches in `ExchangeRate` table, refreshed by cron (now via Vercel Cron per #216).

### Proposed
- Keep the existing service for **display** conversions (e.g., showing a EUR wallet balance in MAD).
- For **financial** conversions (actual money movement between currencies):
  - Lock the rate at transaction time: fetch current rate, store it on the transaction (`fxRate`, `fxSource`, `fxAppliedAt`).
  - Rate must be fresh (< 1 hour old) or the transaction is rejected — no stale-rate money movement.
  - All FX conversions are explicit user actions (agency opts into payout in different currency), never automatic.

### Rate freshness rule
```typescript
// Pseudo-code for financial FX
const rate = await currencyService.getExchangeRates(targetCurrency);
if (rate.age > 3600_000) {
  throw new BadRequestException('Exchange rate is stale, try again');
}
// Store rate on transaction — immutable from this point
```

## Migration plan

### Phase 1: Additive (no downtime)
1. Add `currency` to `WalletTransaction` (default "MAD", backfill from parent wallet).
2. Add `fxRate`, `fxSource` to `WalletTransaction` (nullable).
3. Add `fxRate`, `fxSource`, `fxAppliedAt` to `PayoutRequest` (nullable).
4. Change `Wallet.agencyId @unique` → `@@unique([agencyId, currency])`:
   - **Preflight**: verify no agency has multiple wallets (currently impossible due to `@unique`).
   - This is a constraint change — requires the preflight check per AGENTS.md.

### Phase 2: Service updates
1. `WalletsService`: accept `currency` param, get-or-create wallet per (agency, currency).
2. All transaction creation: set `currency` from wallet, validate match.
3. Payout flow: validate payout currency matches wallet currency OR require explicit FX with fresh rate.

### Phase 3: API/UX
1. Agency dashboard: currency selector for wallet view.
2. Payout request: currency dropdown (defaults to wallet currency).

### Rollback
- Phase 1 is fully backward-compatible (new nullable columns, default values).
- If Phase 2/3 has issues: revert code, data remains valid (all existing records are MAD).

## Out of scope
- Automatic currency conversion on booking (bookings stay in trip currency).
- Multi-currency pricing display (separate traveler UX work).
- Crypto or non-fiat currencies.
