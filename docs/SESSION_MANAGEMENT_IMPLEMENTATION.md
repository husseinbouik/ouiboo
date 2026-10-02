# Calendar-Based Session Management Interface - Implementation Guide

## Overview

This implementation provides a comprehensive calendar-based session management interface for the agency dashboard's trip detail view. Users can now efficiently create, edit, and manage multiple trip sessions with an improved user experience.

## Features Implemented

### 1. **Bulk Session Creation Modal** (`BulkSessionCreationModal.tsx`)
- **Multi-session creation**: Create multiple sessions in a single operation
- **Date range picker**: Simple date input for start and end dates
- **Dynamic pricing**: Set per-person price and optional deposits
- **Flexible capacity**: Define total seats for each session
- **Add/Remove sessions**: Dynamically add or remove sessions from the batch
- **Validation**: Ensures all required fields are filled before submission
- **Responsive design**: Works seamlessly on desktop and mobile

**Props:**
```typescript
interface BulkSessionCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sessions: BulkSessionInput[]) => void;
  isLoading?: boolean;
  currency?: string; // defaults to 'MAD'
}
```

**Usage:**
```tsx
<BulkSessionCreationModal
  isOpen={showBulkSessionModal}
  onClose={() => setShowBulkSessionModal(false)}
  onSubmit={(sessions) => bulkCreateSessionMutation.mutate(sessions)}
  isLoading={bulkCreateSessionMutation.isPending}
  currency="MAD"
/>
```

### 2. **Session Status Badge** (`SessionStatusBadge.tsx`)
- **Visual status indicators**: Three distinct states (OPEN, FULL, CANCELLED)
- **Color-coded**: 
  - **OPEN**: Emerald/green (available for bookings)
  - **FULL**: Amber/yellow (no available seats)
  - **CANCELLED**: Red (session cancelled)
- **Customizable sizes**: sm, md, lg
- **Icon indicators**: Shows relevant icon for each status
- **Dark mode support**: Fully styled for dark theme

**Props:**
```typescript
interface SessionStatusBadgeProps {
  status: 'OPEN' | 'FULL' | 'CANCELLED';
  size?: 'sm' | 'md' | 'lg';
}
```

### 3. **Session Calendar View** (`SessionCalendarView.tsx`)
- **Dual view modes**: List view (default) and calendar view
- **Sortable sessions**: Automatic sorting by start date
- **Month navigation**: Calendar view with prev/next month controls
- **Session cards**: Display comprehensive session information
- **Occupancy visualization**: 
  - Real-time occupancy percentage
  - Visual progress bar (red >80%, amber 50-80%, green <50%)
- **Expandable details**: Click to see additional session information
- **Edit/Delete actions**: Hover-revealed action buttons
- **Empty states**: User-friendly messages when no sessions exist

**Props:**
```typescript
interface SessionCalendarViewProps {
  sessions: Session[];
  onEdit: (session: Session) => void;
  onDelete: (session: Session) => void;
  isLoading?: boolean;
  viewMode?: 'list' | 'calendar';
}
```

### 4. **Edit Session Modal** (`EditSessionModal.tsx`)
- **Session editing**: Modify dates, prices, deposits, and status
- **Status management**: Change session status (OPEN/FULL/CANCELLED)
- **Cancellation reasons**: Add reason when cancelling a session
- **Read-only fields**: Total seats cannot be modified (must delete and recreate)
- **Validation**: Ensures data consistency

**Props:**
```typescript
interface EditSessionModalProps {
  isOpen: boolean;
  session?: Session;
  onClose: () => void;
  onSubmit: (data: Partial<Session>) => void;
  isLoading?: boolean;
  isDelete?: boolean;
  onDelete?: () => void;
}
```

### 5. **Enhanced Trip Detail Page** (`[id]/page.tsx`)

#### New Features:
1. **Bulk Session Creation Button**: 
   - Opens modal for creating multiple sessions at once
   - Replaces the old single-session form

2. **View Mode Toggle**:
   - Switch between list and calendar views
   - Persistent state during session
   - Icon buttons for quick switching

3. **Integrated Session Management**:
   - Edit sessions inline through modal
   - Delete sessions with confirmation
   - Real-time updates via React Query

4. **Enhanced Mutations**:
   - `bulkCreateSessionMutation`: Handle multiple session creation
   - `editSessionMutation`: Edit existing sessions
   - `deleteSessionMutation`: Delete individual sessions
   - All with proper loading states and error handling

#### Integration Points:

**API Endpoints Used:**
- `POST /trips/:id/sessions` - Create single session (used by bulk generator)
- `PATCH /trips/:id/sessions/:sessionId` - Update session
- `DELETE /trips/:id/sessions/:sessionId` - Delete session
- `GET /trips/:id` - Fetch trip with sessions (existing)

**State Management:**
```tsx
const [showBulkSessionModal, setShowBulkSessionModal] = useState(false);
const [editingSession, setEditingSession] = useState<any>(null);
const [deletingSession, setDeletingSession] = useState<any>(null);
const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
```

## Component Hierarchy

```
TripDetailPage
├── Trip Overview Card
└── Session Management
    ├── BulkSessionCreationModal
    ├── EditSessionModal
    ├── DeleteConfirmation
    └── SessionCalendarView
        └── SessionCard (repeated)
            ├── SessionStatusBadge
            └── Expandable Details
```

## Data Models

### Session Interface
```typescript
interface Session {
  id: string;
  startDate: string;
  endDate: string;
  price: number;
  deposit: number;
  totalSeats: number;
  availableSeats: number;
  status: 'OPEN' | 'FULL' | 'CANCELLED';
  currency: string;
  cancellationReason?: string | null;
  bookings?: any[];
}
```

