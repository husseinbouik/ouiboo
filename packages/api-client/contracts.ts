import type {
  AgencyProfile,
  BookingDetails,
  BookingPaymentStatus,
  BookingStatus,
  DecimalString,
  PaymentProvider,
  PayoutDetails,
  PayoutRequest,
  TripCategory,
  TripSession,
  TripStatus,
  TripTemplate,
  User,
  VerificationStatus,
  Wallet,
} from '@ouiboo/types'

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiEnvelope<T> {
  success: true
  data: T
  meta?: PaginationMeta
  timestamp: string
}

export interface ApiProblem {
  type?: string
  title: string
  status: number
  detail?: string
  instance?: string
  errors?: Record<string, string[]>
  timestamp?: string
}

/** Current list shape returned by the trips API. */
export interface PaginatedData<T> {
  data: T[]
  pagination: PaginationMeta
}

export interface PageParams {
  page?: number
  limit?: number
}

export interface TripsQueryParams extends PageParams {
  featured?: boolean
  status?: TripStatus | string
  q?: string
  category?: TripCategory | string
  agencyId?: string
  priceMin?: number
  priceMax?: number
  durationMin?: number
  durationMax?: number
  startDateFrom?: string
  startDateTo?: string
  ratingMin?: number
  available?: boolean
  sortBy?: 'createdAt' | 'price' | 'rating' | 'popularity' | string
  sortOrder?: 'asc' | 'desc'
}

export interface TripAgencySummary {
  id: string
  companyName: string
  logo?: string | null
  verificationStatus?: VerificationStatus
}

export interface TripListItem extends TripTemplate {
  sessions: TripSession[]
  agency?: TripAgencySummary | null
  averageRating?: number
  featured?: boolean
  _count?: {
    sessions?: number
    reviews?: number
    wishlists?: number
  }
}

export interface TripDetails extends TripListItem {
  agency?: AgencyProfile | null
}

export interface CreateTripInput {
  title: string
  description: string
  category: TripCategory | string
  startLocation: string
  durationDays: number
  durationNights: number
  inclusions?: string[]
  exclusions?: string[]
  checklist?: string[]
  images?: string[]
  status?: TripStatus | string
  itinerary?: Array<{
    dayNumber: number
    title?: string
    description: string
    activities?: string[]
  }>
}

export type UpdateTripInput = Partial<CreateTripInput>

export interface CreateTripSessionInput {
  startDate: string
  endDate: string
  price: DecimalString | number
  deposit?: DecimalString | number
  totalSeats: number
}

export interface CreateBookingInput {
  sessionId: string
  guestsCount: number
  paymentMethod: string
  fullName?: string
  phoneNumber?: string
  documentNumber?: string
}

export interface VerifyBookingPaymentInput {
  bookingId: string
  approved: boolean
  rejectionReason?: string
}

export interface AgencyStats {
  revenue: DecimalString
  activeTrips: number
  totalBookings: number
  totalCustomers: number
  wallet: Wallet | Pick<Wallet, 'availableBalance' | 'pendingBalance'>
}

export interface AgencyBookingsParams extends PageParams {
  status?: BookingStatus | string
  paymentStatus?: BookingPaymentStatus | string
  q?: string
}

export interface UpdateAgencyProfileInput {
  companyName?: string
  bio?: string
  logo?: string
  bankDetails?: string
}

export interface RequestPayoutInput {
  amount: DecimalString | number
  bankDetails: string
}

export interface UpdateUserInput {
  name?: string
  avatar?: string
  phone?: string
}

export interface InitiatePaymentInput {
  bookingId: string
  amount: DecimalString | number
  travelerEmail: string
  travelerName: string
  provider: PaymentProvider | string
}

export interface InitiatePaymentResult {
  transactionId?: string
  paymentUrl?: string
  redirectUrl?: string
  provider: PaymentProvider | string
  [key: string]: unknown
}

export interface ConfirmGatewayPaymentInput {
  transactionId: string
  bookingId: string
  provider: PaymentProvider | string
}

export interface RefundPaymentInput extends ConfirmGatewayPaymentInput {
  amount: DecimalString | number
}

export interface AdminListParams extends PageParams {
  q?: string
  status?: string
}

export interface AdminVerifyInput {
  id: string
  status: VerificationStatus | string
  rejectionReason?: string
}

export interface AdminProcessPayoutInput {
  id: string
  status: string
}

export interface AdminRefundBookingInput {
  id: string
  amount: number
}

export interface AdminAgencyRecord extends AgencyProfile {
  user?: Pick<User, 'id' | 'name' | 'email'> | null
}

export interface AdminPaymentRecord {
  id: string
  status: VerificationStatus | string
  booking?: BookingDetails
  [key: string]: unknown
}

export interface AuditLogRecord {
  id: string
  action: string
  entity?: string
  entityId?: string
  createdAt: string
  actor?: Pick<User, 'id' | 'name' | 'email'> | null
  metadata?: Record<string, unknown>
}

export type {
  AgencyProfile,
  BookingDetails,
  PayoutDetails,
  PayoutRequest,
  TripSession,
  TripTemplate,
  User,
}
