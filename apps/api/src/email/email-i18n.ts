// #424 (Council P0-22): transactional email copy in en/fr/ar.
//
// Every transactional template renders in the recipient's locale: the
// layout sets <html lang> (and dir="rtl" for Arabic) and all subjects,
// headings and body copy come from this table. The booking journey passes
// the traveller's checkout locale (persisted on the Booking at creation);
// recipients whose locale is not recorded keep the English default.
//
// Key parity across locales is enforced two ways: the FR/AR tables are
// typed as EmailStrings (compile time) and email-i18n.spec.ts walks the
// key sets (CI). Adding an English string without its FR/AR translations
// fails both.

export const EMAIL_LOCALES = ['en', 'fr', 'ar'] as const
export type EmailLocale = (typeof EMAIL_LOCALES)[number]

export const DEFAULT_EMAIL_LOCALE: EmailLocale = 'en'

export function normalizeEmailLocale(value?: string | null): EmailLocale {
  const base = value?.split('-')[0]?.toLowerCase()
  return (EMAIL_LOCALES as readonly string[]).includes(base ?? '')
    ? (base as EmailLocale)
    : DEFAULT_EMAIL_LOCALE
}

export function emailDirection(locale: EmailLocale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

/** Fill {{var}} placeholders in a copy template. Values are NOT escaped
 * here — callers pass the result through the escaping template helpers
 * (emailParagraph/emailHeading/…) exactly as before. */
export function fillEmailCopy(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  )
}

