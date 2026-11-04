-- #784 (Council S6 Phase 3): web push notifications.
-- Additive only (expand): one new column on NotificationPreference
-- (pushNotifications, defaults false = opt-in channel off) and one new
-- PushSubscription table (starts empty). No existing column, row, or
-- shape changes; no data preflight needed.
-- Rollback: DROP TABLE "PushSubscription";
-- ALTER TABLE "NotificationPreference" DROP COLUMN "pushNotifications";
-- after the application is rolled back. Dropping loses only push
-- subscription endpoints; notification history and preferences for the
-- other channels are untouched.

-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN "pushNotifications" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
