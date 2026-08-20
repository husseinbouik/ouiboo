# @ouiboo/api-client

Typed API services and React Query hooks shared by the traveler, agency, and
admin applications.

## Services

Use a composed SDK when several domains are needed:

```ts
import { createBrowserApiClient, createOuibooSdk } from '@ouiboo/api-client'

const sdk = createOuibooSdk(createBrowserApiClient())

const trips = await sdk.trips.list({ status: 'ACTIVE', page: 1 })
const booking = await sdk.bookings.getById(bookingId)
```

The SDK exposes `trips`, `bookings`, `agency`, `admin`, `users`, and `payments`.
The existing `createApiClient` and `createBrowserApiClient` exports remain
available for incremental migration.

## React Query hooks

Hooks use a lazy authenticated browser SDK by default:

```tsx
'use client'

import {
  useCheckoutMutation,
  useTripDetailQuery,
  useTripsQuery,
} from '@ouiboo/api-client'

const tripsQuery = useTripsQuery({ q: search, status: 'ACTIVE' })
const tripQuery = useTripDetailQuery(tripId)
const checkout = useCheckoutMutation()
```

Pass `{ sdk }` as the second argument to any hook when an application needs a
custom Axios instance, authentication policy, or test double.

## Query keys

Use `ouibooQueryKeys` for cache reads and invalidation instead of duplicating
string keys in applications.

## Response contracts

`PaginatedData<T>` describes the current trips response. `ApiEnvelope<T>` and
`ApiProblem` define the target success and error contracts for the backend
envelope migration. Keeping both contracts explicit allows endpoint migration
without silently changing existing consumers.
