/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAttendanceMarking } from './useAttendanceMarking';
import { apiClient } from '@/lib/api-client';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: { patch: jest.fn() },
}));

const patchMock = apiClient.patch as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('useAttendanceMarking (#434)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks attended via PATCH /bookings/:id/attendance with attended: true', async () => {
    patchMock.mockResolvedValue({ data: { id: 'booking-1', status: 'COMPLETED', attendance: 'ATTENDED' } });
    const { result } = renderHook(() => useAttendanceMarking(), { wrapper });

    act(() => result.current.markAttendance('booking-1', true));

    await waitFor(() => expect(patchMock).toHaveBeenCalledWith('/bookings/booking-1/attendance', { attended: true }));
    await waitFor(() => expect(result.current.isMarkingAttendance).toBe(false));
    expect(result.current.attendanceError).toBeNull();
  });

  it('marks no-show with attended: false', async () => {
    patchMock.mockResolvedValue({ data: { id: 'booking-1', status: 'NO_SHOW', attendance: 'NO_SHOW' } });
    const { result } = renderHook(() => useAttendanceMarking(), { wrapper });

    act(() => result.current.markAttendance('booking-1', false));

    await waitFor(() => expect(patchMock).toHaveBeenCalledWith('/bookings/booking-1/attendance', { attended: false }));
  });

  it('surfaces the server error message when recording fails', async () => {
    patchMock.mockRejectedValue({ response: { data: { message: 'Attendance has already been recorded for this booking' } } });
    const { result } = renderHook(() => useAttendanceMarking(), { wrapper });

    act(() => result.current.markAttendance('booking-1', true));

    await waitFor(() =>
      expect(result.current.attendanceError).toBe('Attendance has already been recorded for this booking'),
    );
  });
});
