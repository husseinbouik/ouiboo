-- Production query indexes for high-volume marketplace reads.
-- All indexes are created conditionally to keep the migration safe for partially patched databases.

CREATE INDEX IF NOT EXISTS "TripTemplate_agencyId_status_createdAt_idx" ON "TripTemplate" ("agencyId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "TripTemplate_status_featured_idx" ON "TripTemplate" ("status", "featured");
CREATE INDEX IF NOT EXISTS "TripTemplate_category_status_idx" ON "TripTemplate" ("category", "status");
CREATE INDEX IF NOT EXISTS "TripTemplate_createdAt_idx" ON "TripTemplate" ("createdAt");

CREATE INDEX IF NOT EXISTS "TripSession_templateId_status_startDate_idx" ON "TripSession" ("templateId", "status", "startDate");
CREATE INDEX IF NOT EXISTS "TripSession_status_startDate_idx" ON "TripSession" ("status", "startDate");

CREATE INDEX IF NOT EXISTS "Booking_travelerId_bookingDate_idx" ON "Booking" ("travelerId", "bookingDate");
CREATE INDEX IF NOT EXISTS "Booking_status_bookingDate_idx" ON "Booking" ("status", "bookingDate");
CREATE INDEX IF NOT EXISTS "Booking_paymentStatus_bookingDate_idx" ON "Booking" ("paymentStatus", "bookingDate");
CREATE INDEX IF NOT EXISTS "Booking_cancelledAt_idx" ON "Booking" ("cancelledAt");

CREATE INDEX IF NOT EXISTS "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction" ("walletId", "createdAt");

CREATE INDEX IF NOT EXISTS "PayoutRequest_agencyId_status_requestedAt_idx" ON "PayoutRequest" ("agencyId", "status", "requestedAt");
CREATE INDEX IF NOT EXISTS "PayoutRequest_status_requestedAt_idx" ON "PayoutRequest" ("status", "requestedAt");

CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog" ("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog" ("action", "createdAt");

CREATE INDEX IF NOT EXISTS "NotificationLog_userId_notificationType_sentAt_idx" ON "NotificationLog" ("userId", "notificationType", "sentAt");

CREATE INDEX IF NOT EXISTS "PaymentTransaction_provider_status_createdAt_idx" ON "PaymentTransaction" ("provider", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message" ("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_conversationId_isRead_idx" ON "Message" ("conversationId", "isRead");
