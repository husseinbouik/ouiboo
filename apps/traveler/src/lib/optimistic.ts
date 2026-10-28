import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * #484: the shared optimistic-update pattern for React Query mutations.
 *
 * Before this helper, the only optimistic interaction in the app was
 * hand-rolled inside WishlistButton (local useState mirroring the
 * server value); every other mutation waited for the server. New
 * optimistic mutations use this pattern instead of re-inventing it:
 *
 *   const mutation = useMutation({
 *     mutationFn,
 *     ...optimisticHandlers(queryClient, {
 *       patches: (vars) => [{ queryKey, update: (old) => next }],
 *       invalidateKeys: [keyA, keyB],   // invalidated on settle
 *       onError: () => toast(...),      // runs AFTER rollback
 *     }),
 *   })
 *
 * Guarantees:
 * - onMutate cancels in-flight refetches for the patched keys, snapshots
 *   their current values, then applies the patches synchronously — the
 *   UI reflects the change in the same frame as the tap.
 * - onError restores every snapshot exactly (rollback) BEFORE the
 *   optional error callback runs, so an error toast never accompanies a
 *   UI state the server rejected.
 * - onSettled invalidates the listed keys so server truth replaces the
 *   optimistic value either way.
 *
 * Money / state-machine mutations (payment confirmation, refunds,
 * booking state transitions) must NOT use this — they stay pessimistic
 * by design (#484). Use it for high-frequency, low-risk, reversible
 * state: wishlist toggles, profile fields, publish toggles.
 */

export interface OptimisticPatch<TData = unknown> {
  queryKey: QueryKey;
  update: (previous: TData | undefined) => TData | undefined;
}

export type OptimisticSnapshots = Array<[QueryKey, unknown]>;

/** Snapshot + apply. Returns the snapshots for {@link rollbackOptimistic}. */
export async function applyOptimisticPatches(
  queryClient: QueryClient,
  patches: readonly OptimisticPatch[],
): Promise<OptimisticSnapshots> {
  const snapshots: OptimisticSnapshots = [];
  for (const patch of patches) {
    await queryClient.cancelQueries({ queryKey: patch.queryKey });
    snapshots.push([patch.queryKey, queryClient.getQueryData(patch.queryKey)]);
    queryClient.setQueryData(patch.queryKey, (previous: unknown) =>
      patch.update(previous as never),
    );
  }
  return snapshots;
}

/** Restore every snapshot taken by {@link applyOptimisticPatches}. */
export function rollbackOptimisticPatches(
  queryClient: QueryClient,
  snapshots: OptimisticSnapshots | undefined,
): void {
  if (!snapshots) return;
  for (const [queryKey, value] of snapshots) {
    queryClient.setQueryData(queryKey, value);
  }
}

export interface OptimisticHandlersOptions<TVariables> {
  /** Patches to apply for these mutation variables. */
  patches: (variables: TVariables) => readonly OptimisticPatch[];
  /** Keys invalidated on settle (prefix-matched), success or failure. */
  invalidateKeys?: readonly QueryKey[];
  /** Runs after rollback — surface the error toast here. */
  onError?: (error: unknown, variables: TVariables) => void;
}

interface OptimisticContext {
  snapshots: OptimisticSnapshots;
}

/**
 * React Query mutation handlers implementing the shared pattern.
 * Spread the result into useMutation alongside `mutationFn`.
 */
export function optimisticHandlers<TVariables>(
  queryClient: QueryClient,
  options: OptimisticHandlersOptions<TVariables>,
) {
  return {
    onMutate: async (variables: TVariables): Promise<OptimisticContext> => {
      const snapshots = await applyOptimisticPatches(
        queryClient,
        options.patches(variables),
      );
      return { snapshots };
    },
    onError: (
      error: unknown,
      variables: TVariables,
      context: OptimisticContext | undefined,
    ) => {
      rollbackOptimisticPatches(queryClient, context?.snapshots);
      options.onError?.(error, variables);
    },
    onSettled: () => {
      for (const queryKey of options.invalidateKeys ?? []) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  };
}