const en = {
  layout: {
    tagline: 'Travel made personal',
    serviceFooter: 'This is a service message from Ouiboo.',
    allRightsReserved: 'All rights reserved.',
    marketingReceivedBecause:
      'You are receiving this email because you subscribed to Ouiboo updates.',
    unsubscribe: 'Unsubscribe',
  },
  // Prevailing-language clause (Council P0-22): shown wherever binding
  // booking terms are presented. The French text prevails — French is
  // the language of Moroccan commercial law; flagged for counsel review.
  prevailingLanguage:
    'If there is any inconsistency between the language versions of these terms, the French version prevails.',
  otp: {
    subject: 'Ouiboo: Verify your email address',
    title: 'Verify your email address',
    heading: 'Verify your email address',
    preheader: 'Your Ouiboo verification code expires in 10 minutes.',
    intro: 'Use the verification code below to complete your signup and secure your account.',
    expiry:
      'This code expires in <strong>10 minutes</strong>. If it expires, request a new code from the app.',
    ignore: 'If you did not create an Ouiboo account, you can safely ignore this email.',
  },
  welcome: {
    subject: 'Welcome to Ouiboo',
    title: 'Welcome to Ouiboo',
    preheader: 'Your Ouiboo account is ready.',
    greetingWithName: 'Welcome to Ouiboo, {{name}}!',
    greeting: 'Welcome to Ouiboo!',
    bodyVerified: 'Your email is verified and your account is ready.',
    bodyExplore:
      'You can now explore trips, save favorites, and manage your bookings from one place.',
  },
  passwordReset: {
    subject: 'Ouiboo: Reset your password',
    title: 'Reset your password',
    heading: 'Reset your password',
    preheader: 'Use this secure link to reset your Ouiboo password.',
    intro: 'We received a request to reset your Ouiboo password.',
    button: 'Set a new password',
    panel:
      'This secure link expires in 60 minutes. If you did not request a password reset, ignore this email.',
  },
  bookingReceived: {
    subject: 'Ouiboo: Booking received — {{tripTitle}}',
    title: 'Booking received',
    preheader: 'We received your booking for {{tripTitle}}.',
    heading: 'We received your booking',
    body: 'Your booking for {{tripTitle}} has been received.',
    panelReference: 'Booking reference:',
    panelNextStep:
      'Next step: upload your payment proof from the booking dashboard so the agency can review it.',
  },
  bookingNewAgency: {
    subject: 'Ouiboo: New booking received',
    title: 'New booking received',
    preheader: 'A new booking was submitted for {{tripTitle}}.',
    heading: 'A new booking needs your attention',
    body: 'A traveler submitted a booking for {{tripTitle}}.',
    panelReference: 'Booking reference:',
    panelTraveler: 'Traveler:',
    panelReview: 'Review the booking and payment proof in your agency workspace.',
  },
  paymentConfirmation: {
    subject: 'Ouiboo: Booking confirmed — {{tripTitle}}',
    title: 'Booking confirmed',
    preheader: 'Your booking for {{tripTitle}} is confirmed.',
    heading: 'Your booking is confirmed',
    body: 'The agency verified your payment for {{tripTitle}}. Your reserved seats are now confirmed.',
    panel: 'Keep your booking details available and review the itinerary before departure.',
  },
  paymentReminder: {
    subject: 'Ouiboo: Payment reminder — {{tripTitle}}',
    title: 'Payment reminder',
    preheader: 'Payment for {{tripTitle}} is due soon.',
    heading: 'Your payment deadline is approaching',
    bodyOne:
      'Payment for {{tripTitle}} is due in 1 hour. Complete the payment step to keep your booking moving.',
    bodyOther:
      'Payment for {{tripTitle}} is due in {{hours}} hours. Complete the payment step to keep your booking moving.',
    panel: 'Uploading payment proof lets the agency review the transfer and confirm your seats.',
    button: 'Open booking dashboard',
    alreadyUploaded:
      'Already uploaded your proof? No action is needed while the agency reviews it.',
  },
  tripReminder: {
    subject: 'Ouiboo: Your trip starts soon — {{tripTitle}}',
    title: 'Upcoming trip reminder',
    preheader: '{{tripTitle}} starts {{timing}}.',
    heading: 'Your trip starts {{timing}}',
    timingOneWeek: 'one week',
    timingTomorrow: 'tomorrow',
    timingInDays: 'in {{days}} days',
    body: '{{tripTitle}}, organized by {{agencyName}}, is almost here.',
    panelTitle: 'Before you go',
    panelDocuments: 'Check your travel documents',
    panelWeather: 'Review the weather and packing list',
    panelItinerary: 'Confirm the itinerary and meeting point',
    panelContact: 'Save the agency contact details',
    button: 'View trip details',
    questions:
      'If you have questions, contact the agency through your Ouiboo booking dashboard.',
  },
  reviewRequest: {
    subject: 'Ouiboo: Share your review — {{tripTitle}}',
    title: 'Share your trip feedback',
    preheader: 'Tell other travelers about {{tripTitle}}.',
    heading: 'How was your trip with {{agencyName}}?',
    body: 'We hope you enjoyed {{tripTitle}}. Your feedback helps travelers make informed choices and helps agencies improve.',
    panelTitle: 'What to include',
    panelBody:
      'Share useful details about the guides, activities, organization, and overall experience.',
    button: 'Write a review',
    note: 'Your review will appear on the trip page after any required moderation.',
  },
  autoUnpaidCancellation: {
    subject: 'Ouiboo: Booking cancelled — {{tripTitle}}',
    title: 'Booking cancelled',
    preheader: 'Your booking for {{tripTitle}} was cancelled.',
    heading: 'Your booking was cancelled',
    body: 'The booking for {{tripTitle}} was automatically cancelled because payment was not completed within the required timeframe.',
    panelReference: 'Booking reference:',
    panelNoProof: 'No payment proof was received before the deadline.',
    closing:
      'If seats remain available, you can create a new booking. Contact support if you believe this cancellation is incorrect.',
  },
  subscriptionRenewal: {
    subject: 'Your Ouiboo subscription renews soon',
    title: 'Your Ouiboo subscription renews soon',
    preheader: 'Your subscription renews on {{renewalDate}}',
    heading: 'Your subscription renews soon',
    body: 'Hello {{companyName}}, your Ouiboo agency subscription renews on {{renewalDate}}. It renews automatically at your current plan price unless you cancel before that date.',
    bodyCancellation:
      'Cancellation takes effect at the end of the paid period, and your listings stay live until then. You can review your plan, renewal date, and the subscription terms on your billing page.',
    button: 'Review your subscription',
    panel: 'You are receiving this email because you have an active Ouiboo agency subscription.',
  },
  agencyVerificationPaused: {
    subject: 'Your OuiBoo verification has been paused',
    title: 'Your OuiBoo verification has been paused',
    preheader: 'A verification document has expired and needs renewal.',
    heading: 'Your OuiBoo verification has been paused',
    body: '{{reason}}. Until the expired document is renewed and re-verified, your agency cannot publish trips or accept new bookings. {{tripsLine}}Existing bookings are not affected and will run their course.',
    tripsLine:
      '{{count}} active trip(s) have been paused and are hidden from the marketplace until your verification is restored. ',
    renew: 'Renew your documents here: {{url}}',
  },
  refundActionRequired: {
    subject: 'Refund action required',
    title: 'Refund action required',
    preheader: 'A refund case needs your action in OuiBoo.',
    heading: 'Refund action required',
    body: 'A refund case for booking {{bookingId}} needs your action. Traveller payments are made directly to your agency, so the refund is processed by your agency — please review the case and initiate the refund before its deadline to avoid restrictions on new bookings.',
    dashboard: 'Open your refunds dashboard: {{url}}',
  },
  // #419 traveller notice, moved onto this table as the #424 follow-up:
  // an automatic refund case (minimum group not reached) has opened.
  refundCaseOpened: {
    subject: 'Your refund is on its way',
    title: 'Your refund is on its way',
    preheader: 'Your trip did not reach its minimum group size, so a refund case has been opened for you.',
    heading: 'Your refund is on its way',
    bodyWithTrip:
      'Your trip "{{tripTitle}}" did not reach the minimum group size, so it will not run as planned. A refund case has been opened for you automatically — you do not need to do anything.',
    body: 'Your trip did not reach the minimum group size, so it will not run as planned. A refund case has been opened for you automatically — you do not need to do anything.',
    amount:
      'Amount to be refunded: {{amount}} {{currency}}. Your payment went directly to {{agencyName}}, so the refund comes from them too — OuiBoo never holds your money.',
    agencyFallback: 'the agency',
    dueStatus:
      'The agency has until {{dueDate}} to complete your refund, and we chase it for you if it slips. You can follow the refund status any time in your bookings: {{url}}',
    status: 'You can follow the refund status any time in your bookings: {{url}}',
    support:
      'Questions? Email OuiBoo support at {{supportEmail}} — we reply within 48 hours. If the refund deadline passes without your money arriving, contact the same address and we will escalate it with the agency.',
  },
}

