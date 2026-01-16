# MVP Smoke Test Checklist

Use this checklist to manually verify the MVP flow before launch. Record results, timestamps, and any issues encountered.

## Preconditions

- Test email inbox is accessible (use a unique address per run).
- You have access to both a standard user account and an admin account.
- Payment/booking environment is configured for test usage if applicable.

## Checklist

### 1) Login

- [ ] Navigate to the login page.
- [ ] Enter valid credentials for an existing user.
- [ ] Submit and confirm you land on the authenticated/home experience.
- [ ] Log out to reset for signup checks.

### 2) Signup

- [ ] Navigate to the signup page.
- [ ] Create a new user with a unique email address.
- [ ] Confirm the account creation flow completes and prompts for email verification.

### 3) Verify Email

- [ ] Open the verification email in the test inbox.
- [ ] Click the verification link.
- [ ] Confirm the browser shows a successful verification message and the account is marked verified.

### 4) Create Trip

- [ ] Log in as the newly verified user.
- [ ] Create a new trip with required details (name, dates, destination, etc.).
- [ ] Confirm the trip appears in the trip list/dashboard.

### 5) Create Session

- [ ] Open the trip you just created.
- [ ] Create a session for the trip (e.g., time slot or schedule entry).
- [ ] Confirm the session appears in the trip details.

### 6) Booking

- [ ] From the session, initiate a booking/reservation.
- [ ] Complete required booking details.
- [ ] Confirm the booking shows as created/pending in the user view.

### 7) Upload Proof

- [ ] Open the booking that requires proof (payment or documentation).
- [ ] Upload a valid proof file.
- [ ] Confirm the upload succeeds and the proof is visible in the booking.

### 8) Admin Approval

- [ ] Log in as an admin user.
- [ ] Locate the pending booking with uploaded proof.
- [ ] Approve the booking.
- [ ] Confirm the booking status updates to approved for both admin and user views.

## Notes

- Capture screenshots or logs for any failures.
- If a step fails, stop and file a ticket before continuing.
