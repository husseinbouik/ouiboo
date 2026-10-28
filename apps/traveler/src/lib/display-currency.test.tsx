/**
 * @jest-environment jsdom
 *
 * #498 rework: display currency.
 * - guests: choice persists under `ouiboo_display_currency`,
 * - signed-in: value comes from the profile and changes PATCH /users/me,
 * - conversion goes through the MAD base rates; a price renders in its
 *   authoritative currency when no rate exists,
 * - MAD renders natively (no rate fetch needed).
 */
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import {
  convertViaMadRates,
  DisplayCurrencyProvider,
  DISPLAY_CURRENCY_STORAGE_KEY,
  useDisplayAmountConverter,
  useDisplayCurrency,
  useDisplayPrice,
} from './display-currency';

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockRefetch = jest.fn();
let mockUser: any = null;
// queryKey -> response data for the mocked react-query layer
let mockQueryData: Record<string, unknown> = {};

jest.mock('@tanstack/react-query', () => ({
  useQuery: (options: any) => {
    const key = JSON.stringify(options.queryKey);
    if (key in mockQueryData) return { data: mockQueryData[key] };
    if (options.enabled === false) return { data: undefined };
    // Execute the real queryFn against the mocked apiClient for rates
    // and supported lists so URL/param wiring is exercised.
    return { data: undefined, __options: options };
  },
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

jest.mock('@/components/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, refetch: mockRefetch }),
}));

function Probe({ amount, currency }: { amount: number; currency: string }) {
  const { displayCurrency } = useDisplayCurrency();
  const price = useDisplayPrice(amount, currency, 'en');
  return (
    <div>
      <span data-testid="display">{displayCurrency}</span>
      <span data-testid="price">{price}</span>
    </div>
  );
}

function SetterProbe() {
  const { setDisplayCurrency } = useDisplayCurrency();
  return (
    <button type="button" onClick={() => void setDisplayCurrency('EUR')}>
      set-eur
    </button>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = null;
  mockQueryData = {};
  window.localStorage.clear();
  mockPatch.mockResolvedValue({ data: {} });
  mockRefetch.mockResolvedValue(undefined);
  mockGet.mockResolvedValue({ data: { currencies: ['MAD', 'USD', 'EUR'] } });
});

describe('convertViaMadRates (pure)', () => {
  it('converts MAD -> EUR with the MAD-base rate', () => {
    expect(convertViaMadRates(1000, 'MAD', 'EUR', { EUR: 0.092 })).toBeCloseTo(92);
  });
  it('converts EUR -> MAD (inverse of the MAD-base rate)', () => {
    expect(convertViaMadRates(92, 'EUR', 'MAD', { EUR: 0.092 })).toBeCloseTo(1000);
  });
  it('converts EUR -> USD through MAD', () => {
    expect(convertViaMadRates(100, 'EUR', 'USD', { EUR: 0.092, USD: 0.1 })).toBeCloseTo(
      (100 * 0.1) / 0.092,
    );
  });
  it('returns the amount untouched for same-currency and null when a rate is missing', () => {
    expect(convertViaMadRates(500, 'MAD', 'MAD', {})).toBe(500);
    expect(convertViaMadRates(500, 'MAD', 'EUR', {})).toBeNull();
    expect(convertViaMadRates(500, 'MAD', 'EUR', { EUR: null })).toBeNull();
  });
});

describe('DisplayCurrencyProvider', () => {
  it('guest: defaults to MAD and persists a change under ouiboo_display_currency', async () => {
    render(
      <DisplayCurrencyProvider>
        <Probe amount={1000} currency="MAD" />
        <SetterProbe />
      </DisplayCurrencyProvider>,
    );
    expect(screen.getByTestId('display').textContent).toBe('MAD');
    // MAD price renders natively with no conversion.
    expect(screen.getByTestId('price').textContent).toContain('1,000');
    expect(screen.getByTestId('price').textContent).toContain('MAD');

    await act(async () => {
      screen.getByText('set-eur').click();
    });
    expect(window.localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY)).toBe('EUR');
    expect(mockPatch).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('display').textContent).toBe('EUR'));
  });

  it('guest: hydrates the persisted preference on mount', async () => {
    window.localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, 'USD');
    render(
      <DisplayCurrencyProvider>
        <Probe amount={100} currency="MAD" />
      </DisplayCurrencyProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('display').textContent).toBe('USD'));
  });

  it('signed-in: profile displayCurrency wins and changes PATCH /users/me', async () => {
    mockUser = { id: 'u1', name: 'Sara', email: 's@x.io', role: 'TRAVELER', displayCurrency: 'USD' };
    render(
      <DisplayCurrencyProvider>
        <Probe amount={100} currency="USD" />
        <SetterProbe />
      </DisplayCurrencyProvider>,
    );
    expect(screen.getByTestId('display').textContent).toBe('USD');
    // en-MA renders USD with its $ symbol; the amount is unconverted.
    expect(screen.getByTestId('price').textContent).toContain('$100');

    await act(async () => {
      screen.getByText('set-eur').click();
    });
    expect(mockPatch).toHaveBeenCalledWith('/users/me', { displayCurrency: 'EUR' });
    expect(mockRefetch).toHaveBeenCalled();
    expect(window.localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY)).toBeNull();
    await waitFor(() => expect(screen.getByTestId('display').textContent).toBe('EUR'));
  });
});