export type EmailStrings = typeof en

const fr: EmailStrings = {
  layout: {
    tagline: 'Le voyage rendu personnel',
    serviceFooter: 'Ceci est un message de service de Ouiboo.',
    allRightsReserved: 'Tous droits réservés.',
    marketingReceivedBecause:
      'Vous recevez cet e-mail car vous vous êtes abonné aux actualités de Ouiboo.',
    unsubscribe: 'Se désabonner',
  },
  prevailingLanguage:
    'En cas de divergence entre les versions linguistiques de ces conditions, la version française prévaut.',
  otp: {
    subject: 'Ouiboo : Vérifiez votre adresse e-mail',
    title: 'Vérifiez votre adresse e-mail',
    heading: 'Vérifiez votre adresse e-mail',
    preheader: 'Votre code de vérification Ouiboo expire dans 10 minutes.',
    intro:
      'Utilisez le code de vérification ci-dessous pour terminer votre inscription et sécuriser votre compte.',
    expiry:
      "Ce code expire dans <strong>10 minutes</strong>. S'il expire, demandez un nouveau code depuis l'application.",
    ignore:
      "Si vous n'avez pas créé de compte Ouiboo, vous pouvez ignorer cet e-mail en toute sécurité.",
  },
  welcome: {
    subject: 'Bienvenue chez Ouiboo',
    title: 'Bienvenue chez Ouiboo',
    preheader: 'Votre compte Ouiboo est prêt.',
    greetingWithName: 'Bienvenue chez Ouiboo, {{name}} !',
    greeting: 'Bienvenue chez Ouiboo !',
    bodyVerified: 'Votre adresse e-mail est vérifiée et votre compte est prêt.',
    bodyExplore:
      'Vous pouvez désormais explorer des voyages, enregistrer vos favoris et gérer vos réservations depuis un seul endroit.',
  },
  passwordReset: {
    subject: 'Ouiboo : Réinitialisez votre mot de passe',
    title: 'Réinitialisez votre mot de passe',
    heading: 'Réinitialisez votre mot de passe',
    preheader: 'Utilisez ce lien sécurisé pour réinitialiser votre mot de passe Ouiboo.',
    intro: 'Nous avons reçu une demande de réinitialisation de votre mot de passe Ouiboo.',
    button: 'Définir un nouveau mot de passe',
    panel:
      "Ce lien sécurisé expire dans 60 minutes. Si vous n'avez pas demandé de réinitialisation, ignorez cet e-mail.",
  },
  bookingReceived: {
    subject: 'Ouiboo : Réservation reçue — {{tripTitle}}',
    title: 'Réservation reçue',
    preheader: 'Nous avons bien reçu votre réservation pour {{tripTitle}}.',
    heading: 'Nous avons bien reçu votre réservation',
    body: 'Votre réservation pour {{tripTitle}} a bien été reçue.',
    panelReference: 'Référence de réservation :',
    panelNextStep:
      "Étape suivante : téléversez votre preuve de paiement depuis le tableau de bord de la réservation afin que l'agence puisse l'examiner.",
  },
  bookingNewAgency: {
    subject: 'Ouiboo : Nouvelle réservation reçue',
    title: 'Nouvelle réservation reçue',
    preheader: 'Une nouvelle réservation a été envoyée pour {{tripTitle}}.',
    heading: 'Une nouvelle réservation requiert votre attention',
    body: 'Un voyageur a envoyé une réservation pour {{tripTitle}}.',
    panelReference: 'Référence de réservation :',
    panelTraveler: 'Voyageur :',
    panelReview: 'Examinez la réservation et la preuve de paiement dans votre espace agence.',
  },
  paymentConfirmation: {
    subject: 'Ouiboo : Réservation confirmée — {{tripTitle}}',
    title: 'Réservation confirmée',
    preheader: 'Votre réservation pour {{tripTitle}} est confirmée.',
    heading: 'Votre réservation est confirmée',
    body: "L'agence a vérifié votre paiement pour {{tripTitle}}. Vos places réservées sont désormais confirmées.",
    panel: "Gardez les détails de votre réservation à portée de main et consultez l'itinéraire avant le départ.",
  },
  paymentReminder: {
    subject: 'Ouiboo : Rappel de paiement — {{tripTitle}}',
    title: 'Rappel de paiement',
    preheader: 'Le paiement pour {{tripTitle}} est bientôt dû.',
    heading: 'Votre échéance de paiement approche',
    bodyOne:
      "Le paiement pour {{tripTitle}} est dû dans 1 heure. Terminez l'étape de paiement pour faire avancer votre réservation.",
    bodyOther:
      "Le paiement pour {{tripTitle}} est dû dans {{hours}} heures. Terminez l'étape de paiement pour faire avancer votre réservation.",
    panel:
      "Le téléversement de votre preuve de paiement permet à l'agence d'examiner le virement et de confirmer vos places.",
    button: 'Ouvrir le tableau de bord de la réservation',
    alreadyUploaded:
      "Vous avez déjà téléversé votre preuve ? Aucune action n'est requise pendant que l'agence l'examine.",
  },
  tripReminder: {
    subject: 'Ouiboo : Votre voyage commence bientôt — {{tripTitle}}',
    title: 'Rappel de voyage à venir',
    preheader: '{{tripTitle}} commence {{timing}}.',
    heading: 'Votre voyage commence {{timing}}',
    timingOneWeek: 'dans une semaine',
    timingTomorrow: 'demain',
    timingInDays: 'dans {{days}} jours',
    body: '{{tripTitle}}, organisé par {{agencyName}}, approche à grands pas.',
    panelTitle: 'Avant de partir',
    panelDocuments: 'Vérifiez vos documents de voyage',
    panelWeather: 'Consultez la météo et la liste des affaires à emporter',
    panelItinerary: "Confirmez l'itinéraire et le point de rendez-vous",
    panelContact: 'Enregistrez les coordonnées de l\'agence',
    button: 'Voir les détails du voyage',
    questions:
      'Si vous avez des questions, contactez l\'agence via le tableau de bord de votre réservation Ouiboo.',
  },
  reviewRequest: {
    subject: 'Ouiboo : Partagez votre avis — {{tripTitle}}',
    title: 'Partagez votre retour sur le voyage',
    preheader: 'Parlez de {{tripTitle}} aux autres voyageurs.',
    heading: "Comment s'est passé votre voyage avec {{agencyName}} ?",
    body: "Nous espérons que vous avez apprécié {{tripTitle}}. Vos retours aident les voyageurs à faire des choix éclairés et les agences à s'améliorer.",
    panelTitle: 'Que mentionner',
    panelBody:
      "Partagez des détails utiles sur les guides, les activités, l'organisation et l'expérience globale.",
    button: 'Écrire un avis',
    note: "Votre avis apparaîtra sur la page du voyage après toute modération requise.",
  },
  autoUnpaidCancellation: {
    subject: 'Ouiboo : Réservation annulée — {{tripTitle}}',
    title: 'Réservation annulée',
    preheader: 'Votre réservation pour {{tripTitle}} a été annulée.',
    heading: 'Votre réservation a été annulée',
    body: "La réservation pour {{tripTitle}} a été annulée automatiquement car le paiement n'a pas été effectué dans le délai requis.",
    panelReference: 'Référence de réservation :',
    panelNoProof: "Aucune preuve de paiement n'a été reçue avant la date limite.",
    closing:
      "S'il reste des places disponibles, vous pouvez créer une nouvelle réservation. Contactez l'assistance si vous pensez que cette annulation est incorrecte.",
  },
  subscriptionRenewal: {
    subject: 'Votre abonnement Ouiboo se renouvelle bientôt',
    title: 'Votre abonnement Ouiboo se renouvelle bientôt',
    preheader: 'Votre abonnement se renouvelle le {{renewalDate}}',
    heading: 'Votre abonnement se renouvelle bientôt',
    body: 'Bonjour {{companyName}}, votre abonnement agence Ouiboo se renouvelle le {{renewalDate}}. Il se renouvelle automatiquement au prix actuel de votre formule, sauf annulation avant cette date.',
    bodyCancellation:
      "L'annulation prend effet à la fin de la période payée, et vos annonces restent en ligne jusque-là. Vous pouvez consulter votre formule, la date de renouvellement et les conditions d'abonnement sur votre page de facturation.",
    button: 'Consulter votre abonnement',
    panel: 'Vous recevez cet e-mail car vous avez un abonnement agence Ouiboo actif.',
  },
  agencyVerificationPaused: {
    subject: 'Votre vérification OuiBoo a été mise en pause',
    title: 'Votre vérification OuiBoo a été mise en pause',
    preheader: 'Un document de vérification a expiré et doit être renouvelé.',
    heading: 'Votre vérification OuiBoo a été mise en pause',
    body: "{{reason}}. Tant que le document expiré n'est pas renouvelé et revérifié, votre agence ne peut ni publier de voyages ni accepter de nouvelles réservations. {{tripsLine}}Les réservations existantes ne sont pas affectées et suivront leur cours.",
    tripsLine:
      "{{count}} voyage(s) actif(s) ont été mis en pause et masqués de la plateforme jusqu'à la restauration de votre vérification. ",
    renew: 'Renouvelez vos documents ici : {{url}}',
  },
  refundActionRequired: {
    subject: 'Action requise pour un remboursement',
    title: 'Action requise pour un remboursement',
    preheader: 'Un dossier de remboursement requiert votre action dans OuiBoo.',
    heading: 'Action requise pour un remboursement',
    body: "Un dossier de remboursement pour la réservation {{bookingId}} requiert votre action. Les paiements des voyageurs sont effectués directement à votre agence, le remboursement est donc traité par votre agence — veuillez examiner le dossier et initier le remboursement avant son échéance pour éviter des restrictions sur les nouvelles réservations.",
    dashboard: 'Ouvrez votre tableau de bord des remboursements : {{url}}',
  },
  refundCaseOpened: {
    subject: 'Votre remboursement est en route',
    title: 'Votre remboursement est en route',
    preheader: "Votre voyage n'a pas atteint la taille minimale de groupe, un dossier de remboursement a donc été ouvert pour vous.",
    heading: 'Votre remboursement est en route',
    bodyWithTrip:
      "Votre voyage « {{tripTitle}} » n'a pas atteint la taille minimale de groupe, il n'aura donc pas lieu comme prévu. Un dossier de remboursement a été ouvert automatiquement pour vous — vous n'avez rien à faire.",
    body: "Votre voyage n'a pas atteint la taille minimale de groupe, il n'aura donc pas lieu comme prévu. Un dossier de remboursement a été ouvert automatiquement pour vous — vous n'avez rien à faire.",
    amount:
      "Montant à rembourser : {{amount}} {{currency}}. Votre paiement a été effectué directement à {{agencyName}}, le remboursement viendra donc également de sa part — OuiBoo ne détient jamais votre argent.",
    agencyFallback: "l'agence",
    dueStatus:
      "L'agence a jusqu'au {{dueDate}} pour effectuer votre remboursement, et nous la relançons pour vous en cas de retard. Vous pouvez suivre l'état de votre remboursement à tout moment dans vos réservations : {{url}}",
    status:
      "Vous pouvez suivre l'état de votre remboursement à tout moment dans vos réservations : {{url}}",
    support:
      "Des questions ? Écrivez à l'assistance OuiBoo à {{supportEmail}} — nous répondons sous 48 heures. Si la date limite de remboursement passe sans que vous ayez reçu votre argent, contactez la même adresse et nous relancerons l'agence.",
  },
}

