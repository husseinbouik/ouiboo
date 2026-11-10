import * as fs from 'fs';
import * as path from 'path';

/**
 * #690 (Council S6): PWA assets — the traveller app must be installable
 * and its service worker must be auth-aware: API traffic is never
 * cached, and the only offline artefact is the Booking Pass the
 * booking page persists on-device once loaded.
 */
const publicDir = path.join(__dirname, '..', '..', 'public');

describe('PWA assets (#690)', () => {
    it('ships a valid manifest with name, standalone display and icons', () => {
        const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'manifest.webmanifest'), 'utf8'));
        expect(manifest.name).toContain('Ouiboo');
        expect(manifest.short_name).toBe('Ouiboo');
        expect(manifest.display).toBe('standalone');
        expect(manifest.start_url).toBeTruthy();
        expect(Array.isArray(manifest.icons)).toBe(true);
        expect(manifest.icons.length).toBeGreaterThan(0);
    });

    it('the service worker never caches API traffic and supports logout cache clearing', () => {
        const sw = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8');
        expect(sw).toContain("/api/");
        expect(sw).toContain('ouiboo:clear-caches');
        expect(sw).toContain('navigate');
        // No blanket cache-everything handler.
        expect(sw).not.toContain('cache.addAll');
    });

    it('the service worker never caches a redirect or error page (#864)', () => {
        const sw = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8');
        // Navigations: only a 200 document is stored — a proxy 307 to
        // /login cached under /bookings would replay the sign-in wall
        // offline for a signed-in user.
        expect(sw).toContain('response.status === 200');
        // Static assets: only an ok response is stored.
        expect(sw).toContain('response.ok');
        // No unconditional cache.put of a navigation response survives.
        expect(sw).not.toMatch(/const response = await fetch\(request\);\n\s*const cache = await caches\.open/);
    });
});
