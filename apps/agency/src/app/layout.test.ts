/**
 * #491: the root layout must opt into viewport-fit=cover. Without it,
 * env(safe-area-inset-*) resolves to 0 on notched devices and the
 * pb-safe / pt-safe utilities in @ouiboo/tokens have nothing to
 * consume — sticky bars and sheet footers slide under the home
 * indicator.
 */
import { viewport } from './layout';

describe('root layout viewport (#491)', () => {
    it('opts into viewport-fit=cover', () => {
        expect(viewport.viewportFit).toBe('cover');
    });
});
