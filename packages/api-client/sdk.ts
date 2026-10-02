import type { AxiosInstance } from 'axios'
import { createApiClient, createBrowserApiClient } from './client'
import {
  AdminApi,
  AgencyApi,
  BookingsApi,
  PaymentsApi,
  TripsApi,
  UserApi,
} from './services'

export class OuibooSdk {
  readonly trips: TripsApi
  readonly bookings: BookingsApi
  readonly agency: AgencyApi
  readonly admin: AdminApi
  readonly users: UserApi
  readonly payments: PaymentsApi

  constructor(readonly client: AxiosInstance) {
    this.trips = new TripsApi(client)
    this.bookings = new BookingsApi(client)
    this.agency = new AgencyApi(client)
    this.admin = new AdminApi(client)
    this.users = new UserApi(client)
    this.payments = new PaymentsApi(client)
  }
}

export function createOuibooSdk(
  client: AxiosInstance = createApiClient()
): OuibooSdk {
  return new OuibooSdk(client)
}

let defaultBrowserSdk: OuibooSdk | undefined

export function getDefaultBrowserSdk() {
  if (!defaultBrowserSdk) {
    defaultBrowserSdk = createOuibooSdk(createBrowserApiClient())
  }
  return defaultBrowserSdk
}
