import { getAdminBuildInfo } from './build-info';

describe('getAdminBuildInfo (#580)', () => {
  it('stamps the short build SHA and environment when the build provided them', () => {
    const info = getAdminBuildInfo({
      NEXT_PUBLIC_BUILD_SHA: '0caadd2699bce8ae8335a171357c466b282dc9cb',
      NEXT_PUBLIC_BUILD_ENV: 'preview',
      NEXT_PUBLIC_SHARING_ENABLED: 'true',
      NEXT_PUBLIC_BETA_BADGE: 'true',
    });
    expect(info.buildSha).toBe('0caadd2');
    expect(info.environment).toBe('preview');
    expect(info.sharingEnabled).toBe(true);
    expect(info.betaBadgeEnabled).toBe(true);
  });

  it('reports unknown — never a guess — when the build carried no stamp', () => {
    const info = getAdminBuildInfo({});
    expect(info.buildSha).toBe('unknown');
    expect(info.environment).toBe('unknown');
  });

  it('keeps the fail-closed flag semantics of the shared gates', () => {
    expect(getAdminBuildInfo({ NEXT_PUBLIC_SHARING_ENABLED: 'TRUE' }).sharingEnabled).toBe(false);
    expect(getAdminBuildInfo({}).sharingEnabled).toBe(false);
    expect(getAdminBuildInfo({ NEXT_PUBLIC_BETA_BADGE: 'false' }).betaBadgeEnabled).toBe(false);
    expect(getAdminBuildInfo({}).betaBadgeEnabled).toBe(true);
  });

  it('never claims server flags are derivable from the client build', () => {
    expect(getAdminBuildInfo({}).serverFlagsDerivable).toBe(false);
  });

  it('falls back to the Vercel system-env stamp when the config stamp is absent (#580 rework)', () => {
    const info = getAdminBuildInfo({
      NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: 'b56adc4deadbeefdeadbeefdeadbeefdeadbeef',
      NEXT_PUBLIC_VERCEL_ENV: 'preview',
    });
    expect(info.buildSha).toBe('b56adc4');
    expect(info.fullBuildSha).toBe('b56adc4deadbeefdeadbeefdeadbeefdeadbeef');
    expect(info.environment).toBe('preview');
  });

  it('prefers the config stamp over the Vercel system-env stamp', () => {
    const info = getAdminBuildInfo({
      NEXT_PUBLIC_BUILD_SHA: 'aaaaaaaabbbbbbbb',
      NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: 'ccccccccdddddddd',
      NEXT_PUBLIC_BUILD_ENV: 'production',
      NEXT_PUBLIC_VERCEL_ENV: 'preview',
    });
    expect(info.buildSha).toBe('aaaaaaa');
    expect(info.environment).toBe('production');
  });
});
