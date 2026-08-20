import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import type {
  AdminAgencyRecord,
  AdminListParams,
  AdminPaymentRecord,
  AdminProcessPayoutInput,
  AdminRefundBookingInput,
  AdminVerifyInput,
  AgencyBookingsParams,
  AgencyStats,
  AuditLogRecord,
  ConfirmGatewayPaymentInput,
  CreateBookingInput,
  CreateTripInput,
  CreateTripSessionInput,
  InitiatePaymentInput,
  InitiatePaymentResult,
  PageParams,
  PaginatedData,
  RefundPaymentInput,
  RequestPayoutInput,
  TripDetails,
  TripListItem,
  TripsQueryParams,
  UpdateAgencyProfileInput,
  UpdateTripInput,
  UpdateUserInput,
  VerifyBookingPaymentInput,
  AgencyProfile,
  BookingDetails,
  PayoutDetails,
  TripSession,
  User,
} from './contracts'

class ApiService {
  constructor(protected readonly client: AxiosInstance) {}

  protected async get<T>(url: string, config?: AxiosRequestConfig) {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  protected async post<T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig
  ) {
    const response = await this.client.post<T>(url, body, config)
    return response.data
  }

  protected async patch<T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig
  ) {
    const response = await this.client.patch<T>(url, body, config)
    return response.data
  }

  protected async delete<T>(url: string, config?: AxiosRequestConfig) {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }
}

export class TripsApi extends ApiService {
  list(params: TripsQueryParams = {}) {
    return this.get<PaginatedData<TripListItem>>('/trips', { params })
  }

  getById(id: string) {
    return this.get<TripDetails | null>(`/trips/${id}`)
  }

  create(input: CreateTripInput) {
    return this.post<TripDetails>('/trips', input)
  }

  update(id: string, input: UpdateTripInput) {
    return this.patch<TripDetails>(`/trips/${id}`, input)
  }

  remove(id: string) {
    return this.delete<{ success?: boolean }>(`/trips/${id}`)
  }

  listSessions(id: string) {
    return this.get<TripSession[]>(`/trips/${id}/sessions`)
  }

  createSession(id: string, input: CreateTripSessionInput) {
    return this.post<TripSession>(`/trips/${id}/sessions`, input)
  }
}

export class BookingsApi extends ApiService {
  create(input: CreateBookingInput) {
    return this.post<BookingDetails>('/bookings', input)
  }

  getMyBookings() {
    return this.get<BookingDetails[]>('/bookings/my-bookings')
  }

  getById(id: string) {
    return this.get<BookingDetails>(`/bookings/${id}`)
  }

  uploadPaymentProof(id: string, file: File | Blob) {
    const form = new FormData()
    form.append('file', file)
    return this.post<BookingDetails>(`/bookings/${id}/payment-proof`, form)
  }

  verifyPayment(input: VerifyBookingPaymentInput) {
    const { bookingId, ...body } = input
    return this.patch<BookingDetails>(
      `/bookings/${bookingId}/verify-payment`,
      body
    )
  }

  cancel(id: string) {
    return this.patch<BookingDetails>(`/bookings/${id}/cancel`)
  }
}

export class AgencyApi extends ApiService {
  getStats() {
    return this.get<AgencyStats>('/agency/stats')
  }

  getTrips(params: PageParams = {}) {
    return this.get<TripListItem[]>('/agency/trips', { params })
  }

  getBookings(params: AgencyBookingsParams = {}) {
    return this.get<BookingDetails[]>('/agency/bookings', { params })
  }

  getPayouts() {
    return this.get<PayoutDetails[]>('/agency/payouts')
  }

  requestPayout(input: RequestPayoutInput) {
    return this.post<PayoutDetails>('/agency/payouts', input)
  }

  updateProfile(input: UpdateAgencyProfileInput) {
    return this.patch<AgencyProfile>('/agency/profile', input)
  }
}

export class AdminApi extends ApiService {
  getPendingAgencies(params: AdminListParams = {}) {
    return this.get<AdminAgencyRecord[]>('/admin/pending-agencies', { params })
  }

  getAgencies(params: AdminListParams = {}) {
    return this.get<AdminAgencyRecord[]>('/admin/agencies', { params })
  }

  verifyAgency({ id, ...input }: AdminVerifyInput) {
    return this.post<AdminAgencyRecord>(`/admin/agencies/${id}/verify`, input)
  }

  getPendingTrips(params: AdminListParams = {}) {
    return this.get<TripListItem[]>('/admin/pending-trips', { params })
  }

  verifyTrip({ id, ...input }: AdminVerifyInput) {
    return this.post<TripDetails>(`/admin/trips/${id}/verify`, input)
  }

  getBookings(params: AdminListParams = {}) {
    return this.get<BookingDetails[]>('/admin/bookings', { params })
  }

  refundBooking({ id, amount }: AdminRefundBookingInput) {
    return this.post<BookingDetails>(`/admin/bookings/${id}/refund`, { amount })
  }

  getPendingPayments(params: AdminListParams = {}) {
    return this.get<AdminPaymentRecord[]>('/admin/pending-payments', { params })
  }

  verifyPayment({ id, ...input }: AdminVerifyInput) {
    return this.post<AdminPaymentRecord>(
      `/admin/payments/${id}/verify`,
      input
    )
  }

  getPayoutRequests(params: AdminListParams = {}) {
    return this.get<PayoutDetails[]>('/admin/payout-requests', { params })
  }

  processPayout({ id, status }: AdminProcessPayoutInput) {
    return this.post<PayoutDetails>(`/admin/payouts/${id}/process`, { status })
  }

  getAuditLogs(params: AdminListParams = {}) {
    return this.get<AuditLogRecord[]>('/admin/audit-logs', { params })
  }
}

export class UserApi extends ApiService {
  getMe() {
    return this.get<User>('/users/me')
  }

  updateMe(input: UpdateUserInput) {
    return this.patch<User>('/users/me', input)
  }

  createAgencyProfile(input: Record<string, unknown>) {
    return this.post<AgencyProfile>('/users/agency-profile', input)
  }
}

export class PaymentsApi extends ApiService {
  initiate(input: InitiatePaymentInput) {
    return this.post<InitiatePaymentResult>('/payments/initiate', input)
  }

  verify(input: ConfirmGatewayPaymentInput) {
    return this.post<BookingDetails>('/payments/verify', input)
  }

  refund(input: RefundPaymentInput) {
    return this.post<BookingDetails>('/payments/refund', input)
  }
}
