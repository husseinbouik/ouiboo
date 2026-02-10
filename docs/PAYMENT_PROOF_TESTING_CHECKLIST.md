# Payment Proof Review - Testing Checklist

**Implementation Status**: ✅ COMPLETE  
**Date**: February 9, 2026  
**Components Modified**: 2 files (1 new, 1 updated)

---

## Pre-Testing Setup

### 1. Verify Files Exist
- [x] `apps/agency/src/components/PaymentProofReviewModal.tsx` - 402 lines
- [x] `apps/agency/src/app/dashboard/bookings/page.tsx` - Updated with 4 new integrations

### 2. Check Imports
- [x] PaymentProofReviewModal imported in bookings page
- [x] useState hook imported
- [x] useMutation, useQueryClient imported from React Query
- [x] Eye icon imported from lucide-react
- [x] Framer Motion AnimatePresence in modal

### 3. Verify Dependencies
- [x] @tanstack/react-query available
- [x] framer-motion available
- [x] lucide-react available
- [x] tailwindcss available
- [x] @ouiboo/ui components available

---

## Component Verification Tests

### PaymentProofReviewModal Component

**Purpose**: Display payment proofs with approval/rejection workflow

#### Test: Modal Rendering
- [ ] Component imports without errors
- [ ] TypeScript compilation succeeds
- [ ] No console errors on component load

#### Test: Modal Opens
- [ ] Modal appears when `isOpen={true}`
- [ ] Modal closes when `isOpen={false}`
- [ ] Backdrop clickable (closes modal)
- [ ] X button closes modal

#### Test: Booking Details Display
- [ ] Traveler name displays correctly
- [ ] Trip title displays correctly
- [ ] Amount displays with currency formatting
- [ ] Booking ID displays correctly

#### Test: Image/PDF Display
- [ ] Images load and display correctly
- [ ] PDFs load in iframe
- [ ] Loading spinner shows while loading
- [ ] Error state shows with retry option
- [ ] Retry button retries load

#### Test: Rejection Workflow
- [ ] "Reject Payment" button visible when status is PENDING
- [ ] Clicking reject shows rejection input
- [ ] Textarea accepts text input
- [ ] Character counter updates correctly
- [ ] Maximum 500 characters enforced
- [ ] Minimum 10 characters required for submit
- [ ] Submit button disabled if < 10 characters
- [ ] "Review Rejection" shows confirmation dialog
- [ ] Confirmation dialog shows reason in read-only field
- [ ] "Back" button returns to rejection input
- [ ] "Confirm Rejection" submits rejection

#### Test: Read-Only Mode
- [ ] Status banner shows for VERIFIED proofs
- [ ] Status banner shows for REJECTED proofs
- [ ] Rejection reason displays in banner if REJECTED
- [ ] Approve/Reject buttons hidden in read-only mode
- [ ] Only Close button visible in read-only mode

#### Test: Dark Mode
- [ ] Modal background correct in dark mode
- [ ] Text color correct in dark mode
- [ ] Button colors correct in dark mode
- [ ] Status banner colors correct in dark mode
- [ ] All icons visible in dark mode

---

## Bookings Page Integration Tests

### Payment Verification Mutation

**Purpose**: PATCH /bookings/:id/verify-payment with approval/rejection

#### Test: Mutation Setup
- [ ] Mutation initializes without errors
- [ ] Error handling configured
- [ ] Success handling configured
- [ ] Query invalidation configured

#### Test: Approve Flow
- [ ] Clicking "Approve" calls mutation with `approved: true`
- [ ] Loading state shows during mutation
- [ ] Success alert shows: "Payment verified successfully..."
- [ ] Modal closes on success
- [ ] Booking list refreshes
- [ ] Booking status updates to CONFIRMED
- [ ] Payment proof badge updates to VERIFIED

#### Test: Reject Flow
- [ ] Clicking "Reject" calls mutation with `approved: false`
- [ ] Rejection reason included in request
- [ ] Loading state shows during mutation
- [ ] Success alert shows: "Payment rejected. Traveler will be notified."
- [ ] Modal closes on success
- [ ] Booking list refreshes
- [ ] Booking status updates to REJECTED
- [ ] Payment proof badge updates to REJECTED with reason

