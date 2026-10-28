# Support Macros And Escalation Matrix

These are launch-safe response templates for traveller, agency, and
internal escalation.

**The support operation these macros assume (#419).** Support is a
solo, founder-run operation — there is no support team, no finance
team, and no in-app chat. One monitored inbox (configured per
deployment via `NEXT_PUBLIC_SUPPORT_EMAIL`; never hardcode an address
into a reply). Two lanes only:

- **Normal lane — email, response within 48 hours**
  (`NORMAL_SUPPORT_RESPONSE_HOURS = 48`). This is the target for every
  macro below unless it says otherwise.
- **Active-trip emergency — agency first, Ouiboo escalation.** The
  agency's emergency contact (on the booking's trip-contacts card) is
  the traveller's first call. Ouiboo is the escalation, monitored
  during active trip periods only, via the founder escalation number
  (phone / WhatsApp, `NEXT_PUBLIC_SUPPORT_PHONE`). **Never promise
  24/7 cover.**

**Money model the macros must not contradict.** Travellers pay the
agency directly (bank transfer + payment proof at launch); Ouiboo
never holds traveller money, and there is no wallet or payout flow —
the pre-#419 payout macros were removed from this document for that
reason. An accepted payment proof is **not** settlement: only the
agency's bank confirmation settles a booking. Refunds are paid by the
agency directly, tracked as a `RefundCase` with a 7-day initiation
SLA (`REFUND_SLA_DAYS = 7`).

