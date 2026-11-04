/**
 * Final logo (#794): V1 "Route-End" symbol + W3 "Destination Tittle"
 * wordmark, one logo everywhere.
 *
 * Replaces the Session #3 P0-4 (#552) pin guards. These guards pin
 * both halves of the rollout: the new mark's geometry (copied exactly
 * from the production masters — the interim Pin geometry must be
 * GONE), the small-size tittle rule, and an adoption inventory over
 * every brand lockup in the repo (each renders the shared LogoLockup,
 * or the symbol-only Logo where a lockup cannot fit / is intended).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const repoFile = (rel: string) =>
  readFileSync(resolve(__dirname, '../../', rel), 'utf8');

const logoSource = readFileSync(resolve(__dirname, 'Logo.tsx'), 'utf8');

/** Every brand lockup surface: each must render the shared LogoLockup. */
const LOCKUPS: Record<string, string> = {
  'traveller navbar (desktop + mobile)': 'apps/traveler/src/components/Navbar.tsx',
  'traveller auth lockup': 'apps/traveler/src/components/AuthBrandLockup.tsx',
  'traveller auth side wordmark': 'apps/traveler/src/components/AuthSideWordmark.tsx',
  'traveller global footer': 'apps/traveler/src/components/Footer.tsx',
  'agency sidebar': 'apps/agency/src/components/layout/AgencySidebar.tsx',
  'agency mobile nav': 'apps/agency/src/components/AgencyMobileNav.tsx',
  'agency auth side wordmark': 'apps/agency/src/components/AuthSideWordmark.tsx',
  'admin shell': 'apps/admin/src/components/dashboard/DashboardShell.tsx',
  'admin login': 'apps/admin/src/app/login/page.tsx',
  'landing page': 'apps/landing/src/components/LandingPage.tsx',
  'landing agences page': 'apps/landing/src/components/AgencesPage.tsx',
};

describe('Logo geometry (final mark, #794)', () => {
  it('carries the Route-End ring path from the master', () => {
    expect(logoSource).toContain('M 86.41 54.39 A 27.0 27.0 0 1 1 41.24 40.58');
  });

  it('carries the sunset-orange route arc path from the master', () => {
    expect(logoSource).toContain('M 44.13 38.16 A 27.0 27.0 0 0 1 68.34 34.32');
    expect(logoSource).toContain('#FF6B35');
  });

  it('carries the destination dot just past the arc end', () => {
    expect(logoSource).toContain('<circle cx="80.68" cy="42.64" r={dotRadius} fill={ORANGE} />');
    expect(logoSource).toContain('dotRadius={8.5}');
  });

  it('renders the symbol on the 120-unit master grid', () => {
    expect(logoSource).toContain('viewBox="0 0 120 120"');
    expect(logoSource).toContain('viewBox="0 0 427 120"');
    expect(logoSource).not.toContain('viewBox="0 0 32 32"');
  });

  it('the interim Pin geometry is absent', () => {
    expect(logoSource).not.toContain('M16 21.6');
    expect(logoSource).not.toContain('M16 23.2');
    expect(logoSource).not.toContain('M16 21.4');
    expect(logoSource).not.toContain('<circle cx="16" cy="13.8" r="1.5"');
  });

  it('ring and letters follow currentColor; the tile cut is the app-tile master', () => {
    expect(logoSource).toContain('ringStroke="currentColor"');
    expect(logoSource).toContain('<rect x="8" y="8" width="104" height="104" rx="27" fill={NAVY} />');
    expect(logoSource).toContain('translate(10.8 10.8) scale(0.82)');
    expect(logoSource).toContain('dotRadius={9.25}');
  });

  it('small-size rule: below 24px the tittle takes the letter colour', () => {
    expect(logoSource).toContain('height < 24');
    expect(logoSource).toContain('isSmall ? "currentColor" : ORANGE');
  });

  it('exports Logo, LogoWordmark and LogoLockup', () => {
    expect(logoSource).toContain('export const Logo =');
    expect(logoSource).toContain('export const LogoWordmark =');
    expect(logoSource).toContain('export const LogoLockup =');
  });

  it('no other copy of the interim Pin geometry survives', () => {
    const copies = [
      'apps/api/src/email/email-template.ts',
      'apps/landing/src/lib/og-image.tsx',
      'apps/traveler/src/app/opengraph-image.tsx',
    ];
    for (const file of copies) {
      const src = repoFile(file);
      expect(src).not.toContain('M16 21.6');
      expect(src).not.toContain('M16 23.2');
      expect(src).not.toContain('M16 21.4');
      expect(src).toContain('80.68');
      expect(src).toContain('42.64');
    }
  });

  it('the OG images use the app-tile master geometry', () => {
    for (const file of [
      'apps/landing/src/lib/og-image.tsx',
      'apps/traveler/src/app/opengraph-image.tsx',
    ]) {
      const src = repoFile(file);
      expect(src).toContain('viewBox="0 0 120 120"');
      expect(src).toContain('translate(10.8 10.8) scale(0.82)');
      expect(src).toContain('r="9.25"');
    }
  });

  it('the email header uses the on-dark primary lockup geometry', () => {
    const src = repoFile('apps/api/src/email/email-template.ts');
    expect(src).toContain('EMAIL_LOGO_SVG');
    expect(src).toContain('M 86.41 54.39 A 27.0 27.0 0 1 1 41.24 40.58');
    expect(src).toContain('viewBox="0 0 427 120"');
  });
});

describe('Logo adoption inventory (#794)', () => {
  for (const [surface, file] of Object.entries(LOCKUPS)) {
    it(`${surface} renders the shared <LogoLockup>`, () => {
      expect(repoFile(file)).toContain('<LogoLockup');
    });
  }

  it('agency sidebar collapsed state renders the symbol alone', () => {
    const src = repoFile('apps/agency/src/components/layout/AgencySidebar.tsx');
    expect(src).toContain('<LogoLockup');
    expect(src).toMatch(/<Logo[\s/>]/);
  });

  it('SafeImage placeholder keeps the symbol-only <Logo>', () => {
    expect(repoFile('packages/ui/SafeImage.tsx')).toContain('<Logo');
  });

  it('no lockup pairs the mark with a hand-typeset "Ouiboo" span any more', () => {
    for (const file of Object.values(LOCKUPS)) {
      expect(repoFile(file)).not.toMatch(/<span[^>]*>\s*Ouiboo\s*<\/span>/);
      expect(repoFile(file)).not.toContain("{t('dashboard.brand')}");
      expect(repoFile(file)).not.toContain("{t('login.brand')}");
    }
  });

  it('the BETA pill stays a separate badge beside the lockup', () => {
    for (const file of Object.values(LOCKUPS)) {
      expect(repoFile(file)).toContain('<BetaBadge');
    }
    expect(logoSource).not.toContain('<BetaBadge');
  });

  it('no lockup hand-rolls a letter-O tile any more', () => {
    const handRolled = />\s*O\s*<\/div>|font-black text-lg">O</;
    for (const file of Object.values(LOCKUPS)) {
      expect(repoFile(file)).not.toMatch(handRolled);
    }
  });

  it('the admin shell no longer renders an empty orange square as its mark', () => {
    expect(repoFile('apps/admin/src/components/dashboard/DashboardShell.tsx')).not.toContain(
      'h-8 w-8 bg-sunset-orange rounded-lg"></div>',
    );
  });
});
