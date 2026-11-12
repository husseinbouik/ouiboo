import { WishlistService } from './wishlist.service';

/**
 * #962 (search-page council item 16): the wishlist list must return
 * deactivated saves flagged `isActive: false` instead of filtering
 * them out — the old status filter, paired with a count endpoint
 * that counts every save, made the header badge and the page
 * permanently disagree.
 */
describe('WishlistService.getUserWishlist (#962)', () => {
  const tripFixture = (id: string, status: string) => ({
    id,
    status,
    title: `Trip ${id}`,
    description: `Description ${id}`,
    translations: null,
    imageAlts: null,
    startLocation: 'Tangier',
    sessions: [],
    agency: { id: 'agency-1', companyName: 'Atlas', logo: null },
  });

  function makeService(rows: Array<{ tripTemplate: unknown }>, total: number) {
    const prisma = {
      wishlist: {
        findMany: jest.fn().mockResolvedValue(rows),
        count: jest.fn().mockResolvedValue(total),
      },
    };
    return { service: new WishlistService(prisma as never), prisma };
  }

  it('queries saves WITHOUT a trip-status filter', async () => {
    const { service, prisma } = makeService([], 0);
    await service.getUserWishlist('user-1', 1, 20, 'en');
    const findManyArgs = prisma.wishlist.findMany.mock.calls[0][0];
    expect(findManyArgs.where).toEqual({ userId: 'user-1' });
    const countArgs = prisma.wishlist.count.mock.calls[0][0];
    expect(countArgs.where).toEqual({ userId: 'user-1' });
  });

  it('returns deactivated saves flagged isActive=false alongside active ones', async () => {
    const rows = [
      { tripTemplate: tripFixture('t-active', 'ACTIVE') },
      { tripTemplate: tripFixture('t-gone', 'INACTIVE') },
    ];
    const { service } = makeService(rows, 2);
    const result = await service.getUserWishlist('user-1', 1, 20, 'en');
    expect(result.total).toBe(2);
    const byId = new Map(result.items.map((item) => [item.id, item.isActive]));
    expect(byId.get('t-active')).toBe(true);
    expect(byId.get('t-gone')).toBe(false);
  });

  it('getWishlistCount counts every save (the badge basis the page now matches)', async () => {
    const prisma = { wishlist: { count: jest.fn().mockResolvedValue(7) } };
    const service = new WishlistService(prisma as never);
    await expect(service.getWishlistCount('user-1')).resolves.toBe(7);
    expect(prisma.wishlist.count.mock.calls[0][0].where).toEqual({ userId: 'user-1' });
  });
});
