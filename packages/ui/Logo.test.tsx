/**
 * Council Session #3 P0-4 (#552): one logo, everywhere, readable.
 *
 * PR #540 changed the shared Logo component but most surfaces never
 * consumed it — the traveller navbar, agency sidebar and auth screens
 * hand-rolled letter-"O" tiles (two of them recoloured), the side
 * wordmarks had no mark, and the admin shell showed an empty orange
 * square. The pin was also drawn at ~9 of 32 units, unreadable at
 * navbar size. These guards pin both halves: the redrawn geometry,
 * and an adoption inventory over every brand lockup in the repo.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const repoFile = (rel: string) =>
  readFileSync(resolve(__dirname, '../../', rel), 'utf8');

const logoSource = readFileSync(resolve(__dirname, 'Logo.tsx'), 'utf8');

/** Every brand lockup surface: each must render the shared component. */
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
};

describe('Logo geometry (Session #3 P0-4)', () => {
  it('pin head radius is at least 4.6 units', () => {
    const m = logoSource.match(/A(\d+(?:\.\d+)?) \d+(?:\.\d+)? 0 1 1/);
    expect(m).not.toBeNull();
    expect(parseFloat(m![1])).toBeGreaterThanOrEqual(4.6);
  });

  it('pin tip reaches y≈23.2 (pin height ≥13 units)', () => {
    const m = logoSource.match(/M16 (\d+(?:\.\d+)?)C/);
    expect(m).not.toBeNull();
    expect(parseFloat(m![1])).toBeGreaterThanOrEqual(23);
  });

  it('keeps the navy centre dot of the adopted concept', () => {
    expect(logoSource).toContain('<circle cx="16" cy="14.4" r="1.8" fill="#0A192F" />');
  });
});

describe('Logo adoption inventory (Session #3 P0-4)', () => {
  for (const [surface, file] of Object.entries(LOCKUPS)) {
    it(`${surface} renders the shared <Logo>`, () => {
      expect(repoFile(file)).toContain('<Logo');
    });
  }

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
