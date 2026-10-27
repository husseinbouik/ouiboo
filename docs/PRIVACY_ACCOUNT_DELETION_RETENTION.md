# Account deletion — per-category retention table

Issue: #251 (Council Session #2, item B23). Implementation:
`UsersService.deleteUserAccount` (`DELETE /users/me`) in
`apps/api/src/users/users.service.ts`. This table is the authoritative
statement of what account deletion does to each data category; the code
comment on `deleteUserAccount` points here, and this table is the source
text for the corresponding section of the CNDP filing (data-subject
rights / erasure).

Deletion always covers **both** halves: the stored files in object
storage (Backblaze B2) and the database fields. Before this change the
endpoint only tombstoned database fields and deleted **no** stored
files at all.

## Deleted outright

| Category | What happens |
| --- | --- |
| Session / auth state | Refresh tokens, wishlist, notification preferences are hard-deleted. Password is replaced by a random tombstone; OTP and password-reset state cleared. |
| Admin break-glass credentials | Rows minted by the account (`BreakGlassCredential.createdById`) are hard-deleted so no live recovery secret survives the account. |
| Stored files — profile | Avatar image and agency logo objects are deleted from storage. |
| Stored files — verification dossiers | Travel-licence document and RC insurance certificate (private uploads) are deleted from storage. |
| Stored files — bank destination | Bank attestation file is deleted from storage. |
| Stored files — payment proofs | Proof images the traveller uploaded on their bookings (private objects) are deleted from storage. |
| Stored files — messages | Attachment objects on messages the user sent are deleted from storage. |
| Stored files — refund evidence | Evidence files the user recorded on refund cases are deleted from storage. |

## Scrubbed in place (personal fields nulled / replaced)

| Category | What happens | Why the row stays |
| --- | --- | --- |
| User account row | Email replaced by `deleted-{uuid}@privacy.invalid`; name, avatar, date of birth and age-attestation stamp nulled; MFA disabled with TOTP secret, recovery-code hashes and enrolment stamp cleared. | The row is the anchor for retained financial records below; it holds no identifying data after the scrub. |
| Agency profile | Company name replaced by "Deleted agency", ICE/patente/RIB tombstoned, bio, logo and bank details nulled, status REJECTED. Legal representative, trip emergency-contact name/phone nulled. Licence dossier fully reset (type, number, expiry, document key/name, verification and ministry-check stamps, rejection reason — status back to NOT_SUBMITTED). Insurance dossier fully reset (policy number, insured name, validity window, coverage limit, certificate key, verification stamp, rejection reason — status back to NOT_SUBMITTED; the third-party insurer name is retained as it is not the data subject's data). Bank destination reset (holder name, attestation URL, pending details nulled; verification stamps cleared; status UNVERIFIED). Trip templates archived. | Company identifiers (legal name, RC, tax ID) are retained only to interpret retained invoices; they identify the legal person, not an individual. |
| Bookings (as traveller) | Traveller-typed fields nulled: full name, phone number, payment-proof URL, cancellation reason. Payment-proof rows detached (`imageUrl` cleared; object deleted). | Bookings are the financial record of a contract between traveller and agency; see "Retained" below. |
| Messages sent | Content replaced by `[deleted by data subject request]`; attachment reference nulled (object deleted). | The row stays so the other participant keeps a coherent conversation shell; nothing of the sender's content remains. |
| Reviews authored | Comment text nulled; the star rating is retained. | Ratings feed aggregate scores; a bare number with no text and a tombstoned author is not identifying. The agency's response is the agency's own content and is untouched. |
| Refund evidence rows | `proofUrl` detached (object deleted); reference, amount and note retained. | Evidence rows are part of the refund case file — financial record, see below. |
| Notification log | Recipient email tombstoned; subject nulled; body replaced by the deletion marker. | Delivery audit trail; no personal content remains. |
| Audit log | Actor email nulled on rows where the user was the actor. | Audit rows are append-only accountability records; the actor id becomes an orphan reference to a tombstoned account. |

## Retained (not deleted, not anonymised beyond the scrubs above)

| Category | Retention basis |
| --- | --- |
| Bookings, external payments, payment plans, invoices and invoice lines, wallet ledger entries | Financial and accounting records the platform and the agencies must keep under Moroccan commercial/accounting obligations and for tax inspection. Amounts, dates, references and statuses are retained; the traveller's personal fields on them are scrubbed as above. Agency legal details snapshotted onto issued invoices are part of the invoice itself. |
| Refund cases | Dispute/chargeback evidence for the same financial-retention duty; the case file keeps amounts, references and the evidence-row metadata (with uploader files detached as above). |
| Trip templates and their photos | The agency's business assets, archived (not public) on deletion. Photos belong to the trip product, not to an individual's upload history; they are not deleted so an agency account restored after an erroneous deletion is not destroyed. |
| Terms-acceptance stamps (`termsVersion`, subscription terms version/accepted-at) | Contract evidence: which terms version was accepted and when. The stamps carry no identifying content beyond the (tombstoned) account id. |
| Email suppression list | Retained so a deleted account's address is not re-emailed by mistake if it is ever re-registered by someone else; keyed by address only. |

## Operational notes

- Storage deletion is best-effort per object and runs before the
  database scrub, so a storage outage never blocks erasure of the
  account itself. Failures are logged as a count only (never keys or
  file names) for ops follow-up on orphaned objects.
- Deletion is idempotent in effect: re-running it on a tombstoned
  account finds no live references and changes nothing further.
- This table must be updated in the same change as any new
  personal-data category or stored-file reference added to the schema.
