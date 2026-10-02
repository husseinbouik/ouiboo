# IMPL_PLAN: Phase 2 - The Supply Side (Agency App)

## Overview
This phase focuses on empowering agencies to manage their trips and bookings. We will build the "Supply Side" of the marketplace using Next.js for the frontend (`apps/agency`) and connecting it to our newly created NestJS backend.

## 1. API Integration Layer
We need a robust HTTP client to communicate with the backend.
- **Location**: `apps/agency/src/lib/api-client.ts` (or shared package if preferred, but agency-local is fine for now).
- **Tech**: Axios.
- **Features**:
    - Base URL configuration (`http://localhost:3000/api`).
    - **Interceptors**: Automatically attach `Authorization: Bearer <token>` from `localStorage` or `cookies`.
    - **Error Handling**: Global error handling (e.g., redirect to login on 401).

## 2. Authentication UI
Connect the existing (or new) Auth pages to the real API.
- **Login Page**: `apps/agency/src/app/(auth)/login/page.tsx`
    - Use `react-hook-form` + `zod` (utilize `@ouiboo/schemas`).
    - API Call: `POST /auth/login`.
    - Action: Store tokens -> Redirect to `/dashboard`.
- **Register Page**: `apps/agency/src/app/(auth)/register/page.tsx`
    - Fields: Email, Password, Company Name, etc.
    - API Call: `POST /auth/register`.

## 3. Trip Management (The Wizard)
A multi-step experience for creating trips.
- **Route**: `/dashboard/trips/create` (or modal).
- **State Management**: Zustand or React Context to hold wizard state data across steps.

### Step 1: Trip Info
- **Fields**: Title, Description, Category, Start Location, Duration (Days/Nights).
- **UI**: Text inputs, Select box for Category.

### Step 2: Visuals (Media)
- **Feature**: Image Upload.
- **Logic**:
    - User selects files.
    - Frontend calls `POST /upload` (Upload API created in Phase 1).
    - Backend returns URLs.
    - Frontend stores URLs in wizard state.

### Step 3: Logistics (Sessions)
- **Feature**: Define availability.
- **Fields**: Date Range, Price (per person), Total Seats.
- **Logic**: Can add multiple sessions for one template.

### Final Review & Submit
- **API Call**: 
    1. `POST /trips` (Create Template).
    2. `POST /trips/:id/sessions` (Create Sessions for that template).

## 4. Dashboard & Stats
- **Route**: `/dashboard`
- **Data**: Fetch from `GET /users/me` (includes AgencyProfile) and new stats endpoint if needed.
- **UI**: Show "Total Trips", "Total Bookings" (mock stats or calculated on frontend for now).

## Execution Steps
1.  **Setup API Client**: Create the `axios` instance.
2.  **Auth Flow**: Implement Login/Register logic.
3.  **Trip Wizard UI**: Build the steps and state management.
4.  **Connect Trip API**: Wire up the "Create Trip" button.
5.  **Agency Dashboard**: Display real data.
