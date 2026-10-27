import { QueryClient } from '@tanstack/react-query';
import {
  applyOptimisticPatches,
  rollbackOptimisticPatches,
  optimisticHandlers,
} from './optimistic';

describe('shared optimistic-update pattern (#484)', () => {
  it('applies a patch instantly and rolls it back exactly', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['wishlist-status', 'trip-1'], { isWishlisted: false });

    const snapshots = await applyOptimisticPatches(queryClient, [
      {
        queryKey: ['wishlist-status', 'trip-1'],
        update: () => ({ isWishlisted: true }),
      },
    ]);
    expect(queryClient.getQueryData(['wishlist-status', 'trip-1'])).toEqual({
      isWishlisted: true,
    });

    rollbackOptimisticPatches(queryClient, snapshots);
    expect(queryClient.getQueryData(['wishlist-status', 'trip-1'])).toEqual({
      isWishlisted: false,
    });
  });

  it('mutation handlers: onMutate applies, onError rolls back before the error callback, onSettled invalidates', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['wishlist-status', 'trip-1'], { isWishlisted: true });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const seenAtErrorCallback: unknown[] = [];
    const handlers = optimisticHandlers<boolean>(queryClient, {
      patches: (next) => [
        {
          queryKey: ['wishlist-status', 'trip-1'],
          update: () => ({ isWishlisted: next }),
        },
      ],
      invalidateKeys: [['wishlist-status', 'trip-1'], ['wishlist']],
      onError: () => {
        // The error toast fires from here — the UI must already be
        // rolled back by the time this runs.
        seenAtErrorCallback.push(
          queryClient.getQueryData(['wishlist-status', 'trip-1']),
        );
      },
    });

    const context = await handlers.onMutate(false);
    expect(queryClient.getQueryData(['wishlist-status', 'trip-1'])).toEqual({
      isWishlisted: false,
    });

    handlers.onError(new Error('server rejected'), false, context);
    expect(queryClient.getQueryData(['wishlist-status', 'trip-1'])).toEqual({
      isWishlisted: true,
    });
    expect(seenAtErrorCallback).toEqual([{ isWishlisted: true }]);

    handlers.onSettled();
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['wishlist-status', 'trip-1'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['wishlist'] });
  });
});
