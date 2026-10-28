import 'reflect-metadata';
import { UserRole } from '@ouiboo/types';
import { AdminDiagnosticsController } from './admin-diagnostics.controller';
import { buildServerFlagsSnapshot } from './server-flags';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('Admin diagnostics (#580 rework)', () => {
  const fakeFlags = {
    getKnownFlags: () => ['NEW_CHECKOUT', 'BETA_X'],
    isEnabled: (name: string) => name === 'NEW_CHECKOUT',
  };

  it('the controller is gated to the admin role', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminDiagnosticsController)).toEqual([UserRole.Admin]);
  });

  it('the controller returns the snapshot built from the flag service', () => {
    const controller = new AdminDiagnosticsController(fakeFlags as never);
    const snapshot = controller.getFlags();
    expect(snapshot.featureFlags).toEqual([
      { name: 'BETA_X', enabled: false },
      { name: 'NEW_CHECKOUT', enabled: true },
    ]);
    expect(typeof snapshot.generatedAt).toBe('string');
  });

  it('the snapshot reports effective env-backed flags and never env values', () => {
    const snapshot = buildServerFlagsSnapshot(
      fakeFlags,
      { NODE_ENV: 'production', ADMIN_MFA_REQUIRED: 'true' } as NodeJS.ProcessEnv,
      new Date('2026-10-28T00:00:00.000Z'),
    );
    expect(snapshot.environment).toBe('production');
    expect(snapshot.flags.adminMfaRequired).toBe(true);
    // MAD_ONLY_CATALOG is unset in the test env: the gate defaults ON.
    expect(snapshot.flags.madOnlyCatalog).toBe(true);
    expect(JSON.stringify(snapshot)).not.toContain('process.env');
  });

  it('unknown flags stay fail-closed in the snapshot', () => {
    const snapshot = buildServerFlagsSnapshot(
      { getKnownFlags: () => [], isEnabled: () => false },
      {} as NodeJS.ProcessEnv,
    );
    expect(snapshot.featureFlags).toEqual([]);
    expect(snapshot.flags.adminMfaRequired).toBe(false);
    expect(snapshot.environment).toBe('unknown');
  });
});
