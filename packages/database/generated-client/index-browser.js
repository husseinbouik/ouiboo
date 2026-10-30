
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  password: 'password',
  role: 'role',
  avatar: 'avatar',
  isEmailVerified: 'isEmailVerified',
  otp: 'otp',
  otpExpiresAt: 'otpExpiresAt',
  otpLastSentAt: 'otpLastSentAt',
  passwordResetTokenHash: 'passwordResetTokenHash',
  passwordResetExpiresAt: 'passwordResetExpiresAt',
  passwordResetSentAt: 'passwordResetSentAt',
  mfaEnabled: 'mfaEnabled',
  mfaTotpSecret: 'mfaTotpSecret',
  mfaRecoveryCodeHashes: 'mfaRecoveryCodeHashes',
  mfaEnrolledAt: 'mfaEnrolledAt',
  mfaTotpLastAcceptedStep: 'mfaTotpLastAcceptedStep',
  displayCurrency: 'displayCurrency',
  dateOfBirth: 'dateOfBirth',
  ageAttestedAt: 'ageAttestedAt',
  termsVersion: 'termsVersion',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RefreshTokenScalarFieldEnum = {
  id: 'id',
  tokenHash: 'tokenHash',
  userId: 'userId',
  createdAt: 'createdAt',
  expiresAt: 'expiresAt',
  revokedAt: 'revokedAt',
  replacedByTokenId: 'replacedByTokenId'
};

exports.Prisma.BreakGlassCredentialScalarFieldEnum = {
  id: 'id',
  label: 'label',
  secretHash: 'secretHash',
  createdById: 'createdById',
  createdAt: 'createdAt',
  expiresAt: 'expiresAt',
  usedAt: 'usedAt',
  usedByEmail: 'usedByEmail',
  revokedAt: 'revokedAt'
};

exports.Prisma.AgencyProfileScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  companyName: 'companyName',
  ice: 'ice',
  patente: 'patente',
  rib: 'rib',
  verificationStatus: 'verificationStatus',
  bio: 'bio',
  logo: 'logo',
  subscriptionStatus: 'subscriptionStatus',
  trialEndsAt: 'trialEndsAt',
  subscriptionEndsAt: 'subscriptionEndsAt',
  bankDetails: 'bankDetails',
  pendingBankDetails: 'pendingBankDetails',
  bankAccountHolderName: 'bankAccountHolderName',
  bankAttestationUrl: 'bankAttestationUrl',
  bankDetailsStatus: 'bankDetailsStatus',
  bankDetailsVerifiedAt: 'bankDetailsVerifiedAt',
  bankDetailsVerifiedBy: 'bankDetailsVerifiedBy',
  bankDetailsRejectionReason: 'bankDetailsRejectionReason',
  subscriptionTermsVersion: 'subscriptionTermsVersion',
  subscriptionTermsAcceptedAt: 'subscriptionTermsAcceptedAt',
  renewalReminderSentFor: 'renewalReminderSentFor',
  cancelAtPeriodEnd: 'cancelAtPeriodEnd',
  cancellationRequestedAt: 'cancellationRequestedAt',
  legalName: 'legalName',
  rc: 'rc',
  taxId: 'taxId',
  legalRepresentative: 'legalRepresentative',
  businessAddress: 'businessAddress',
  travelLicenceType: 'travelLicenceType',
  travelLicenceNumber: 'travelLicenceNumber',
  travelLicenceStatus: 'travelLicenceStatus',
  licenceVerifiedAt: 'licenceVerifiedAt',
  licenceExpiry: 'licenceExpiry',
  licenceIssuedAt: 'licenceIssuedAt',
  licenceIssuingAuthority: 'licenceIssuingAuthority',
  licenceRejectionReason: 'licenceRejectionReason',
  licenceDocumentKey: 'licenceDocumentKey',
  licenceDocumentName: 'licenceDocumentName',
  licenceMinistryCheckedAt: 'licenceMinistryCheckedAt',
  licenceMinistryCheckedBy: 'licenceMinistryCheckedBy',
  insuranceStatus: 'insuranceStatus',
  insuranceInsurer: 'insuranceInsurer',
  insurancePolicyNumber: 'insurancePolicyNumber',
  insuranceInsuredName: 'insuranceInsuredName',
  insuranceValidFrom: 'insuranceValidFrom',
  insuranceExpiry: 'insuranceExpiry',
  insuranceCoverageLimit: 'insuranceCoverageLimit',
  insuranceCertificateKey: 'insuranceCertificateKey',
  insuranceVerifiedAt: 'insuranceVerifiedAt',
  insuranceRejectionReason: 'insuranceRejectionReason',
  verificationPausedAt: 'verificationPausedAt',
  verificationPauseReason: 'verificationPauseReason',
  newBookingsRestrictedAt: 'newBookingsRestrictedAt',
  newBookingsRestrictionReason: 'newBookingsRestrictionReason',
  emergencyContactName: 'emergencyContactName',
  emergencyContactPhone: 'emergencyContactPhone'
};

