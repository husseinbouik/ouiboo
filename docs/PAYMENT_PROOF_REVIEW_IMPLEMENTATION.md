# Payment Proof Review Implementation Guide

## Overview

This implementation adds an interactive payment proof review interface to the agency bookings dashboard. It allows agencies to view, approve, or reject payment proofs uploaded by travelers, with proper status tracking and notifications.

## Files Implemented

### 1. PaymentProofReviewModal Component
**File**: `apps/agency/src/components/PaymentProofReviewModal.tsx`

A comprehensive modal component that displays payment proof images/PDFs with approval/rejection capabilities.

**Key Features:**
- **Animated Modal**: Uses Framer Motion for smooth entry/exit animations
- **Booking Details Display**: Shows traveler name, trip title, amount, and booking ID
- **File Type Handling**: Automatically detects and displays images or PDFs
  - Images: Rendered with `<img>` tag
  - PDFs: Rendered with `<iframe>` tag
- **Loading States**: Spinner shown while proof is loading
- **Error Handling**: Retry button if proof fails to load
- **Rejection Workflow**: 
  - Textarea input for rejection reason
  - Character limit: 500 chars (min 10)
  - Confirmation step before submission
- **Read-Only Mode**: For already verified/rejected proofs
  - Approval/rejection buttons hidden
  - Status banner displayed with reason if rejected
- **Dark Mode**: Full support with Tailwind CSS
- **Responsive**: Works on all screen sizes

**Props:**
```typescript
interface PaymentProofReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: Booking | null;
  onApprove: () => void;
  onReject: (reason: string) => void;
  isLoading?: boolean;
}
```

**Data Models:**
```typescript
interface PaymentProof {
  id?: string;
  imageUrl?: string;
  status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string | null;
}

interface Booking {
  id: string;
  fullName?: string;
  traveler?: { name: string };
  totalAmount: number;
  paymentProof?: PaymentProof;
  session?: {
    template?: {
      title: string;
    };
  };
}
```

**Component Structure:**
```
Modal Container
├── Header
│   ├── Title & Description
│   └── Close Button
├── Status Banner (if read-only)
│   ├── Verified Status
│   └── Rejected Status + Reason
├── Content
│   ├── Booking Details Card
│   │   ├── Traveler Name
│   │   ├── Trip Title
│   │   ├── Amount
│   │   └── Booking ID
│   ├── Payment Proof Display
│   │   ├── Image/PDF Viewer
│   │   ├── Loading State
│   │   └── Error State with Retry
│   └── Rejection Input (conditional)
│       ├── Textarea for Reason
│       ├── Character Counter
│       └── Confirmation Dialog
└── Footer Actions
    ├── Close Button
    ├── Reject Button (if pending)
    ├── Approve Button (if pending)
    └── Close Button (if read-only)
```

### 2. Updated Bookings Page
**File**: `apps/agency/src/app/dashboard/bookings/page.tsx`

Enhanced with payment proof review functionality and improved status badges.

**Changes Made:**

1. **New Imports:**
   - `useState` hook for state management
   - `useMutation` from `@tanstack/react-query`
   - `useQueryClient` for cache invalidation
   - `Eye` icon from lucide-react
   - `PaymentProofReviewModal` component

2. **New State:**
   ```typescript
   const [reviewingBooking, setReviewingBooking] = useState<any>(null);
   const queryClient = useQueryClient();
   ```

3. **Payment Verification Mutation:**
   ```typescript
   const verifyPaymentMutation = useMutation({
     mutationFn: async ({ bookingId, approved, rejectionReason }) => {
       await apiClient.patch(`/bookings/${bookingId}/verify-payment`, {
         approved,
         rejectionReason: rejectionReason || undefined
       });
     },
     onSuccess: (_, variables) => {
       // Invalidate queries and show success message
       queryClient.invalidateQueries({ queryKey: ['agency-bookings'] });
       setReviewingBooking(null);
       
       if (variables.approved) {
         alert('Payment verified successfully. Booking status updated to Confirmed.');
       } else {
         alert('Payment rejected. Traveler will be notified.');
       }
     },
     onError: (error) => {
       // Show error message
       const errorMessage = error?.response?.data?.message || error?.message || 'Failed to verify payment';
       alert(`Error: ${errorMessage}`);
       console.error('Payment verification failed:', error);
     }
   });
   ```

4. **Enhanced Status Labels:**
   - Returns object with: `label`, `className`, `icon`, `displayLabel`
   - Provides detailed information for different payment proof states:
     - **PENDING**: Amber with Clock icon, "Awaiting Review"
     - **VERIFIED**: Emerald with CheckCircle icon, "Verified"
     - **REJECTED**: Rose with AlertCircle icon, "Rejected"
     - **Not uploaded**: Slate with AlertCircle icon, "Not Uploaded"

