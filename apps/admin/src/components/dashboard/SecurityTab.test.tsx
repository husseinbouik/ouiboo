/**
 * @jest-environment jsdom
 *
 * #418 (Council P0-13): Security tab — MFA enrolment wizard and
 * break-glass credential management.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SecurityTab from './SecurityTab';
import { apiClient } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

jest.mock('qrcode', () => ({
  __esModule: true,
  default: { toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,qr') },
}));

const getMock = apiClient.get as jest.Mock;
const postMock = apiClient.post as jest.Mock;
const deleteMock = apiClient.delete as jest.Mock;

const t = (key: string, opts?: Record<string, unknown>) => {
  let out = key;
  if (opts) {
    for (const [name, value] of Object.entries(opts)) {
      out = out.replace(`{{${name}}}`, String(value));
    }
  }
  return out;
};

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <SecurityTab t={t} />
    </QueryClientProvider>,
  );
  const byId = (id: string) => {
    const el = utils.container.querySelector(`#${id}`);
    if (!el) throw new Error(`element #${id} not found`);
    return el;
  };
  return { ...utils, byId };
}

const activeCredential = {
  id: 'bg-1',
  label: 'Sealed envelope — office safe',
  createdById: 'admin-1',
  createdAt: '2026-10-25T10:00:00.000Z',
  expiresAt: '2027-01-23T10:00:00.000Z',
  usedAt: null,
  usedByEmail: null,
  revokedAt: null,
  status: 'ACTIVE',
};

describe('SecurityTab (#418)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deleteMock.mockResolvedValue({});
  });

  it('walks an unenrolled admin through enrolment and shows recovery codes once', async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url === '/auth/mfa/status') {
        return { data: { mfaEnabled: false, mfaEnrolledAt: null, recoveryCodesRemaining: 0, adminMfaRequired: true } };
      }
      return { data: [] };
    });
    postMock.mockImplementation(async (url: string) => {
      if (url === '/auth/mfa/enrollment/start') {
        return { data: { otpauthUrl: 'otpauth://totp/x', secret: 'JBSWY3DPEHPK3PXP', expiresInSeconds: 600 } };
      }
      if (url === '/auth/mfa/enrollment/confirm') {
        return { data: { mfaEnabled: true, recoveryCodes: ['AAAA-2345', 'BBBB-6789'] } };
      }
      throw new Error(`unexpected POST ${url}`);
    });

    const { byId } = renderTab();

    // The t-stub returns raw keys, and both cards carry a password field,
    // so select the enrolment field by id (its real label is associated).
    await waitFor(() => expect(byId('enroll-password')).toBeTruthy());
    fireEvent.change(byId('enroll-password'), { target: { value: 'current-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'security.startEnrollment' }));

    // Password re-entry is sent to the enrolment start endpoint.
    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/auth/mfa/enrollment/start', { password: 'current-password' }));
    expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeTruthy();

    fireEvent.change(byId('enroll-code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'security.confirmEnrollment' }));

    expect(await screen.findByText('AAAA-2345')).toBeTruthy();
    expect(screen.getByText('BBBB-6789')).toBeTruthy();
    expect(screen.getByText('security.recoveryCodesTitle')).toBeTruthy();
  });

  it('shows MFA status, lists break-glass credentials, and creates one (secret shown once)', async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url === '/auth/mfa/status') {
        return { data: { mfaEnabled: true, mfaEnrolledAt: '2026-10-25T09:00:00.000Z', recoveryCodesRemaining: 9, adminMfaRequired: true } };
      }
      return { data: [activeCredential] };
    });
    postMock.mockImplementation(async (url: string) => {
      if (url === '/auth/break-glass/credentials') {
        return { data: { id: 'bg-2', label: 'Second envelope', secret: 'ABCDE-FGHIJ-KLMNP-QRSTU', expiresAt: '2027-01-23T10:00:00.000Z' } };
      }
      throw new Error(`unexpected POST ${url}`);
    });

    renderTab();

    expect(await screen.findByText('security.statusEnabled')).toBeTruthy();
    expect(await screen.findByText('Sealed envelope — office safe')).toBeTruthy();
    expect(screen.getByText('security.status.active')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('security.breakGlassLabel'), { target: { value: 'Second envelope' } });
    fireEvent.change(screen.getByLabelText('security.currentPassword'), { target: { value: 'current-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'security.createBreakGlass' }));

    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/auth/break-glass/credentials', {
      label: 'Second envelope', password: 'current-password', expiresInDays: 90,
    }));
    expect(await screen.findByText('ABCDE-FGHIJ-KLMNP-QRSTU')).toBeTruthy();
  });

  it('renders an expired credential badge and shows an error when creation fails', async () => {
    const expiredCredential = {
      ...activeCredential,
      id: 'bg-9',
      label: 'Expired envelope',
      status: 'EXPIRED',
    };
    getMock.mockImplementation(async (url: string) => {
      if (url === '/auth/mfa/status') {
        return { data: { mfaEnabled: true, mfaEnrolledAt: '2026-10-25T09:00:00.000Z', recoveryCodesRemaining: 4, adminMfaRequired: false } };
      }
      return { data: [expiredCredential] };
    });
    // No server message -> the component falls back to its own error copy.
    postMock.mockRejectedValue({ response: { data: {} } });

    renderTab();

    expect(await screen.findByText('Expired envelope')).toBeTruthy();
    expect(screen.getByText('security.status.expired')).toBeTruthy();
    // Expired credentials cannot be revoked.
    expect(screen.queryByRole('button', { name: /security.revoke/ })).toBeNull();

    fireEvent.change(screen.getByLabelText('security.breakGlassLabel'), { target: { value: 'Doomed' } });
    fireEvent.change(screen.getByLabelText('security.currentPassword'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'security.createBreakGlass' }));
    expect(await screen.findByText('security.breakGlassCreateFailed')).toBeTruthy();
  });

  it('lets an enrolled admin re-enrol, replacing the old secret', async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url === '/auth/mfa/status') {
        return { data: { mfaEnabled: true, mfaEnrolledAt: '2026-10-25T09:00:00.000Z', recoveryCodesRemaining: 9, adminMfaRequired: false } };
      }
      return { data: [] };
    });
    postMock.mockImplementation(async (url: string) => {
      if (url === '/auth/mfa/enrollment/start') {
        return { data: { otpauthUrl: 'otpauth://totp/y', secret: 'KLMNPQRSTUVWXJK', expiresInSeconds: 600 } };
      }
      throw new Error(`unexpected POST ${url}`);
    });

    const { byId } = renderTab();
    fireEvent.click(await screen.findByRole('button', { name: 'security.reEnroll' }));
    await waitFor(() => expect(byId('enroll-password')).toBeTruthy());
    fireEvent.change(byId('enroll-password'), { target: { value: 'current-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'security.startEnrollment' }));
    expect(await screen.findByText('KLMNPQRSTUVWXJK')).toBeTruthy();
  });

  it('revokes an active credential after an inline confirm', async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url === '/auth/mfa/status') {
        return { data: { mfaEnabled: true, mfaEnrolledAt: '2026-10-25T09:00:00.000Z', recoveryCodesRemaining: 9, adminMfaRequired: false } };
      }
      return { data: [activeCredential] };
    });

    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: /security.revoke/ }));
    fireEvent.click(screen.getByRole('button', { name: 'security.confirmRevoke' }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('/auth/break-glass/credentials/bg-1'));
  });
});
