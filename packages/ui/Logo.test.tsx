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
  // Rework (#552, verification FAIL 2026-10-28): the ring is an annulus
  // with INNER radius 6 around centre (16, 16). The previous pin (head
  // r=4.6 at (16, 14.4), tip y=23.2 = radius 7.2) painted over the ring
  // and read as a dot bursting out of the circle. The pin must stay
  // CONTAINED inside the ring: every point within radius < 6 of
  // (16, 16). Draft geometry, verified numerically by sampling the
  // path: head r=3.4 centred (16, 14.8), tip (16, 21.4) at radius 5.4,
  // sampled max radius 5.40 < 5.9.
  const pinPath = logoSource.match(/d="(M16 21\.4[^"]+)"/);

  it('pin path is present with tip at (16, 21.4) — radius 5.4 from centre', () => {
    expect(pinPath).not.toBeNull();
    expect(Math.hypot(16 - 16, 21.4 - 16)).toBeLessThan(5.9);
  });

  it('pin head radius is 3.4 units centred at (16, 14.8)', () => {
    const m = logoSource.match(/A(\d+(?:\.\d+)?) \d+(?:\.\d+)? 0 1 1/);
    expect(m).not.toBeNull();
    expect(parseFloat(m![1])).toBeCloseTo(3.4);
    // Head top (14.8 - 3.4 = 11.4) is the farthest head point from the
    // ring centre: radius 4.6, still inside the ring's inner radius 6.
    expect(16 - (14.8 - 3.4)).toBeLessThan(6);
  });

  it('every sampled point of the pin stays within radius < 5.9 of (16, 16)', () => {
    expect(pinPath).not.toBeNull();
    // Sample the two cubic shoulders and the head arc of the pin path.
    const cubic = (p0: number[], p1: number[], p2: number[], p3: number[]) => {
      const pts: number[][] = [];
      for (let i = 0; i <= 200; i++) {
        const t = i / 200;
        const u = 1 - t;
        pts.push([
          u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
          u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1],
        ]);
      }
      return pts;
    };
    const pts = [
      ...cubic([16, 21.4], [15.3, 19.8], [12.6, 17.9], [12.6, 14.8]),
      ...cubic([19.4, 14.8], [19.4, 17.9], [16.7, 19.8], [16, 21.4]),
    ];
    for (let i = 0; i <= 200; i++) {
      const a = Math.PI - (Math.PI * i) / 200;
      pts.push([16 + 3.4 * Math.cos(a), 14.8 - 3.4 * Math.sin(a)]);
    }
    const maxRadius = Math.max(...pts.map(([x, y]) => Math.hypot(x - 16, y - 16)));
    expect(maxRadius).toBeLessThan(5.9);
  });

  it('keeps the navy centre dot of the adopted concept', () => {
    expect(logoSource).toContain('<circle cx="16" cy="14.8" r="1.5" fill="#0A192F" />');
  });

  it('no other copy of the pin geometry still paints over the ring', () => {
    const copies = [
      'apps/api/src/email/email-template.ts',
      'apps/landing/src/lib/og-image.tsx',
      'apps/traveler/src/app/opengraph-image.tsx',
    ];
    for (const file of copies) {
      const src = repoFile(file);
      expect(src).toContain('M16 21.4C15.3 19.8 12.6 17.9 12.6 14.8A3.4 3.4 0 1 1 19.4 14.8');
      expect(src).not.toContain('M16 23.2');
    }
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
