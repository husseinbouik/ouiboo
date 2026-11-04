-- #438 (Council P1-12): indexes backing the retention purge scans.
-- Expand-only: two non-unique B-tree indexes on the columns the purge
-- jobs filter by (Conversation.lastMessageAt, PaymentProof.uploadedAt).
-- No data change. Rollback: DROP INDEX "Conversation_lastMessageAt_idx";
-- DROP INDEX "PaymentProof_uploadedAt_idx";
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");
CREATE INDEX "PaymentProof_uploadedAt_idx" ON "PaymentProof"("uploadedAt");