5. **Updated Badges:**
   - Booking status badge: Shows with appropriate icon
   - Payment proof badge: Shows with icon and status label
   - Both badges shown together for complete status overview

6. **Conditional "View Proof" Button:**
   - **If proof exists and PENDING**: Primary blue button with Eye icon
     - Clickable to open review modal
   - **If proof exists but VERIFIED/REJECTED**: Outline button (read-only)
     - Opens modal but shows read-only view
   - **If no proof uploaded**: Disabled gray button
     - Shows "No Proof" label
   - Loading state: Button disabled while mutation is pending

7. **Modal Integration:**
   ```typescript
   <PaymentProofReviewModal
     isOpen={!!reviewingBooking}
     onClose={() => setReviewingBooking(null)}
     booking={reviewingBooking}
     onApprove={() => verifyPaymentMutation.mutate({
       bookingId: reviewingBooking.id,
       approved: true
     })}
     onReject={(reason) => verifyPaymentMutation.mutate({
       bookingId: reviewingBooking.id,
       approved: false,
       rejectionReason: reason
     })}
     isLoading={verifyPaymentMutation.isPending}
   />
   ```

## API Endpoints Used

### 1. Fetch Bookings (Existing)
- **Endpoint**: `GET /agency/bookings`
- **Response**: Array of booking objects with `paymentProof` included
- **Data**: Includes all booking details and payment proof status

### 2. Download Payment Proof (Existing)
- **Endpoint**: `GET /bookings/:id/payment-proof/download`
- **Response**: File (image or PDF) with authentication
- **Usage**: Used as src for `<img>` and `<iframe>` tags

### 3. Verify Payment (Existing)
- **Endpoint**: `PATCH /bookings/:id/verify-payment`
- **Request Body:**
  ```json
  {
    "approved": boolean,
    "rejectionReason": string (optional)
  }
  ```
- **Response**: Updated booking object
- **Side Effects**:
  - If `approved: true`: Updates booking status to CONFIRMED, payment proof status to VERIFIED
  - If `approved: false`: Updates booking status to REJECTED, payment proof status to REJECTED, saves rejection reason

## User Workflows

### Approve Payment Proof

1. **Navigate to Bookings Page**
   - Agency user opens Dashboard → Bookings

2. **View Pending Payments**
   - See bookings with "Awaiting Review" status in the payment proof badge
   - Hover over booking row to reveal "View Proof" button

3. **Open Review Modal**
   - Click "View Proof" button
   - Modal opens with booking details and payment proof image/PDF

4. **Approve Payment**
   - Review payment proof image/PDF
   - Click "Approve Payment" button
   - No additional input required

5. **Confirmation & Update**
   - Modal closes
   - Booking list refreshes
   - Success message shown: "Payment verified successfully. Booking status updated to Confirmed."
   - Status badges update:
     - Booking status: Changes to "CONFIRMED"
     - Payment proof badge: Changes to "Verified"

### Reject Payment Proof

1. **Open Review Modal**
   - Same as approval workflow, but click "Reject Payment" button

2. **Enter Rejection Reason**
   - Textarea input appears
   - User types reason (minimum 10 characters, max 500)
   - Character counter shows current length

3. **Review Rejection Details**
   - User clicks "Review Rejection"
   - Confirmation dialog shows:
     - Warning message
     - Rejection reason in read-only field
     - "Back" and "Confirm Rejection" buttons

4. **Confirm Rejection**
   - Click "Confirm Rejection" button
   - Modal closes
   - Booking list refreshes
   - Success message shown: "Payment rejected. Traveler will be notified."
   - Status badges update:
     - Booking status: Changes to "REJECTED"
     - Payment proof badge: Changes to "Rejected"

### View Verified/Rejected Proof

1. **Open Review Modal**
   - Same as above, click "View Proof" button

2. **Read-Only Mode**
   - Status banner shown at top with status and reason (if rejected)
   - Payment proof image/PDF displayed
   - Approval/rejection buttons hidden
   - Only "Close" button available

## UI Components & Styling

### Colors & Styling
- **Primary**: Deep Blue (`text-deep-blue`)
- **Accent**: Sunset Orange (`text-sunset-orange`)
- **Status Colors**:
  - OPEN/PENDING: Amber
  - VERIFIED: Emerald
  - REJECTED: Rose
- **Dark Mode**: Full support with slate colors

