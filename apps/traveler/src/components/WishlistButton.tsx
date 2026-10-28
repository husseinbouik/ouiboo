'use client';

import React from 'react';
import { Heart } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/AuthContext';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';
import { useToast } from '@ouiboo/ui';
import { optimisticHandlers } from '@/lib/optimistic';

interface WishlistButtonProps {
  tripId: string;
  className?: string;
}

interface WishlistStatus {
  isWishlisted: boolean;
}

/**
 * #484: migrated from the hand-rolled useState mirror onto the shared
 * optimistic pattern (@/lib/optimistic): onMutate snapshots + applies,
 * onError rolls back AND surfaces the error toast, onSettled
 * invalidates so server truth wins.
 *
 * #485: a successful removal offers Undo in the toast — Undo performs
 * the real inverse mutation (re-add), so it stays truthful if the
 * server state changed in between.
 */
export function WishlistButton({ tripId, className }: WishlistButtonProps) {
  const { t } = useTranslation();
  const { user, setShowLoginModal } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check if trip is wishlisted
  const { data: wishlistData } = useQuery<WishlistStatus>({
    queryKey: ['wishlist-status', tripId],
    queryFn: async () => {
      const response = await apiClient.get(`/users/wishlist/${tripId}/is-wishlisted`);
      return response.data;
    },
    enabled: !!user,
  });

  const isWishlisted = wishlistData?.isWishlisted || false;

  const toggleMutation = useMutation({
    mutationFn: async (next: boolean) => {
      if (next) {
        await apiClient.post(`/users/wishlist/${tripId}`);
      } else {
        await apiClient.delete(`/users/wishlist/${tripId}`);
      }
    },
    ...optimisticHandlers<boolean>(queryClient, {
      patches: (next) => [
        {
          queryKey: ['wishlist-status', tripId],
          update: () => ({ isWishlisted: next }),
        },
      ],
      invalidateKeys: [
        ['wishlist-status', tripId],
        ['wishlist-count'],
        ['wishlist'],
      ],
      onError: () => {
        toast({
          title: t('wishlist.updateFailed'),
          variant: 'error',
          dismissLabel: t('common.closeDialog'),
        });
      },
    }),
    onSuccess: (_data, next) => {
      if (!next) {
        toast({
          title: t('wishlist.removed'),
          dismissLabel: t('common.closeDialog'),
          action: {
            label: t('common.undo'),
            onClick: () => toggleMutation.mutate(true),
          },
        });
      }
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    toggleMutation.mutate(!isWishlisted);
  };

  const isLoading_ = toggleMutation.isPending;

  return (
    <motion.button
      onClick={handleClick}
      disabled={isLoading_}
      aria-label={isWishlisted ? t('tripCard.wishlistRemove') : t('tripCard.wishlistAdd')}
      aria-pressed={isWishlisted}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'inline-flex items-center justify-center p-3 rounded-full backdrop-blur-md transition-all duration-300 shadow-md',
        // #571: white/20 over a bright photo made the heart nearly
        // invisible. A dark scrim keeps it legible on any photo while
        // staying recognisably an overlay control.
        'bg-black/40 hover:bg-black/55',
        'border border-white/40',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      <motion.div
        animate={isLoading_ ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.6, repeat: isLoading_ ? Infinity : 0 }}
      >
        <Heart
          className={cn(
            'w-5 h-5 transition-all duration-300',
            isWishlisted
              ? 'fill-danger text-danger'
              : 'text-white'
          )}
        />
      </motion.div>
    </motion.button>
  );
}