exports.Prisma.TripTemplateScalarFieldEnum = {
  id: 'id',
  agencyId: 'agencyId',
  title: 'title',
  description: 'description',
  category: 'category',
  startLocation: 'startLocation',
  destinationSlug: 'destinationSlug',
  meetingPoint: 'meetingPoint',
  endLocation: 'endLocation',
  durationDays: 'durationDays',
  durationNights: 'durationNights',
  inclusions: 'inclusions',
  exclusions: 'exclusions',
  checklist: 'checklist',
  images: 'images',
  imageAlts: 'imageAlts',
  status: 'status',
  featured: 'featured',
  currency: 'currency',
  averageRating: 'averageRating',
  reviewCount: 'reviewCount',
  lastReviewDate: 'lastReviewDate',
  startingPrice: 'startingPrice',
  cancellationPolicy: 'cancellationPolicy',
  translations: 'translations',
  minBookings: 'minBookings',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ItineraryDayScalarFieldEnum = {
  id: 'id',
  templateId: 'templateId',
  dayNumber: 'dayNumber',
  title: 'title',
  description: 'description',
  activities: 'activities',
  distanceKm: 'distanceKm',
  driveTimeMinutes: 'driveTimeMinutes',
  mealsIncluded: 'mealsIncluded',
  accommodationName: 'accommodationName',
  accommodationType: 'accommodationType'
};

exports.Prisma.TripSessionScalarFieldEnum = {
  id: 'id',
  templateId: 'templateId',
  agencyId: 'agencyId',
  startDate: 'startDate',
  endDate: 'endDate',
  price: 'price',
  deposit: 'deposit',
  totalSeats: 'totalSeats',
  availableSeats: 'availableSeats',
  status: 'status',
  currency: 'currency',
  cancellationReason: 'cancellationReason',
  minBookings: 'minBookings',
  confirmationDeadline: 'confirmationDeadline',
  groupStatus: 'groupStatus',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BookingScalarFieldEnum = {
  id: 'id',
  sessionId: 'sessionId',
  agencyId: 'agencyId',
  travelerId: 'travelerId',
  bookingDate: 'bookingDate',
  status: 'status',
  totalAmount: 'totalAmount',
  currency: 'currency',
  guestsCount: 'guestsCount',
  fullName: 'fullName',
  phoneNumber: 'phoneNumber',
  locale: 'locale',
  termsVersion: 'termsVersion',
  termsAcceptedAt: 'termsAcceptedAt',
  idempotencyKey: 'idempotencyKey',
  idempotencyPayloadHash: 'idempotencyPayloadHash',
  paymentProofUrl: 'paymentProofUrl',
  paymentProofId: 'paymentProofId',
  paymentMethod: 'paymentMethod',
  paymentGatewayTransactionId: 'paymentGatewayTransactionId',
  paymentGatewayMetadata: 'paymentGatewayMetadata',
  paymentStatus: 'paymentStatus',
  lastReminderSentAt: 'lastReminderSentAt',
  notificationsSent: 'notificationsSent',
  cancelledAt: 'cancelledAt',
  cancelledBy: 'cancelledBy',
  cancellationReason: 'cancellationReason',
  confirmedAt: 'confirmedAt',
  attendance: 'attendance',
  attendanceRecordedAt: 'attendanceRecordedAt',
  attendanceRecordedBy: 'attendanceRecordedBy',
  cancellationScale: 'cancellationScale',
  refundAmount: 'refundAmount',
  refundStatus: 'refundStatus',
  refundProcessedAt: 'refundProcessedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentProofScalarFieldEnum = {
  id: 'id',
  bookingId: 'bookingId',
  imageUrl: 'imageUrl',
  uploadedAt: 'uploadedAt',
  rejectionReason: 'rejectionReason',
  status: 'status',
  idempotencyKey: 'idempotencyKey',
  idempotencyPayloadHash: 'idempotencyPayloadHash'
};

exports.Prisma.ExternalPaymentScalarFieldEnum = {
  id: 'id',
  bookingId: 'bookingId',
  agencyId: 'agencyId',
  travelerId: 'travelerId',
  amount: 'amount',
  currency: 'currency',
  method: 'method',
  provider: 'provider',
  externalReference: 'externalReference',
  custodian: 'custodian',
  status: 'status',
  verifiedAt: 'verifiedAt',
  confirmedAmount: 'confirmedAmount',
  bankReference: 'bankReference',
  bankConfirmedAt: 'bankConfirmedAt',
  bankConfirmedBy: 'bankConfirmedBy',
  stage: 'stage',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BookingPaymentPlanScalarFieldEnum = {
  id: 'id',
  bookingId: 'bookingId',
  sessionId: 'sessionId',
  agencyId: 'agencyId',
  totalAmount: 'totalAmount',
  depositAmount: 'depositAmount',
  balanceAmount: 'balanceAmount',
  currency: 'currency',
  minimumParticipants: 'minimumParticipants',
  confirmationDeadline: 'confirmationDeadline',
  balanceDueAt: 'balanceDueAt',
  groupConfirmedAt: 'groupConfirmedAt',
  status: 'status',
  paymentPolicyVersion: 'paymentPolicyVersion',
  refundPolicyVersion: 'refundPolicyVersion',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RefundCaseScalarFieldEnum = {
  id: 'id',
  bookingId: 'bookingId',
  travelerId: 'travelerId',
  agencyId: 'agencyId',
  originalPaymentId: 'originalPaymentId',
  externalPaymentReference: 'externalPaymentReference',
  requestedAmount: 'requestedAmount',
  approvedAmount: 'approvedAmount',
  currency: 'currency',
  reason: 'reason',
  eligibilityRule: 'eligibilityRule',
  policyVersion: 'policyVersion',
  status: 'status',
  requestedAt: 'requestedAt',
  approvedAt: 'approvedAt',
  agencyNotifiedAt: 'agencyNotifiedAt',
  travelerNotifiedAt: 'travelerNotifiedAt',
  refundDueAt: 'refundDueAt',
  initiatedAt: 'initiatedAt',
  completedAt: 'completedAt',
  providerRefundId: 'providerRefundId',
  providerStatus: 'providerStatus',
  failureReason: 'failureReason',
  disputeReason: 'disputeReason',
  completionTier: 'completionTier',
  travellerConfirmedAt: 'travellerConfirmedAt',
  disputedAt: 'disputedAt',
  auditRequired: 'auditRequired',
  auditedAt: 'auditedAt',
  auditedBy: 'auditedBy',
  dedupeKey: 'dedupeKey',
  createdBy: 'createdBy',
  updatedBy: 'updatedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DuplicateCreditFlagScalarFieldEnum = {
  id: 'id',
  bookingId: 'bookingId',
  externalPaymentId: 'externalPaymentId',
  agencyId: 'agencyId',
  reportedBy: 'reportedBy',
  amount: 'amount',
  currency: 'currency',
  bankReference: 'bankReference',
  note: 'note',
  status: 'status',
  resolvedBy: 'resolvedBy',
  resolvedAt: 'resolvedAt',
  resolutionNote: 'resolutionNote',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RefundEvidenceScalarFieldEnum = {
  id: 'id',
  refundCaseId: 'refundCaseId',
  tier: 'tier',
  source: 'source',
  reference: 'reference',
  proofUrl: 'proofUrl',
  amount: 'amount',
  note: 'note',
  recordedBy: 'recordedBy',
  createdAt: 'createdAt'
};

exports.Prisma.PaymentStatusLedgerEntryScalarFieldEnum = {
  id: 'id',
  externalPaymentId: 'externalPaymentId',
  bookingId: 'bookingId',
  agencyId: 'agencyId',
  travelerId: 'travelerId',
  type: 'type',
  amount: 'amount',
  currency: 'currency',
  custodian: 'custodian',
  provider: 'provider',
  externalTransactionId: 'externalTransactionId',
  status: 'status',
  source: 'source',
  idempotencyKey: 'idempotencyKey',
  correlationId: 'correlationId',
  occurredAt: 'occurredAt',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  actorId: 'actorId',
  actorEmail: 'actorEmail',
  action: 'action',
  targetType: 'targetType',
  targetId: 'targetId',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.SearchEventScalarFieldEnum = {
  id: 'id',
  query: 'query',
  filters: 'filters',
  resultCount: 'resultCount',
  createdAt: 'createdAt'
};

exports.Prisma.ReviewScalarFieldEnum = {
  id: 'id',
  bookingId: 'bookingId',
  agencyId: 'agencyId',
  travelerId: 'travelerId',
  tripTemplateId: 'tripTemplateId',
  rating: 'rating',
  comment: 'comment',
  response: 'response',
  isVerifiedBooking: 'isVerifiedBooking',
  status: 'status',
  editCount: 'editCount',
  moderatedById: 'moderatedById',
  moderatedAt: 'moderatedAt',
  moderationReason: 'moderationReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WishlistScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tripTemplateId: 'tripTemplateId',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationPreferenceScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  paymentReminder: 'paymentReminder',
  tripReminder: 'tripReminder',
  bookingConfirmation: 'bookingConfirmation',
  cancellationAlert: 'cancellationAlert',
  reviewRequest: 'reviewRequest',
  smsNotifications: 'smsNotifications',
  emailNotifications: 'emailNotifications',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  notificationType: 'notificationType',
  recipientEmail: 'recipientEmail',
  subject: 'subject',
  message: 'message',
  status: 'status',
  sentAt: 'sentAt',
  failureReason: 'failureReason',
  metadata: 'metadata'
};

exports.Prisma.PaymentTransactionScalarFieldEnum = {
  id: 'id',
  bookingId: 'bookingId',
  agencyId: 'agencyId',
  amount: 'amount',
  method: 'method',
  transactionId: 'transactionId',
  status: 'status',
  provider: 'provider',
  providerData: 'providerData',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConversationScalarFieldEnum = {
  id: 'id',
  travelerId: 'travelerId',
  agencyId: 'agencyId',
  lastMessageAt: 'lastMessageAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  conversationId: 'conversationId',
  senderId: 'senderId',
  content: 'content',
  attachmentUrl: 'attachmentUrl',
  isRead: 'isRead',
  readAt: 'readAt',
  createdAt: 'createdAt'
};

exports.Prisma.ExchangeRateScalarFieldEnum = {
  id: 'id',
  baseCurrency: 'baseCurrency',
  targetCurrency: 'targetCurrency',
  rate: 'rate',
  lastUpdated: 'lastUpdated',
  expiresAt: 'expiresAt'
};

exports.Prisma.EmailSuppressionScalarFieldEnum = {
  id: 'id',
  email: 'email',
  reason: 'reason',
  createdAt: 'createdAt'
};

exports.Prisma.CopyrightReportScalarFieldEnum = {
  id: 'id',
  reporterName: 'reporterName',
  reporterEmail: 'reporterEmail',
  contentUrl: 'contentUrl',
  description: 'description',
  status: 'status',
  createdAt: 'createdAt',
  resolvedAt: 'resolvedAt',
  resolvedBy: 'resolvedBy'
};

exports.Prisma.SupportTicketScalarFieldEnum = {
  id: 'id',
  requesterName: 'requesterName',
  requesterEmail: 'requesterEmail',
  requesterRole: 'requesterRole',
  category: 'category',
  subject: 'subject',
  message: 'message',
  bookingRef: 'bookingRef',
  status: 'status',
  firstResponseAt: 'firstResponseAt',
  resolvedAt: 'resolvedAt',
  resolvedBy: 'resolvedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  number: 'number',
  agencyId: 'agencyId',
  periodStart: 'periodStart',
  periodEnd: 'periodEnd',
  currency: 'currency',
  commissionRate: 'commissionRate',
  subtotalAmount: 'subtotalAmount',
  totalAmount: 'totalAmount',
  status: 'status',
  issuerName: 'issuerName',
  issuerIce: 'issuerIce',
  issuerRc: 'issuerRc',
  issuerAddress: 'issuerAddress',
  agencyName: 'agencyName',
  agencyIce: 'agencyIce',
  issuedAt: 'issuedAt',
  createdAt: 'createdAt'
};

exports.Prisma.InvoiceLineItemScalarFieldEnum = {
  id: 'id',
  invoiceId: 'invoiceId',
  agencyId: 'agencyId',
  bookingId: 'bookingId',
  description: 'description',
  bookingDate: 'bookingDate',
  grossAmount: 'grossAmount',
  commissionRate: 'commissionRate',
  commissionAmount: 'commissionAmount'
};

exports.Prisma.InvoiceSequenceScalarFieldEnum = {
  year: 'year',
  lastValue: 'lastValue'
};

exports.Prisma.AgencyPaymentProfileScalarFieldEnum = {
  id: 'id',
  agencyId: 'agencyId',
  provider: 'provider',
  externalMerchantId: 'externalMerchantId',
  onboardingStatus: 'onboardingStatus',
  paymentEnabled: 'paymentEnabled',
  refundEnabled: 'refundEnabled',
  currency: 'currency',
  lastVerifiedAt: 'lastVerifiedAt',
  webhookSecretRef: 'webhookSecretRef',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentAttemptScalarFieldEnum = {
  id: 'id',
  bookingId: 'bookingId',
  agencyId: 'agencyId',
  paymentProfileId: 'paymentProfileId',
  stage: 'stage',
  amount: 'amount',
  currency: 'currency',
  provider: 'provider',
  providerPaymentId: 'providerPaymentId',
  hostedUrl: 'hostedUrl',
  idempotencyKey: 'idempotencyKey',
  status: 'status',
  externalPaymentId: 'externalPaymentId',
  createdAt: 'createdAt',
  capturedAt: 'capturedAt',
  failedAt: 'failedAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WebhookInboxEntryScalarFieldEnum = {
  id: 'id',
  provider: 'provider',
  providerEventId: 'providerEventId',
  eventType: 'eventType',
  signatureValidated: 'signatureValidated',
  processingStatus: 'processingStatus',
  failureReason: 'failureReason',
  payload: 'payload',
  receivedAt: 'receivedAt',
  processedAt: 'processedAt'
};

exports.Prisma.PaymentReconciliationMismatchScalarFieldEnum = {
  id: 'id',
  provider: 'provider',
  type: 'type',
  status: 'status',
  agencyId: 'agencyId',
  bookingId: 'bookingId',
  paymentAttemptId: 'paymentAttemptId',
  externalPaymentId: 'externalPaymentId',
  details: 'details',
  createdAt: 'createdAt',
  resolvedAt: 'resolvedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.UserRole = exports.$Enums.UserRole = {
  AGENCY: 'AGENCY',
  TRAVELER: 'TRAVELER',
  ADMIN: 'ADMIN'
};

exports.VerificationStatus = exports.$Enums.VerificationStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
};

exports.SubscriptionStatus = exports.$Enums.SubscriptionStatus = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
};

exports.BankDetailsStatus = exports.$Enums.BankDetailsStatus = {
  UNVERIFIED: 'UNVERIFIED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
};

exports.TravelLicenceType = exports.$Enums.TravelLicenceType = {
  ODV: 'ODV',
  DV: 'DV'
};

exports.LicenceStatus = exports.$Enums.LicenceStatus = {
  NOT_SUBMITTED: 'NOT_SUBMITTED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED'
};

exports.TripCategory = exports.$Enums.TripCategory = {
  ADVENTURE: 'ADVENTURE',
  CULTURAL: 'CULTURAL',
  LUXURY: 'LUXURY',
  BUDGET: 'BUDGET',
  NATURE: 'NATURE'
};

exports.TripStatus = exports.$Enums.TripStatus = {
  ACTIVE: 'ACTIVE',
  DRAFT: 'DRAFT',
  ARCHIVED: 'ARCHIVED',
  INACTIVE: 'INACTIVE'
};

exports.AccommodationType = exports.$Enums.AccommodationType = {
  HOTEL: 'HOTEL',
  RIAD: 'RIAD',
  GUESTHOUSE: 'GUESTHOUSE',
  CAMP: 'CAMP',
  HOSTEL: 'HOSTEL',
  OTHER: 'OTHER'
};

exports.ItineraryMeal = exports.$Enums.ItineraryMeal = {
  BREAKFAST: 'BREAKFAST',
  LUNCH: 'LUNCH',
  DINNER: 'DINNER'
};

exports.SessionStatus = exports.$Enums.SessionStatus = {
  OPEN: 'OPEN',
  FULL: 'FULL',
  CANCELLED: 'CANCELLED'
};

exports.SessionGroupStatus = exports.$Enums.SessionGroupStatus = {
  NOT_REQUIRED: 'NOT_REQUIRED',
  PENDING_MINIMUM: 'PENDING_MINIMUM',
  CONFIRMED: 'CONFIRMED',
  NOT_CONFIRMED: 'NOT_CONFIRMED'
};

exports.BookingStatus = exports.$Enums.BookingStatus = {
  PENDING: 'PENDING',
  AWAITING_VALIDATION: 'AWAITING_VALIDATION',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  PENDING_MINIMUM: 'PENDING_MINIMUM',
  NOT_CONFIRMED: 'NOT_CONFIRMED',
  NO_SHOW: 'NO_SHOW'
};

exports.PaymentMethod = exports.$Enums.PaymentMethod = {
  MANUAL: 'MANUAL',
  GATEWAY: 'GATEWAY'
};

exports.BookingPaymentStatus = exports.$Enums.BookingPaymentStatus = {
  UNPAID: 'UNPAID',
  PAID: 'PAID',
  REFUNDED: 'REFUNDED',
  FAILED: 'FAILED',
  PARTIALLY_PAID: 'PARTIALLY_PAID'
};

exports.BookingAttendance = exports.$Enums.BookingAttendance = {
  ATTENDED: 'ATTENDED',
  NO_SHOW: 'NO_SHOW'
};

exports.RefundStatus = exports.$Enums.RefundStatus = {
  PENDING: 'PENDING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED'
};

exports.PaymentCustodian = exports.$Enums.PaymentCustodian = {
  AGENCY: 'AGENCY',
  AGENCY_PSP: 'AGENCY_PSP'
};

exports.ExternalPaymentStatus = exports.$Enums.ExternalPaymentStatus = {
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
};

exports.ExternalPaymentStage = exports.$Enums.ExternalPaymentStage = {
  FULL: 'FULL',
  DEPOSIT: 'DEPOSIT',
  BALANCE: 'BALANCE'
};

exports.BookingPaymentPlanStatus = exports.$Enums.BookingPaymentPlanStatus = {
  DEPOSIT_DUE: 'DEPOSIT_DUE',
  DEPOSIT_PAID: 'DEPOSIT_PAID',
  BALANCE_DUE: 'BALANCE_DUE',
  FULLY_PAID: 'FULLY_PAID',
  REFUND_DUE: 'REFUND_DUE',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED'
};

exports.RefundCaseStatus = exports.$Enums.RefundCaseStatus = {
  REFUND_REQUESTED: 'REFUND_REQUESTED',
  ELIGIBILITY_REVIEW: 'ELIGIBILITY_REVIEW',
  REFUND_APPROVED: 'REFUND_APPROVED',
  AGENCY_ACTION_REQUIRED: 'AGENCY_ACTION_REQUIRED',
  REFUND_INITIATED: 'REFUND_INITIATED',
  REFUND_COMPLETED: 'REFUND_COMPLETED',
  REFUND_REJECTED: 'REFUND_REJECTED',
  REFUND_FAILED: 'REFUND_FAILED',
  REFUND_OVERDUE: 'REFUND_OVERDUE'
};

exports.RefundEvidenceTier = exports.$Enums.RefundEvidenceTier = {
  PSP_CONFIRMATION: 'PSP_CONFIRMATION',
  BANK_PROVIDER_CONFIRMATION: 'BANK_PROVIDER_CONFIRMATION',
  BANK_REFERENCE: 'BANK_REFERENCE',
  TRAVELLER_CONFIRMATION: 'TRAVELLER_CONFIRMATION',
  ADMIN_REVIEW: 'ADMIN_REVIEW'
};

exports.DuplicateCreditFlagStatus = exports.$Enums.DuplicateCreditFlagStatus = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED'
};

exports.RefundEvidenceSource = exports.$Enums.RefundEvidenceSource = {
  SYSTEM_WEBHOOK: 'SYSTEM_WEBHOOK',
  AGENCY: 'AGENCY',
  TRAVELLER: 'TRAVELLER',
  ADMIN: 'ADMIN'
};

exports.PaymentLedgerEntryType = exports.$Enums.PaymentLedgerEntryType = {
  PAYMENT_VERIFIED: 'PAYMENT_VERIFIED',
  PAYMENT_CAPTURED: 'PAYMENT_CAPTURED',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  REFUND_INITIATED: 'REFUND_INITIATED',
  REFUND_COMPLETED: 'REFUND_COMPLETED',
  DEPOSIT_CAPTURED: 'DEPOSIT_CAPTURED',
  BALANCE_CAPTURED: 'BALANCE_CAPTURED',
  REFUND_DUE: 'REFUND_DUE'
};

exports.PaymentLedgerSource = exports.$Enums.PaymentLedgerSource = {
  MANUAL_PROOF_REVIEW: 'MANUAL_PROOF_REVIEW',
  ADMIN_PROOF_REVIEW: 'ADMIN_PROOF_REVIEW',
  GATEWAY_WEBHOOK: 'GATEWAY_WEBHOOK',
  GATEWAY_REFUND: 'GATEWAY_REFUND',
  BANK_CONFIRMATION: 'BANK_CONFIRMATION'
};

exports.ReviewStatus = exports.$Enums.ReviewStatus = {
  PENDING: 'PENDING',
  VISIBLE: 'VISIBLE',
  HIDDEN: 'HIDDEN',
  REMOVED: 'REMOVED'
};

exports.NotificationType = exports.$Enums.NotificationType = {
  PAYMENT_REMINDER: 'PAYMENT_REMINDER',
  TRIP_REMINDER: 'TRIP_REMINDER',
  BOOKING_CONFIRMATION: 'BOOKING_CONFIRMATION',
  CANCELLATION: 'CANCELLATION',
  REVIEW_REQUEST: 'REVIEW_REQUEST'
};

exports.NotificationDeliveryStatus = exports.$Enums.NotificationDeliveryStatus = {
  SENT: 'SENT',
  FAILED: 'FAILED',
  BOUNCED: 'BOUNCED'
};

exports.PaymentTransactionStatus = exports.$Enums.PaymentTransactionStatus = {
  INITIATED: 'INITIATED',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  PENDING: 'PENDING'
};

exports.CopyrightReportStatus = exports.$Enums.CopyrightReportStatus = {
  OPEN: 'OPEN',
  ACTIONED: 'ACTIONED',
  DISMISSED: 'DISMISSED'
};

exports.SupportRequesterRole = exports.$Enums.SupportRequesterRole = {
  TRAVELER: 'TRAVELER',
  AGENCY: 'AGENCY',
  GUEST: 'GUEST'
};

exports.SupportTicketCategory = exports.$Enums.SupportTicketCategory = {
  BOOKING: 'BOOKING',
  PAYMENT: 'PAYMENT',
  REFUND: 'REFUND',
  ACCOUNT: 'ACCOUNT',
  TRIP: 'TRIP',
  COMPLAINT: 'COMPLAINT',
  TECHNICAL: 'TECHNICAL',
  OTHER: 'OTHER'
};

exports.SupportTicketStatus = exports.$Enums.SupportTicketStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED'
};

exports.InvoiceStatus = exports.$Enums.InvoiceStatus = {
  ISSUED: 'ISSUED'
};

exports.AgencyPaymentOnboardingStatus = exports.$Enums.AgencyPaymentOnboardingStatus = {
  NOT_STARTED: 'NOT_STARTED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  CONNECTED: 'CONNECTED',
  DISABLED: 'DISABLED'
};

exports.PaymentAttemptStatus = exports.$Enums.PaymentAttemptStatus = {
  CREATED: 'CREATED',
  PENDING: 'PENDING',
  CAPTURED: 'CAPTURED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
};

exports.WebhookProcessingStatus = exports.$Enums.WebhookProcessingStatus = {
  RECEIVED: 'RECEIVED',
  PROCESSED: 'PROCESSED',
  DUPLICATE: 'DUPLICATE',
  REJECTED: 'REJECTED',
  MISMATCH: 'MISMATCH',
  FAILED: 'FAILED'
};

exports.PaymentReconciliationMismatchType = exports.$Enums.PaymentReconciliationMismatchType = {
  STATUS_MISMATCH: 'STATUS_MISMATCH',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  MERCHANT_MISMATCH: 'MERCHANT_MISMATCH',
  MISSING_WEBHOOK: 'MISSING_WEBHOOK'
};

exports.PaymentReconciliationStatus = exports.$Enums.PaymentReconciliationStatus = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED'
};

exports.Prisma.ModelName = {
  User: 'User',
  RefreshToken: 'RefreshToken',
  BreakGlassCredential: 'BreakGlassCredential',
  AgencyProfile: 'AgencyProfile',
  TripTemplate: 'TripTemplate',
  ItineraryDay: 'ItineraryDay',
  TripSession: 'TripSession',
  Booking: 'Booking',
  PaymentProof: 'PaymentProof',
  ExternalPayment: 'ExternalPayment',
  BookingPaymentPlan: 'BookingPaymentPlan',
  RefundCase: 'RefundCase',
  DuplicateCreditFlag: 'DuplicateCreditFlag',
  RefundEvidence: 'RefundEvidence',
  PaymentStatusLedgerEntry: 'PaymentStatusLedgerEntry',
  AuditLog: 'AuditLog',
  SearchEvent: 'SearchEvent',
  Review: 'Review',
  Wishlist: 'Wishlist',
  NotificationPreference: 'NotificationPreference',
  NotificationLog: 'NotificationLog',
  PaymentTransaction: 'PaymentTransaction',
  Conversation: 'Conversation',
  Message: 'Message',
  ExchangeRate: 'ExchangeRate',
  EmailSuppression: 'EmailSuppression',
  CopyrightReport: 'CopyrightReport',
  SupportTicket: 'SupportTicket',
  Invoice: 'Invoice',
  InvoiceLineItem: 'InvoiceLineItem',
  InvoiceSequence: 'InvoiceSequence',
  AgencyPaymentProfile: 'AgencyPaymentProfile',
  PaymentAttempt: 'PaymentAttempt',
  WebhookInboxEntry: 'WebhookInboxEntry',
  PaymentReconciliationMismatch: 'PaymentReconciliationMismatch'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