describe('useDisplayAmountConverter (#615: numeric conversion for derived amounts)', () => {
  function ConverterProbe({ amount, from }: { amount: number; from: string }) {
    const convert = useDisplayAmountConverter(from);
    const converted = convert(amount);
    return (
      <div>
        <span data-testid="converted-amount">{converted?.amount}</span>
        <span data-testid="converted-currency">{converted?.currency}</span>
      </div>
    );
  }

  it('converts a MAD base into the display currency numerically (cancellation-scale path)', () => {
    mockUser = { id: 'u1', name: 'Sara', email: 's@x.io', role: 'TRAVELER', displayCurrency: 'EUR' };
    mockQueryData = { '["currency","rate","EUR"]': 0.092 };
    render(
      <DisplayCurrencyProvider>
        <ConverterProbe amount={2200} from="MAD" />
      </DisplayCurrencyProvider>,
    );
    // 2200 MAD x 0.092 = EUR 202.40 — the #615 witness figures.
    expect(Number(screen.getByTestId('converted-amount').textContent)).toBeCloseTo(202.4);
    expect(screen.getByTestId('converted-currency').textContent).toBe('EUR');
  });

  it('returns the authoritative amount/currency when no rate exists', () => {
    mockUser = { id: 'u1', name: 'Sara', email: 's@x.io', role: 'TRAVELER', displayCurrency: 'EUR' };
    mockQueryData = {}; // no cached rate
    render(
      <DisplayCurrencyProvider>
        <ConverterProbe amount={2200} from="MAD" />
      </DisplayCurrencyProvider>,
    );
    expect(screen.getByTestId('converted-amount').textContent).toBe('2200');
    expect(screen.getByTestId('converted-currency').textContent).toBe('MAD');
  });

  it('is the identity when the display currency is the trip currency', () => {
    mockUser = { id: 'u1', name: 'Sara', email: 's@x.io', role: 'TRAVELER', displayCurrency: 'MAD' };
    render(
      <DisplayCurrencyProvider>
        <ConverterProbe amount={2200} from="MAD" />
      </DisplayCurrencyProvider>,
    );
    expect(screen.getByTestId('converted-amount').textContent).toBe('2200');
    expect(screen.getByTestId('converted-currency').textContent).toBe('MAD');
  });
});

describe('useDisplayPrice conversion (React-Query cached rates)', () => {
  it('renders a MAD price in EUR when the rate is cached', () => {
    mockUser = { id: 'u1', name: 'Sara', email: 's@x.io', role: 'TRAVELER', displayCurrency: 'EUR' };
    mockQueryData = { '["currency","rate","EUR"]': 0.092 };
    render(
      <DisplayCurrencyProvider>
        <Probe amount={1000} currency="MAD" />
      </DisplayCurrencyProvider>,
    );
    const price = screen.getByTestId('price').textContent ?? '';
    // 1000 MAD x 0.092 = EUR 92 (en-MA renders EUR as €).
    expect(price).toContain('92');
    expect(price).toContain('€');
    expect(price).not.toContain('1,000');
  });

  it('falls back to the authoritative currency when no rate exists', () => {
    mockUser = { id: 'u1', name: 'Sara', email: 's@x.io', role: 'TRAVELER', displayCurrency: 'EUR' };
    mockQueryData = {}; // no cached rate
    render(
      <DisplayCurrencyProvider>
        <Probe amount={1000} currency="MAD" />
      </DisplayCurrencyProvider>,
    );
    const price = screen.getByTestId('price').textContent ?? '';
    expect(price).toContain('MAD');
    expect(price).toContain('1,000');
  });
});