**Localisation status (#446).** The macros in this document now exist
in English, French and Arabic. The English text is the working source;
the FR and AR versions below carry exactly the same facts — the
48-hour normal lane, the agency-first emergency lane, direct payment
to the agency, and the 7-day refund-initiation SLA — and must be kept
in step whenever an English macro changes. The traveller-facing
support *pages*, the help centre (`/help`) and the transactional email
system carry equivalent support copy in EN / FR / AR (locale files and
`apps/api/src/email/email-i18n.ts`, parity-tested). Do not send the
English text as if it were the localised version.

## Traveller Macros

### 1. Booking Received

Subject: Your Ouiboo booking was received

Hello {{traveler_name}},

We received your booking for `{{trip_title}}`.
To confirm your booking, please complete the bank transfer using the payment instructions shown at checkout and upload your payment proof from your booking page. You pay the agency directly — Ouiboo does not take or hold your payment.

Booking reference: `{{booking_id}}`

Regards,
Ouiboo Support

### 2. Payment Proof Under Review

Subject: Your payment proof is under review

Hello {{traveler_name}},

We received your payment proof for booking `{{booking_id}}`.
The agency reviews the proof against its bank account, and your booking is confirmed once the agency confirms the transfer arrived. Accepting the proof alone does not settle the booking — the agency's bank confirmation does.

We reply to support email within 48 hours; if you have heard nothing from the agency by then, reply to this email and we will chase it for you.

Regards,
Ouiboo Support

> Replaces the pre-#419 version, which promised review by "our finance
> team" "within 1 business day". There is no finance team and no
> 1-business-day promise in the #419 support operation.

### 3. Payment Confirmed

Subject: Your booking is confirmed

Hello {{traveler_name}},

Your payment for booking `{{booking_id}}` has been confirmed by the agency.
Your trip is now confirmed for `{{trip_title}}`.

Regards,
Ouiboo Support

### 4. Payment Rejected

Subject: Action needed for your booking payment

Hello {{traveler_name}},

The agency could not approve the payment proof for booking `{{booking_id}}`.

Reason: `{{rejection_reason}}`

Please upload a corrected payment proof or contact support if you need help.

Regards,
Ouiboo Support

### 5. Refund Case Opened

Subject: Your refund case is open

Hello {{traveler_name}},

A refund case has been opened for booking `{{booking_id}}`.
Your payment went directly to {{agency_name}}, so your refund comes from them too — Ouiboo never holds your money. The agency has until `{{due_date}}` (7 days) to initiate your refund, and we chase it for you if it slips. You can follow the refund status any time in your bookings.

Regards,
Ouiboo Support

### 6. Refund Initiated

Subject: Your refund has been initiated

Hello {{traveler_name}},

{{agency_name}} has initiated your refund of `{{amount}} MAD` for booking `{{booking_id}}`.
We will update you once the refund is completed with the agency's bank evidence.

Regards,
Ouiboo Support

> Corrected from the pre-#419 version, which said Ouiboo had initiated
> the refund. Ouiboo initiates nothing: the agency pays, Ouiboo tracks
> the case and chases it (see the refund-chase macros below).

### 7. Refund Completed

Subject: Your refund is complete

Hello {{traveler_name}},

Your refund for booking `{{booking_id}}` has been completed by {{agency_name}}.
If you do not see the funds yet, please allow for your bank processing time.

Regards,
Ouiboo Support

### 8. Service Problem (outage acknowledgement)

Subject: We are aware of a problem with Ouiboo

Hello {{traveler_name}},

We are aware of a problem affecting Ouiboo and we are working on it. We will update you by email when it is resolved.
If you are travelling today, your agency's emergency contact — on your booking's trip-contacts card — remains your first call.

Regards,
Ouiboo Support

## Agency Macros

### 1. Verification Pending

Hello {{agency_name}},

Your agency profile is under review.
We will notify you once verification is complete or if we need additional information.

Regards,
Ouiboo Team

### 2. Refund Chase (agency)

Folded in from `BETA_OPS_CHECKLIST.md` §5, template A — send or refresh
this chase for every overdue or near-due refund case in the daily
refund-chase pass:

> Subject: Refund overdue — booking `{{booking_id}}`
>
> Hello {{agency_name}}, the refund of {{amount}} MAD for booking
> `{{booking_id}}` was due on {{due_date}} and has not been initiated.
> Please initiate it today and send the bank reference; unresolved
> overdue refunds restrict new bookings on your account. — Ouiboo

### 3. Traveller Day-3 Refund Update

Folded in from `BETA_OPS_CHECKLIST.md` §5, template B — send on day 3
after `refundDueAt` with no initiation:

> Subject: Update on your refund — booking `{{booking_id}}`
>
> Hello {{traveler_name}}, your refund of {{amount}} MAD is still with
> {{agency_name}}, who pays refunds directly. It was due on {{due_date}};
> we have chased the agency today and will update you again by
> {{next_update_date}}. Your case stays open until the refund is
> completed with bank evidence. — Ouiboo Support

> The wallet/payout agency macros that used to sit here ("Payout
> Requested / Approved / Rejected", "the amount remains available in
> your wallet balance") were removed: there is no wallet or payout
> flow in the launch money model — agencies are paid directly by
> travellers.

## Traveller Macros — Français (#446)

### 1. Réservation reçue

Objet : Votre réservation Ouiboo a bien été reçue

Bonjour {{traveler_name}},

Nous avons bien reçu votre réservation pour « {{trip_title}} ».
Pour confirmer votre réservation, veuillez effectuer le virement bancaire en suivant les instructions de paiement affichées au moment du paiement et téléverser votre justificatif de paiement depuis votre page de réservation. Vous payez l'agence directement — Ouiboo ne reçoit ni ne détient votre paiement.

Référence de réservation : `{{booking_id}}`

Cordialement,
Assistance Ouiboo

### 2. Justificatif de paiement en cours d'examen

Objet : Votre justificatif de paiement est en cours d'examen

Bonjour {{traveler_name}},

Nous avons bien reçu votre justificatif de paiement pour la réservation `{{booking_id}}`.
L'agence examine le justificatif par rapport à son compte bancaire, et votre réservation est confirmée dès que l'agence confirme l'arrivée du virement. L'acceptation du justificatif seul ne règle pas la réservation — c'est la confirmation bancaire de l'agence qui la règle.

Nous répondons aux e-mails d'assistance sous 48 heures ; si vous n'avez aucune nouvelle de l'agence d'ici là, répondez à cet e-mail et nous la relancerons pour vous.

Cordialement,
Assistance Ouiboo

### 3. Paiement confirmé

Objet : Votre réservation est confirmée

Bonjour {{traveler_name}},

Votre paiement pour la réservation `{{booking_id}}` a été confirmé par l'agence.
Votre voyage est désormais confirmé pour « {{trip_title}} ».

Cordialement,
Assistance Ouiboo

### 4. Paiement rejeté

Objet : Action requise pour le paiement de votre réservation

Bonjour {{traveler_name}},

L'agence n'a pas pu approuver le justificatif de paiement de la réservation `{{booking_id}}`.

Motif : `{{rejection_reason}}`

Veuillez téléverser un justificatif de paiement corrigé ou contacter l'assistance si vous avez besoin d'aide.

Cordialement,
Assistance Ouiboo

### 5. Dossier de remboursement ouvert

Objet : Votre dossier de remboursement est ouvert

Bonjour {{traveler_name}},

Un dossier de remboursement a été ouvert pour la réservation `{{booking_id}}`.
Votre paiement est allé directement à {{agency_name}}, donc votre remboursement vient également d'elle — Ouiboo ne détient jamais votre argent. L'agence dispose d'un délai jusqu'au `{{due_date}}` (7 jours) pour initier votre remboursement, et nous la relançons pour vous en cas de retard. Vous pouvez suivre l'état de votre remboursement à tout moment dans vos réservations.

Cordialement,
Assistance Ouiboo

### 6. Remboursement initié

Objet : Votre remboursement a été initié

Bonjour {{traveler_name}},

{{agency_name}} a initié votre remboursement de `{{amount}} MAD` pour la réservation `{{booking_id}}`.
Nous vous tiendrons informé dès que le remboursement sera terminé avec la preuve bancaire de l'agence.

Cordialement,
Assistance Ouiboo

### 7. Remboursement terminé

Objet : Votre remboursement est terminé

Bonjour {{traveler_name}},

Votre remboursement pour la réservation `{{booking_id}}` a été effectué par {{agency_name}}.
Si les fonds ne sont pas encore visibles, veuillez tenir compte du délai de traitement de votre banque.

Cordialement,
Assistance Ouiboo

### 8. Problème de service (accusé de réception d'un incident)

Objet : Nous avons connaissance d'un problème sur Ouiboo

Bonjour {{traveler_name}},

Nous avons connaissance d'un problème affectant Ouiboo et nous travaillons à le résoudre. Nous vous tiendrons informé par e-mail dès qu'il sera résolu.
Si vous voyagez aujourd'hui, le contact d'urgence de votre agence — figurant sur la carte des contacts de votre réservation — reste votre premier appel.

Cordialement,
Assistance Ouiboo

## Agency Macros — Français (#446)

### 1. Vérification en attente

Bonjour {{agency_name}},

Le profil de votre agence est en cours d'examen.
Nous vous informerons dès que la vérification sera terminée ou si nous avons besoin d'informations supplémentaires.

Cordialement,
Équipe Ouiboo

### 2. Relance remboursement (agence)

> Objet : Remboursement en retard — réservation `{{booking_id}}`
>
> Bonjour {{agency_name}}, le remboursement de {{amount}} MAD pour la réservation
> `{{booking_id}}` était dû le {{due_date}} et n'a pas été initié.
> Veuillez l'initier aujourd'hui et envoyer la référence bancaire ; les
> remboursements en retard non résolus restreignent les nouvelles réservations
> sur votre compte. — Ouiboo

### 3. Information voyageur au jour 3 du remboursement

> Objet : Point sur votre remboursement — réservation `{{booking_id}}`
>
> Bonjour {{traveler_name}}, votre remboursement de {{amount}} MAD est toujours
> chez {{agency_name}}, qui paie les remboursements directement. Il était dû le
> {{due_date}} ; nous avons relancé l'agence aujourd'hui et nous vous tiendrons
> informé d'ici le {{next_update_date}}. Votre dossier reste ouvert jusqu'à ce
> que le remboursement soit terminé avec une preuve bancaire. — Assistance Ouiboo

## Traveller Macros — العربية (#446)

### 1. تم استلام الحجز

الموضوع: تم استلام حجزك على Ouiboo

مرحبًا {{traveler_name}}،

لقد استلمنا حجزك لرحلة «{{trip_title}}».
لتأكيد حجزك، يرجى إتمام التحويل البنكي باتباع تعليمات الدفع المعروضة عند الدفع ورفع إثبات الدفع من صفحة حجزك. تدفع للوكالة مباشرة — Ouiboo لا يتلقى دفعتك ولا يحتفظ بها.

مرجع الحجز: `{{booking_id}}`

مع التحيات،
دعم Ouiboo

### 2. إثبات الدفع قيد المراجعة

الموضوع: إثبات الدفع الخاص بك قيد المراجعة

مرحبًا {{traveler_name}}،

لقد استلمنا إثبات الدفع الخاص بك للحجز `{{booking_id}}`.
تراجع الوكالة الإثبات مقابل حسابها البنكي، ويتم تأكيد حجزك بمجرد تأكيد الوكالة وصول التحويل. قبول الإثبات وحده لا يعني تسوية الحجز — التأكيد البنكي من الوكالة هو الذي يسوّيه.

نرد على رسائل الدعم الإلكترونية خلال 48 ساعة؛ إذا لم تسمع من الوكالة بحلول ذلك الوقت، رد على هذا البريد وسنتابع الأمر معها نيابة عنك.

مع التحيات،
دعم Ouiboo

### 3. تم تأكيد الدفع

الموضوع: تم تأكيد حجزك

مرحبًا {{traveler_name}}،

لقد أكدت الوكالة دفعتك للحجز `{{booking_id}}`.
رحلتك مؤكدة الآن لرحلة «{{trip_title}}».

مع التحيات،
دعم Ouiboo

### 4. تم رفض الدفع

الموضوع: إجراء مطلوب لدفع حجزك

مرحبًا {{traveler_name}}،

لم تتمكن الوكالة من الموافقة على إثبات الدفع للحجز `{{booking_id}}`.

السبب: `{{rejection_reason}}`

يرجى رفع إثبات دفع مصحح أو الاتصال بالدعم إذا احتجت إلى مساعدة.

مع التحيات،
دعم Ouiboo

### 5. تم فتح ملف استرداد

الموضوع: ملف الاسترداد الخاص بك مفتوح

مرحبًا {{traveler_name}}،

تم فتح ملف استرداد للحجز `{{booking_id}}`.
ذهبت دفعتك مباشرة إلى {{agency_name}}، لذا يأتي استردادك منها أيضًا — Ouiboo لا يحتفظ بأموالك أبدًا. أمام الوكالة حتى `{{due_date}}` (7 أيام) لبدء الاسترداد، وسنتابعها نيابة عنك إذا تأخرت. يمكنك متابعة حالة الاسترداد في أي وقت في حجوزاتك.

مع التحيات،
دعم Ouiboo

### 6. تم بدء الاسترداد

الموضوع: تم بدء الاسترداد الخاص بك

مرحبًا {{traveler_name}}،

بدأت {{agency_name}} استردادك بمبلغ `{{amount}} MAD` للحجز `{{booking_id}}`.
سنعلمك بمجرد إتمام الاسترداد مع الدليل البنكي للوكالة.

مع التحيات،
دعم Ouiboo

### 7. اكتمل الاسترداد

الموضوع: اكتمل الاسترداد الخاص بك

مرحبًا {{traveler_name}}،

أتمت {{agency_name}} استردادك للحجز `{{booking_id}}`.
إذا لم ترَ الأموال بعد، يرجى مراعاة وقت معالجة بنكك.

مع التحيات،
دعم Ouiboo

### 8. مشكلة في الخدمة (إقرار بوجود مشكلة)

الموضوع: نحن على علم بوجود مشكلة في Ouiboo

مرحبًا {{traveler_name}}،

نحن على علم بوجود مشكلة تؤثر على Ouiboo ونعمل على حلها. سنعلمك عبر البريد الإلكتروني عند حلها.
إذا كنت مسافرًا اليوم، فإن جهة اتصال الطوارئ لدى وكالتك — الموجودة في بطاقة جهات اتصال حجزك — تظل اتصالك الأول.

مع التحيات،
دعم Ouiboo

## Agency Macros — العربية (#446)

### 1. التحقق قيد الانتظار

مرحبًا {{agency_name}}،

ملف وكالتك قيد المراجعة.
سنعلمك بمجرد اكتمال التحقق أو إذا احتجنا إلى معلومات إضافية.

مع التحيات،
فريق Ouiboo

### 2. متابعة الاسترداد (الوكالة)

> الموضوع: استرداد متأخر — الحجز `{{booking_id}}`
>
> مرحبًا {{agency_name}}، كان استرداد مبلغ {{amount}} MAD للحجز
> `{{booking_id}}` مستحقًا في {{due_date}} ولم يتم بدؤه.
> يرجى بدؤه اليوم وإرسال المرجع البنكي؛ فالمبالغ المستردة المتأخرة غير
> المحلولة تقيّد الحجوزات الجديدة على حسابك. — Ouiboo

### 3. تحديث المسافر في اليوم الثالث للاسترداد

> الموضوع: تحديث حول الاسترداد الخاص بك — الحجز `{{booking_id}}`
>
> مرحبًا {{traveler_name}}، ما زال استردادك بمبلغ {{amount}} MAD لدى
> {{agency_name}}، التي تدفع المبالغ المستردة مباشرة. كان مستحقًا في
> {{due_date}}؛ وقد تابعنا الأمر مع الوكالة اليوم وسنعلمك مجددًا بحلول
> {{next_update_date}}. يبقى ملفك مفتوحًا حتى يكتمل الاسترداد مع دليل
> بنكي. — دعم Ouiboo

## Escalation Matrix

Support is solo: the founder is the primary **and** only backup for
every row during the beta. There is no deputy — if the founder is
unreachable, an active-trip traveller's first call remains the agency's
emergency contact, per the #419 split.

### Finance / payment-proof issue

- Examples: unclear proof, missing transfer, amount mismatch
- Primary owner: `Founder`
- Backup owner: `Founder` (no deputy in the beta)
- Response target: `within 48 hours (normal lane)`; a proof dispute is
  frozen — neither confirmed nor rejected — while it is open
  (see `INCIDENT_CARD.md` card 4)

### Booking dispute

- Examples: traveller says they paid, booking still pending, wrong session claim
- Primary owner: `Founder`
- Backup owner: `Founder` (no deputy in the beta)
- Response target: `within 48 hours (normal lane)`; if the trip is
  active, the active-trip emergency lane applies instead

### Refund exception

- Examples: urgent refund, partial refund request, disputed refund
- Primary owner: `Founder`
- Backup owner: `Founder` (no deputy in the beta)
- Response target: `traveller answered within 48 hours (normal lane)`;
  overdue cases are chased with the agency the same day they are
  identified, in the daily refund-chase pass
  (`BETA_OPS_CHECKLIST.md` §5)

### Direct-payment exception

- Examples: agency bank details mismatch, refund transfer sent but not received, missing funds on a direct agency payment
- Primary owner: `Founder`
- Backup owner: `Founder` (no deputy in the beta)
- Response target: `within 48 hours (normal lane)`

> This row replaces the pre-#419 "Payout exception" row. There are no
> Ouiboo payouts to except: payments move traveller ↔ agency directly.

## Launch Support Coverage

The beta operation, filled in honestly — solo founder cover, no rota:

- Traveller support owner: `Founder`
- Proof review owner: `the agency reviews its own bookings' proofs; Founder handles disputes and chases`
- Agency support owner: `Founder`
- Technical incident owner: `Founder`
- Weekend or after-hours fallback: `Founder only — no separate cover. The 48-hour normal-lane target applies seven days a week; outside active trip periods there is no staffed after-hours service and no 24/7 promise. During an active trip, the agency's emergency contact is the traveller's first call and the Founder is the Ouiboo escalation.`

*Updated 2026-10-27 — Council Session #3 item P2-11 / Support F10 (#581).*