### Bulk Session Input
```typescript
interface BulkSessionInput {
  id: string;
  startDate: string;
  endDate: string;
  price: number;
  deposit?: number;
  totalSeats: number;
  currency: string;
}
```

## Styling & Design

### Design System
- **Color scheme**: Integrates with existing Ouiboo design system
- **Dark mode**: Full dark mode support via Tailwind CSS
- **Animations**: Smooth transitions using Framer Motion
- **Icons**: Lucide React icons throughout
- **Typography**: Consistent with agency dashboard

### Key Classes
- **Deep Blue**: `text-deep-blue` - Primary text color
- **Sunset Orange**: `text-sunset-orange` - Accent color
- **Status colors**:
  - OPEN: Emerald (`text-emerald-600`)
  - FULL: Amber (`text-amber-600`)
  - CANCELLED: Red (`text-red-600`)

## User Workflows

### Creating Multiple Sessions
1. Click "Bulk Create Sessions" button
2. Modal opens with one empty session
3. Fill in date range, price, deposit, and seat count
4. Click "Add Another Session" to add more
5. Remove unwanted sessions with trash icon
6. Click "Create X Sessions" to submit
7. Sessions appear in the list view

### Editing a Session
1. Hover over session card
2. Click the edit (pencil) icon
3. Modal opens with current session data
4. Modify desired fields
5. Click "Save Changes"
6. Session updates in real-time

### Deleting a Session
1. Hover over session card
2. Click the delete (trash) icon
3. Confirmation dialog appears
4. Click "Delete Session" to confirm
5. Session removed from list

### Switching Views
1. Use toggle buttons in the toolbar
2. List view (default): Shows all sessions sorted by date
3. Calendar view: Shows sessions grouped by month with navigation

## API Integration

### Bulk Session Creation
The component calls the existing `POST /trips/:id/sessions` endpoint multiple times:

```typescript
const bulkCreateSessionMutation = useMutation({
  mutationFn: async (sessions: any[]) => {
    const results = await Promise.all(
      sessions.map(session =>
        apiClient.post(`/trips/${params.id}/sessions`, {
          startDate: session.startDate,
          endDate: session.endDate,
          price: session.price,
          deposit: session.deposit || 0,
          totalSeats: session.totalSeats,
          currency: session.currency
        })
      )
    );
    return results;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['trip', params.id] });
    setShowBulkSessionModal(false);
  }
});
```

### Expected API Response
```json
{
  "id": "session_uuid",
  "templateId": "trip_uuid",
  "startDate": "2024-03-15T00:00:00Z",
  "endDate": "2024-03-20T00:00:00Z",
  "price": 2500,
  "deposit": 500,
  "totalSeats": 20,
  "availableSeats": 20,
  "status": "OPEN",
  "currency": "MAD",
  "cancellationReason": null,
  "createdAt": "2024-02-09T10:30:00Z",
  "updatedAt": "2024-02-09T10:30:00Z"
}
```

## Performance Optimizations

1. **Query Caching**: React Query caches trip data and sessions
2. **Optimistic Updates**: Mutations invalidate trip query for fresh data
3. **Lazy Rendering**: Session cards render only visible sessions
4. **Event Delegation**: Uses button click events with stopPropagation
5. **Memoization**: Components optimized to prevent unnecessary re-renders

## Accessibility Features

1. **ARIA Labels**: Proper labeling on form inputs
2. **Keyboard Navigation**: All buttons accessible via keyboard
3. **Focus Management**: Modals manage focus appropriately
4. **Color Contrast**: Meets WCAG AA standards
5. **Screen Reader Support**: Semantic HTML and aria-labels

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- IE11: ❌ Not supported (uses modern JavaScript)

## Future Enhancements

1. **Bulk Import**: CSV/Excel import for sessions
2. **Recurring Sessions**: Template-based recurring session creation
3. **Price Rules**: Dynamic pricing based on booking date
4. **Availability Sync**: Connect to external calendars
5. **Email Notifications**: Notify travelers of session updates
6. **Session Templates**: Save and reuse session configurations
7. **Analytics**: Session performance metrics and trends

## Troubleshooting

### Sessions not appearing
1. Check API response in network tab
2. Verify trip ID in URL
3. Clear browser cache and reload
4. Check React Query DevTools

### Modal not closing
1. Check for JavaScript errors in console
2. Verify onClose callback is properly connected
3. Check z-index stacking context

### Mutations failing
1. Verify authentication token is valid
2. Check API endpoint accessibility
3. Validate request payload format
4. Check for CORS issues (if cross-origin)

## Files Modified/Created

**Created:**
- `src/components/BulkSessionCreationModal.tsx`
- `src/components/SessionStatusBadge.tsx`
- `src/components/SessionCalendarView.tsx`
- `src/components/EditSessionModal.tsx`

**Modified:**
- `src/app/dashboard/trips/[id]/page.tsx`

## Testing Recommendations

### Unit Tests
- Test each component in isolation
- Mock API responses
- Test edge cases (empty sessions, max sessions, etc.)

### Integration Tests
- Test full session creation flow
- Test edit/delete operations
- Test view mode switching
- Test error handling

### E2E Tests
- Create sessions through UI
- Edit and delete sessions
- Switch between views
- Test with different data scenarios

## Deployment Notes

1. Ensure all components are properly imported
2. Update API endpoint documentation
3. Test with production data
4. Monitor network requests
5. Collect user feedback for iterations
6. Plan for scaling (large number of sessions)

---

**Implementation Date:** February 9, 2026
**Developed by:** GitHub Copilot Assistant
**Status:** Complete and Ready for Testing
