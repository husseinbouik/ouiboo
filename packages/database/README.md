# OUIBOO Database Models

This document explains the core data models and relationships in the OUIBOO platform.

## Core Entities

### 1. User
- **Role**: Central authentication entity.
- **Key Fields**: `email`, `role` (TRAVELER, AGENCY, ADMIN), `isEmailVerified`.
- **Relationships**:
  - One-to-One with `AgencyProfile`.
  - One-to-Many with `Booking` (as a traveler).

### 2. AgencyProfile
- **Role**: Stores agency-specific business information.
- **Key Fields**:
  - `verificationStatus`: PENDING, VERIFIED, REJECTED.
  - `subscriptionStatus`: TRIAL, ACTIVE, EXPIRED.
  - `subscriptionEndsAt`: Critical for access control.
- **Relationships**: Owns `TripTemplate`s.

### 3. TripTemplate
- **Role**: Represents a travel package definition (the "product").
- **Key Fields**: `agencyId` (Owner), `status` (DRAFT/ACTIVE), `featured`.
- **Relationships**: One-to-Many with `TripSession` (dates/prices).

### 4. TripSession
- **Role**: Specific departure date instance of a template.
- **Key Fields**: `startDate`, `endDate`, `price`, `availableSeats`.
- **Logic**: Bookings are made against a Session, not a Template.

### 5. Booking
- **Role**: A reservation made by a Traveler for a TripSession.
- **Key Fields**:
  - `status`: PENDING, PENDING_PAYMENT, CONFIRMED, CANCELLED.
  - `paymentProofId`: Link to manual payment evidence.
- **Security**: Must link to `travelerId` for ownership checks.

## Key Workflows

### Booking Creation
1. Check `TripSession` availability (concurrency safe).
2. Create `Booking` in PENDING status.
3. Decrement `availableSeats`.

### Payment (Manual)
1. Traveler uploads proof -> `Booking` status `PENDING_PAYMENT`.
2. Agency verifies proof -> `Booking` status `CONFIRMED`.

## ⚠️ STORAGE WARNING (Zero-Cost Optimization Phase)

> [!CAUTION]
> This project currently uses **Local Storage** for file uploads (payment proofs, logos). 
> - These files are stored in the `apps/api/uploads` directory.
> - **Risk:** If the server environment is ephemeral (e.g., standard Docker containers without volumes, or some PaaS free tiers), uploads **WILL BE LOST** upon redeployment.
> - **Mitigation:** Ensure the `uploads` directory is mapped to a persistent volume or backup the directory regularly. For production scaling, migrating to S3 is recommended.

## Maintenance & Monitoring
- Check `Admin Dashboard -> System Bookings` for overdue pending payments.
- Inspect `apps/api/logs` (if enabled) for file upload errors.