#### Test: Error Handling
- [ ] API error shown in alert
- [ ] Error message from API displayed if available
- [ ] Console logs error for debugging
- [ ] Modal stays open after error
- [ ] User can retry

### Enhanced Status Badges

#### Test: getProofStatusLabel Function
- [ ] Returns object with `label`, `className`, `icon`, `displayLabel`
- [ ] PENDING: Returns Clock icon, amber color, "Awaiting Review"
- [ ] VERIFIED: Returns CheckCircle2 icon, emerald color, "Verified"
- [ ] REJECTED: Returns AlertCircle icon, rose color, "Rejected"
- [ ] Not uploaded: Shows "Not Uploaded" with AlertCircle icon

#### Test: Badge Rendering
- [ ] Booking status badge displays correctly
- [ ] Payment proof badge displays correctly
- [ ] Icons render with correct color
- [ ] Labels display correctly
- [ ] Both badges show together in booking row

### View Proof Button

#### Test: Button Display
- [ ] Button shows if proof exists and PENDING (primary blue)
- [ ] Button shows if proof exists but VERIFIED/REJECTED (outline)
- [ ] Button shows as disabled if no proof uploaded
- [ ] Button text shows icon + label
- [ ] Button disabled during mutation

#### Test: Button Behavior
- [ ] Clicking opens modal with correct booking
- [ ] Modal shows review mode if PENDING
- [ ] Modal shows read-only mode if VERIFIED/REJECTED
- [ ] Closing modal resets state

---

## User Workflow Tests

### Complete Approval Workflow

1. [ ] Navigate to Agency Dashboard
2. [ ] Click "Bookings" tab
3. [ ] Find booking with "Awaiting Review" payment status
4. [ ] Click "View Proof" button on booking row
5. [ ] Modal opens showing:
   - [ ] Traveler name
   - [ ] Trip title
   - [ ] Amount
   - [ ] Booking ID
6. [ ] Payment proof image/PDF displays
7. [ ] Click "Approve Payment" button
8. [ ] Modal closes
9. [ ] Success message appears: "Payment verified successfully. Booking status updated to Confirmed."
10. [ ] Refresh page or wait for auto-refresh
11. [ ] Booking status changed to "CONFIRMED"
12. [ ] Payment proof badge changed to "Verified"

### Complete Rejection Workflow

1. [ ] Navigate to Agency Dashboard
2. [ ] Click "Bookings" tab
3. [ ] Find booking with "Awaiting Review" payment status
4. [ ] Click "View Proof" button on booking row
5. [ ] Modal opens
6. [ ] Payment proof displays
7. [ ] Click "Reject Payment" button
8. [ ] Rejection reason input appears
9. [ ] Type rejection reason (type at least 10 characters)
10. [ ] Character counter shows correct count
11. [ ] Click "Review Rejection" button
12. [ ] Confirmation dialog appears showing:
    - [ ] Warning message
    - [ ] Rejection reason in read-only field
    - [ ] "Back" and "Confirm Rejection" buttons
13. [ ] Click "Confirm Rejection" button
14. [ ] Modal closes
15. [ ] Success message appears: "Payment rejected. Traveler will be notified."
16. [ ] Refresh page or wait for auto-refresh
17. [ ] Booking status changed to "REJECTED"
18. [ ] Payment proof badge changed to "Rejected"

### View Verified/Rejected Proof

1. [ ] Navigate to Agency Dashboard
2. [ ] Click "Bookings" tab
3. [ ] Find booking with "Verified" or "Rejected" payment status
4. [ ] Click "View Proof" button (outline style)
5. [ ] Modal opens in read-only mode:
   - [ ] Status banner shows with status and reason (if rejected)
   - [ ] Approve/Reject buttons NOT visible
   - [ ] Only "Close" button visible
6. [ ] Payment proof displays
7. [ ] Can view proof details but cannot interact
8. [ ] Click "Close" to exit

---

## Edge Case Tests

