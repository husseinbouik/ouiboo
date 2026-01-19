
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
  bankDetails: 'bankDetails'
};

exports.Prisma.TripTemplateScalarFieldEnum = {
  id: 'id',
  agencyId: 'agencyId',
  title: 'title',
  description: 'description',
  category: 'category',
  startLocation: 'startLocation',
  durationDays: 'durationDays',
  durationNights: 'durationNights',
  inclusions: 'inclusions',
  exclusions: 'exclusions',
  checklist: 'checklist',
  images: 'images',
  status: 'status',
  featured: 'featured',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ItineraryDayScalarFieldEnum = {
  id: 'id',
  templateId: 'templateId',
  dayNumber: 'dayNumber',
  title: 'title',
  description: 'description',
  activities: 'activities'
};

exports.Prisma.TripSessionScalarFieldEnum = {
  id: 'id',
  templateId: 'templateId',
  startDate: 'startDate',
  endDate: 'endDate',
  price: 'price',
  deposit: 'deposit',
  totalSeats: 'totalSeats',
  availableSeats: 'availableSeats',
  status: 'status'
};

exports.Prisma.BookingScalarFieldEnum = {
  id: 'id',
  sessionId: 'sessionId',
  travelerId: 'travelerId',
  bookingDate: 'bookingDate',
  status: 'status',
  totalAmount: 'totalAmount',
  guestsCount: 'guestsCount',
  fullName: 'fullName',
  phoneNumber: 'phoneNumber',
  documentNumber: 'documentNumber',
  paymentProofUrl: 'paymentProofUrl',
  paymentProofId: 'paymentProofId'
};

exports.Prisma.PaymentProofScalarFieldEnum = {
  id: 'id',
  bookingId: 'bookingId',
  imageUrl: 'imageUrl',
  uploadedAt: 'uploadedAt',
  rejectionReason: 'rejectionReason',
  status: 'status'
};

exports.Prisma.WalletScalarFieldEnum = {
  id: 'id',
  agencyId: 'agencyId',
  availableBalance: 'availableBalance',
  pendingBalance: 'pendingBalance'
};

exports.Prisma.WalletTransactionScalarFieldEnum = {
  id: 'id',
  walletId: 'walletId',
  amount: 'amount',
  type: 'type',
  reason: 'reason',
  createdAt: 'createdAt'
};

exports.Prisma.PayoutRequestScalarFieldEnum = {
  id: 'id',
  agencyId: 'agencyId',
  amount: 'amount',
  status: 'status',
  requestedAt: 'requestedAt',
  processedAt: 'processedAt',
  bankDetails: 'bankDetails'
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

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.UserRole = exports.$Enums.UserRole = {
  AGENCY: 'AGENCY',
  TRAVELER: 'TRAVELER',
  ADMIN: 'ADMIN'
};

exports.VerificationStatus = exports.$Enums.VerificationStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
};

exports.SubscriptionStatus = exports.$Enums.SubscriptionStatus = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
};

exports.TripCategory = exports.$Enums.TripCategory = {
  ADVENTURE: 'ADVENTURE',
  CULTURAL: 'CULTURAL',
  LUXURY: 'LUXURY',
  BUDGET: 'BUDGET'
};

exports.TripStatus = exports.$Enums.TripStatus = {
  ACTIVE: 'ACTIVE',
  DRAFT: 'DRAFT',
  ARCHIVED: 'ARCHIVED'
};

exports.BookingStatus = exports.$Enums.BookingStatus = {
  PENDING: 'PENDING',
  AWAITING_VALIDATION: 'AWAITING_VALIDATION',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED'
};

exports.TransactionType = exports.$Enums.TransactionType = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT'
};

exports.PayoutStatus = exports.$Enums.PayoutStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAID: 'PAID'
};

exports.Prisma.ModelName = {
  User: 'User',
  RefreshToken: 'RefreshToken',
  AgencyProfile: 'AgencyProfile',
  TripTemplate: 'TripTemplate',
  ItineraryDay: 'ItineraryDay',
  TripSession: 'TripSession',
  Booking: 'Booking',
  PaymentProof: 'PaymentProof',
  Wallet: 'Wallet',
  WalletTransaction: 'WalletTransaction',
  PayoutRequest: 'PayoutRequest',
  AuditLog: 'AuditLog'
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
