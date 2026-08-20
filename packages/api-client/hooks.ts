'use client'

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import type {
  AdminPaymentRecord,
  AdminVerifyInput,
  AgencyBookingsParams,
  BookingDetails,
  CreateBookingInput,
  PaginatedData,
  TripDetails,
  TripListItem,
  TripsQueryParams,
} from './contracts'
import { getDefaultBrowserSdk, type OuibooSdk } from './sdk'

export const ouibooQueryKeys = {
  all: ['ouiboo'] as const,
  trips: () => [...ouibooQueryKeys.all, 'trips'] as const,
  tripList: (params: TripsQueryParams) =>
    [...ouibooQueryKeys.trips(), 'list', params] as const,
  tripDetail: (id: string) =>
    [...ouibooQueryKeys.trips(), 'detail', id] as const,
  bookings: () => [...ouibooQueryKeys.all, 'bookings'] as const,
  myBookings: () => [...ouibooQueryKeys.bookings(), 'mine'] as const,
  bookingDetail: (id: string) =>
    [...ouibooQueryKeys.bookings(), 'detail', id] as const,
  agency: () => [...ouibooQueryKeys.all, 'agency'] as const,
  agencyBookings: (params: AgencyBookingsParams) =>
    [...ouibooQueryKeys.agency(), 'bookings', params] as const,
  admin: () => [...ouibooQueryKeys.all, 'admin'] as const,
  pendingPayments: () =>
    [...ouibooQueryKeys.admin(), 'pending-payments'] as const,
}

type SdkOption = { sdk?: OuibooSdk }

type TripListOptions = Omit<
  UseQueryOptions<PaginatedData<TripListItem>>,
  'queryKey' | 'queryFn'
> &
  SdkOption

export function useTripsQuery(
  params: TripsQueryParams = {},
  options: TripListOptions = {}
) {
  const { sdk = getDefaultBrowserSdk(), ...queryOptions } = options
  return useQuery({
    queryKey: ouibooQueryKeys.tripList(params),
    queryFn: () => sdk.trips.list(params),
    ...queryOptions,
  })
}

type TripDetailOptions = Omit<
  UseQueryOptions<TripDetails | null>,
  'queryKey' | 'queryFn'
> &
  SdkOption

export function useTripDetailQuery(
  id: string,
  options: TripDetailOptions = {}
) {
  const { sdk = getDefaultBrowserSdk(), ...queryOptions } = options
  return useQuery({
    queryKey: ouibooQueryKeys.tripDetail(id),
    queryFn: () => sdk.trips.getById(id),
    enabled: Boolean(id),
    ...queryOptions,
  })
}

type AgencyBookingsOptions = Omit<
  UseQueryOptions<BookingDetails[]>,
  'queryKey' | 'queryFn'
> &
  SdkOption

export function useAgencyBookingsQuery(
  params: AgencyBookingsParams = {},
  options: AgencyBookingsOptions = {}
) {
  const { sdk = getDefaultBrowserSdk(), ...queryOptions } = options
  return useQuery({
    queryKey: ouibooQueryKeys.agencyBookings(params),
    queryFn: () => sdk.agency.getBookings(params),
    ...queryOptions,
  })
}

type CheckoutOptions = Omit<
  UseMutationOptions<BookingDetails, Error, CreateBookingInput>,
  'mutationFn'
> &
  SdkOption

export function useCheckoutMutation(options: CheckoutOptions = {}) {
  const queryClient = useQueryClient()
  const {
    sdk = getDefaultBrowserSdk(),
    onSuccess,
    ...mutationOptions
  } = options

  return useMutation({
    mutationFn: (input: CreateBookingInput) => sdk.bookings.create(input),
    ...mutationOptions,
    onSuccess: async (data, variables, context, mutationContext) => {
      await queryClient.invalidateQueries({
        queryKey: ouibooQueryKeys.myBookings(),
      })
      await onSuccess?.(data, variables, context, mutationContext)
    },
  })
}

type VerifyPaymentOptions = Omit<
  UseMutationOptions<AdminPaymentRecord, Error, AdminVerifyInput>,
  'mutationFn'
> &
  SdkOption

export function useVerifyPaymentMutation(
  options: VerifyPaymentOptions = {}
) {
  const queryClient = useQueryClient()
  const {
    sdk = getDefaultBrowserSdk(),
    onSuccess,
    ...mutationOptions
  } = options

  return useMutation({
    mutationFn: (input: AdminVerifyInput) => sdk.admin.verifyPayment(input),
    ...mutationOptions,
    onSuccess: async (data, variables, context, mutationContext) => {
      await queryClient.invalidateQueries({
        queryKey: ouibooQueryKeys.pendingPayments(),
      })
      await onSuccess?.(data, variables, context, mutationContext)
    },
  })
}