### No Payment Proof Uploaded
- [ ] Booking displays "No Proof" button (disabled, gray)
- [ ] Button text: "No Proof"
- [ ] Button not clickable
- [ ] No modal opens on click attempt

### Network Error During Approval
- [ ] Disconnect internet
- [ ] Click "Approve Payment"
- [ ] Error alert shows: "Error: [error message]"
- [ ] Modal stays open
- [ ] Can retry or close modal

### Network Error During Rejection
- [ ] Disconnect internet
- [ ] Click "Confirm Rejection"
- [ ] Error alert shows: "Error: [error message]"
- [ ] Modal stays open
- [ ] Can retry or close modal

### Very Long Rejection Reason
- [ ] Type 500+ character reason
- [ ] Characters after 500 not added
- [ ] Counter shows "500 / 500"
- [ ] Submit button enabled

### Invalid PDF/Image URL
- [ ] Image URL returns 404
- [ ] Error icon shows in modal
- [ ] "Retry" button appears
- [ ] User can retry

### Rapid API Responses
- [ ] Approve, then immediately approve another booking
- [ ] No race condition errors
- [ ] Both bookings update correctly
- [ ] No duplicate mutations

---

## Responsive Design Tests

### Mobile (375px)
- [ ] Modal displays fully on screen
- [ ] No horizontal scroll
- [ ] Buttons readable and clickable
- [ ] Image/PDF scales properly
- [ ] Text readable
- [ ] Dark mode looks correct

### Tablet (768px)
- [ ] Modal centered on screen
- [ ] Proper spacing on sides
- [ ] All content visible
- [ ] Good use of space

### Desktop (1920px)
- [ ] Modal properly sized
- [ ] Not too large
- [ ] Proper alignment
- [ ] Image/PDF displays at good size

---

## Dark Mode Tests

- [ ] Modal background color correct
- [ ] Text color high contrast in dark mode
- [ ] Button colors correct
- [ ] Status badges colors correct
- [ ] Loading spinner visible
- [ ] Icons clearly visible
- [ ] Modal backdrop appropriate darkness
- [ ] Input field readable
- [ ] Confirmation dialog readable

---

## Accessibility Tests

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Shift+Tab works backwards
- [ ] Enter key activates buttons
- [ ] Escape key closes modal
- [ ] Focus visible on all elements

### Screen Reader
- [ ] Modal title announced
- [ ] Booking details announced
- [ ] Button labels clear
- [ ] Icon labels present
- [ ] Error messages announced
- [ ] Status badges announced

### Color Contrast
- [ ] All text meets WCAG AA (4.5:1)
- [ ] Status colors distinguishable by pattern/icon
- [ ] Dark text on light backgrounds
- [ ] Light text on dark backgrounds

---

## Browser Compatibility

- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## Performance Tests

### Load Time
- [ ] Modal opens within 200ms
- [ ] Image/PDF loads within 2 seconds
- [ ] API response within 1 second

### Memory
- [ ] No memory leaks when opening/closing modal multiple times
- [ ] Smooth animations (60 fps)

### Network
- [ ] Works with slow 3G connection
- [ ] Handles network timeouts gracefully

---

## Final Sign-Off

**Test Date**: ___________  
**Tested By**: ___________  
**Overall Status**: [ ] Pass [ ] Fail  

**Issues Found**:
```
- Issue 1: ...
- Issue 2: ...
```

**Notes**:
```
...
```

---

## Post-Testing Actions

- [ ] All tests passed
- [ ] Document any failed tests
- [ ] Create GitHub issues for failures
- [ ] Update components if needed
- [ ] Merge to main branch
- [ ] Deploy to production
- [ ] Monitor for errors in production
- [ ] Gather user feedback

---

## References

- Implementation Guide: [PAYMENT_PROOF_REVIEW_IMPLEMENTATION.md](PAYMENT_PROOF_REVIEW_IMPLEMENTATION.md)
- PaymentProofReviewModal: `apps/agency/src/components/PaymentProofReviewModal.tsx`
- Bookings Page: `apps/agency/src/app/dashboard/bookings/page.tsx`
- API Docs: [docs/API.md](API.md)