### Icons Used
- `Eye`: View proof button
- `CheckCircle2`: Verified status
- `Clock`: Pending status
- `AlertCircle`: Attention/error
- `FileText`: Payment proof section
- `X`: Close button

### Animations
- Modal entry/exit: Smooth scale and opacity
- Backdrop: Blur effect with semi-transparent overlay
- Rejection input: Smooth height and opacity animation
- Button states: Opacity transitions on hover

## Data Flow Diagram

```
User Click "View Proof"
        ↓
Booking set to state
        ↓
Modal Opens with booking data
        ↓
API call: GET /bookings/:id/payment-proof/download
        ↓
Image/PDF displays
        ↓
User clicks Approve/Reject
        ↓
If Reject: Show reason input
        ↓
User provides rejection reason (if applicable)
        ↓
API call: PATCH /bookings/:id/verify-payment
        ↓
Success → Query cache invalidated
        ↓
Bookings refetch from server
        ↓
Modal closes, list updates
        ↓
User sees confirmation message
```

## Error Handling

### Image/PDF Load Failures
- **Error State**: Shows alert icon with message
- **Retry Button**: User can retry failed loads
- **Fallback**: Downloads file directly if iframe fails

### API Errors
- **Mutation Error**: Caught and displayed to user
- **Error Message**: Shows API response message or generic error
- **Console Log**: Error logged for debugging

### Validation Errors
- **Rejection Reason**: Minimum 10 characters required
- **Input Validation**: Character limit at 500
- **User Feedback**: Alert shown if validation fails

## Loading States

### Image/PDF Loading
- Spinner shown while proof loads
- Disabled button state during loading
- Loading text: "Approving..." / "Rejecting..."

### Mutation Loading
- Button text changes to indicate action
- Buttons disabled during mutation
- Modal remains open during request

## Performance Optimizations

1. **Query Caching**: React Query caches booking list
2. **Optimistic Updates**: Cache invalidated after successful mutations
3. **Lazy Loading**: Images/PDFs loaded only when modal opens
4. **Event Delegation**: Efficient event handling on button clicks
5. **Component Memoization**: Prevents unnecessary re-renders

## Accessibility Features

1. **Semantic HTML**: Proper button and form elements
2. **ARIA Labels**: Icons have descriptive labels
3. **Keyboard Navigation**: All buttons accessible via keyboard
4. **Focus Management**: Modal manages focus appropriately
5. **Color Contrast**: Meets WCAG AA standards
6. **Screen Reader Support**: Proper labeling and structure

## Browser Support

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support
- ❌ IE11: Not supported

## Testing Recommendations

### Unit Tests
- Component renders correctly
- Props validation
- State management
- Event handlers

### Integration Tests
- Modal opens/closes correctly
- API calls work as expected
- Query cache invalidated on success
- Error messages displayed correctly

### E2E Tests
- Complete approval workflow
- Complete rejection workflow
- Modal read-only modes
- Navigation between bookings

### Manual Testing Checklist
- [ ] Create booking with payment proof
- [ ] Open agency bookings page
- [ ] Click "View Proof" button
- [ ] Verify payment proof displays
- [ ] Test approve: Click "Approve" → Check booking status updated
- [ ] Test reject: Click "Reject" → Enter reason → Confirm → Check status
- [ ] Open verified proof (read-only mode)
- [ ] Verify buttons hidden in read-only mode
- [ ] Test error: Disconnect network during approval
- [ ] Test dark mode: Toggle and verify styling
- [ ] Test responsive: Check on mobile/tablet

## Future Enhancements

1. **Proof Annotations**: Highlight/mark up proof images
2. **Batch Operations**: Approve/reject multiple proofs at once
3. **Comments**: Add internal notes to proofs
4. **History**: View previous approval/rejection history
5. **Email Notifications**: Automated traveler notifications
6. **Templates**: Pre-set rejection reasons
7. **Analytics**: Track approval rates and times
8. **Integrations**: Connect to payment verification services

## Troubleshooting

### Modal won't open
- Check if `reviewingBooking` state is set correctly
- Verify booking has `paymentProof` data
- Check browser console for errors

### Image/PDF won't load
- Verify download endpoint URL is correct
- Check authentication token is valid
- Verify file exists on server
- Try retry button

### Approval/Rejection fails
- Check API endpoint availability
- Verify booking ID is correct
- Check error message in alert
- Review API response in network tab

### Stale data after update
- Check query cache invalidation in mutation
- Verify queryKey matches in useQuery
- Check browser network tab for refetch

## Implementation Date
February 9, 2026

## Status
✅ Complete and Ready for Testing