const ar: EmailStrings = {
  layout: {
    tagline: 'سفر مصمم على مقاسك',
    serviceFooter: 'هذه رسالة خدمة من Ouiboo.',
    allRightsReserved: 'جميع الحقوق محفوظة.',
    marketingReceivedBecause:
      'تتلقى هذا البريد لأنك اشتركت في تحديثات Ouiboo.',
    unsubscribe: 'إلغاء الاشتراك',
  },
  prevailingLanguage:
    'في حال وجود أي تعارض بين النسخ اللغوية لهذه الشروط، تسود النسخة الفرنسية.',
  otp: {
    subject: 'Ouiboo: تحقق من بريدك الإلكتروني',
    title: 'تحقق من بريدك الإلكتروني',
    heading: 'تحقق من بريدك الإلكتروني',
    preheader: 'ينتهي رمز التحقق الخاص بك في Ouiboo خلال 10 دقائق.',
    intro: 'استخدم رمز التحقق أدناه لإكمال التسجيل وتأمين حسابك.',
    expiry:
      'ينتهي هذا الرمز خلال <strong>10 دقائق</strong>. إذا انتهت صلاحيته، اطلب رمزاً جديداً من التطبيق.',
    ignore: 'إذا لم تنشئ حساباً في Ouiboo، يمكنك تجاهل هذا البريد بأمان.',
  },
  welcome: {
    subject: 'مرحباً بك في Ouiboo',
    title: 'مرحباً بك في Ouiboo',
    preheader: 'حسابك في Ouiboo جاهز.',
    greetingWithName: 'مرحباً بك في Ouiboo، {{name}}!',
    greeting: 'مرحباً بك في Ouiboo!',
    bodyVerified: 'تم التحقق من بريدك الإلكتروني وحسابك جاهز الآن.',
    bodyExplore: 'يمكنك الآن استكشاف الرحلات وحفظ المفضلة وإدارة حجوزاتك من مكان واحد.',
  },
  passwordReset: {
    subject: 'Ouiboo: إعادة تعيين كلمة المرور',
    title: 'إعادة تعيين كلمة المرور',
    heading: 'إعادة تعيين كلمة المرور',
    preheader: 'استخدم هذا الرابط الآمن لإعادة تعيين كلمة المرور الخاصة بك في Ouiboo.',
    intro: 'تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك في Ouiboo.',
    button: 'تعيين كلمة مرور جديدة',
    panel: 'ينتهي هذا الرابط الآمن خلال 60 دقيقة. إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذا البريد.',
  },
  bookingReceived: {
    subject: 'Ouiboo: تم استلام الحجز — {{tripTitle}}',
    title: 'تم استلام الحجز',
    preheader: 'لقد استلمنا حجزك لرحلة {{tripTitle}}.',
    heading: 'لقد استلمنا حجزك',
    body: 'تم استلام حجزك لرحلة {{tripTitle}}.',
    panelReference: 'مرجع الحجز:',
    panelNextStep: 'الخطوة التالية: ارفع إثبات الدفع من لوحة تحكم الحجز حتى تتمكن الوكالة من مراجعته.',
  },
  bookingNewAgency: {
    subject: 'Ouiboo: تم استلام حجز جديد',
    title: 'حجز جديد',
    preheader: 'تم إرسال حجز جديد لرحلة {{tripTitle}}.',
    heading: 'حجز جديد يحتاج إلى انتباهك',
    body: 'أرسل أحد المسافرين حجزاً لرحلة {{tripTitle}}.',
    panelReference: 'مرجع الحجز:',
    panelTraveler: 'المسافر:',
    panelReview: 'راجع الحجز وإثبات الدفع في مساحة عمل الوكالة الخاصة بك.',
  },
  paymentConfirmation: {
    subject: 'Ouiboo: تم تأكيد الحجز — {{tripTitle}}',
    title: 'تم تأكيد الحجز',
    preheader: 'تم تأكيد حجزك لرحلة {{tripTitle}}.',
    heading: 'تم تأكيد حجزك',
    body: 'تحققت الوكالة من دفعتك لرحلة {{tripTitle}}. أصبحت مقاعدك المحجوزة مؤكدة الآن.',
    panel: 'احتفظ بتفاصيل حجزك في متناول يدك وراجع خط سير الرحلة قبل المغادرة.',
  },
  paymentReminder: {
    subject: 'Ouiboo: تذكير بالدفع — {{tripTitle}}',
    title: 'تذكير بالدفع',
    preheader: 'دفع رحلة {{tripTitle}} مستحق قريباً.',
    heading: 'يقترب الموعد النهائي للدفع',
    bodyOne: 'يستحق دفع رحلة {{tripTitle}} خلال ساعة واحدة. أكمل خطوة الدفع للحفاظ على تقدم حجزك.',
    bodyOther: 'يستحق دفع رحلة {{tripTitle}} خلال {{hours}} ساعة. أكمل خطوة الدفع للحفاظ على تقدم حجزك.',
    panel: 'يتيح رفع إثبات الدفع للوكالة مراجعة التحويل وتأكيد مقاعدك.',
    button: 'فتح لوحة تحكم الحجز',
    alreadyUploaded: 'هل رفعت إثباتك بالفعل؟ لا حاجة لأي إجراء بينما تراجعه الوكالة.',
  },
  tripReminder: {
    subject: 'Ouiboo: رحلتك تبدأ قريباً — {{tripTitle}}',
    title: 'تذكير برحلة قادمة',
    preheader: 'تبدأ رحلة {{tripTitle}} {{timing}}.',
    heading: 'رحلتك تبدأ {{timing}}',
    timingOneWeek: 'بعد أسبوع',
    timingTomorrow: 'غداً',
    timingInDays: 'بعد {{days}} أيام',
    body: 'رحلة {{tripTitle}}، التي تنظمها {{agencyName}}، اقتربت.',
    panelTitle: 'قبل أن تذهب',
    panelDocuments: 'تحقق من وثائق سفرك',
    panelWeather: 'راجع حالة الطقس وقائمة الأمتعة',
    panelItinerary: 'أكد خط سير الرحلة ونقطة الالتقاء',
    panelContact: 'احفظ بيانات الاتصال بالوكالة',
    button: 'عرض تفاصيل الرحلة',
    questions: 'إذا كانت لديك أسئلة، تواصل مع الوكالة عبر لوحة تحكم حجزك في Ouiboo.',
  },
  reviewRequest: {
    subject: 'Ouiboo: شارك تقييمك — {{tripTitle}}',
    title: 'شارك انطباعك عن الرحلة',
    preheader: 'أخبر المسافرين الآخرين عن رحلة {{tripTitle}}.',
    heading: 'كيف كانت رحلتك مع {{agencyName}}؟',
    body: 'نأمل أن تكون قد استمتعت برحلة {{tripTitle}}. تساعد ملاحظاتك المسافرين على اتخاذ قرارات مدروسة وتساعد الوكالات على التحسين.',
    panelTitle: 'ماذا تذكر',
    panelBody: 'شارك تفاصيل مفيدة عن المرشدين والأنشطة والتنظيم والتجربة بشكل عام.',
    button: 'اكتب تقييماً',
    note: 'سيظهر تقييمك على صفحة الرحلة بعد أي مراجعة مطلوبة.',
  },
  autoUnpaidCancellation: {
    subject: 'Ouiboo: تم إلغاء الحجز — {{tripTitle}}',
    title: 'تم إلغاء الحجز',
    preheader: 'تم إلغاء حجزك لرحلة {{tripTitle}}.',
    heading: 'تم إلغاء حجزك',
    body: 'تم إلغاء حجز رحلة {{tripTitle}} تلقائياً لأن الدفع لم يكتمل ضمن المهلة المطلوبة.',
    panelReference: 'مرجع الحجز:',
    panelNoProof: 'لم يتم استلام أي إثبات دفع قبل الموعد النهائي.',
    closing: 'إذا كانت المقاعد لا تزال متاحة، يمكنك إنشاء حجز جديد. تواصل مع الدعم إذا كنت تعتقد أن هذا الإلغاء غير صحيح.',
  },
  subscriptionRenewal: {
    subject: 'اشتراكك في Ouiboo سيتجدد قريباً',
    title: 'اشتراكك في Ouiboo سيتجدد قريباً',
    preheader: 'يتجدد اشتراكك في {{renewalDate}}',
    heading: 'اشتراكك سيتجدد قريباً',
    body: 'مرحباً {{companyName}}، يتجدد اشتراك وكالتك في Ouiboo في {{renewalDate}}. يتجدد تلقائياً بسعر خطتك الحالية ما لم تلغه قبل ذلك التاريخ.',
    bodyCancellation: 'يسري الإلغاء في نهاية الفترة المدفوعة، وتبقى إعلاناتك منشورة حتى ذلك الحين. يمكنك مراجعة خطتك وتاريخ التجديد وشروط الاشتراك في صفحة الفوترة الخاصة بك.',
    button: 'مراجعة اشتراكك',
    panel: 'تتلقى هذا البريد لأن لديك اشتراك وكالة نشطاً في Ouiboo.',
  },
  agencyVerificationPaused: {
    subject: 'تم إيقاف التحقق من وكالتك في OuiBoo مؤقتاً',
    title: 'تم إيقاف التحقق من وكالتك في OuiBoo مؤقتاً',
    preheader: 'انتهت صلاحية وثيقة تحقق وتحتاج إلى التجديد.',
    heading: 'تم إيقاف التحقق من وكالتك مؤقتاً',
    body: '{{reason}}. حتى يتم تجديد الوثيقة المنتهية وإعادة التحقق منها، لا يمكن لوكالتك نشر الرحلات أو قبول حجوزات جديدة. {{tripsLine}}الحجوزات الحالية غير متأثرة وستستمر كالمعتاد.',
    tripsLine: 'تم إيقاف {{count}} رحلة نشطة مؤقتاً وإخفاؤها من المنصة حتى تتم استعادة التحقق الخاص بك. ',
    renew: 'جدّد وثائقك هنا: {{url}}',
  },
  refundActionRequired: {
    subject: 'يلزم اتخاذ إجراء بشأن استرداد',
    title: 'يلزم اتخاذ إجراء بشأن استرداد',
    preheader: 'تحتاج قضية استرداد إلى إجراء منك في OuiBoo.',
    heading: 'يلزم اتخاذ إجراء بشأن استرداد',
    body: 'تحتاج قضية استرداد للحجز {{bookingId}} إلى إجراء منك. تتم مدفوعات المسافرين مباشرة إلى وكالتك، لذا تتم معالجة الاسترداد من قبل وكالتك — يرجى مراجعة القضية وبدء الاسترداد قبل الموعد النهائي لتجنب قيود على الحجوزات الجديدة.',
    dashboard: 'افتح لوحة تحكم الاستردادات الخاصة بك: {{url}}',
  },
  refundCaseOpened: {
    subject: 'استردادك في الطريق إليك',
    title: 'استردادك في الطريق إليك',
    preheader: 'لم تصل رحلتك إلى الحد الأدنى لحجم المجموعة، لذا تم فتح قضية استرداد لك.',
    heading: 'استردادك في الطريق إليك',
    bodyWithTrip:
      'لم تصل رحلتك "{{tripTitle}}" إلى الحد الأدنى لحجم المجموعة، لذا لن تتم كما هو مخطط لها. تم فتح قضية استرداد لك تلقائياً — لست بحاجة إلى فعل أي شيء.',
    body: 'لم تصل رحلتك إلى الحد الأدنى لحجم المجموعة، لذا لن تتم كما هو مخطط لها. تم فتح قضية استرداد لك تلقائياً — لست بحاجة إلى فعل أي شيء.',
    amount:
      'المبلغ المسترد: {{amount}} {{currency}}. تم دفع مبلغك مباشرة إلى {{agencyName}}، لذا سيأتي الاسترداد منها أيضاً — لا تحتفظ OuiBoo بأموالك أبداً.',
    agencyFallback: 'الوكالة',
    dueStatus:
      'أمام الوكالة مهلة حتى {{dueDate}} لإتمام استردادك، وسنتابع الأمر نيابة عنك إذا تأخر. يمكنك متابعة حالة الاسترداد في أي وقت من حجوزاتك: {{url}}',
    status: 'يمكنك متابعة حالة الاسترداد في أي وقت من حجوزاتك: {{url}}',
    support:
      'أسئلة؟ راسل دعم OuiBoo على {{supportEmail}} — نرد خلال 48 ساعة. إذا مر الموعد النهائي للاسترداد دون وصول أموالك، تواصل مع نفس العنوان وسنصعّد الأمر مع الوكالة.',
  },
}

export const EMAIL_STRINGS: Record<EmailLocale, EmailStrings> = { en, fr, ar }

export function emailStrings(locale?: string | null): EmailStrings {
  return EMAIL_STRINGS[normalizeEmailLocale(locale)]
}
