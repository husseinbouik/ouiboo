'use client';

import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/AuthContext';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';

interface WishlistButtonProps {
  tripId: string;
  className?: string;
}

export function WishlistButton({ tripId, className }: WishlistButtonProps) {
  const { t } = useTranslation();
  const { user, setShowLoginModal } = useAuth();
  const queryClient = useQueryClient();
  const [isOptimistic, setIsOptimistic] = useState(false);
  const [optimisticState, setOptimisticState] = useState(false);

  // Check if trip is wishlisted
  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist-status', tripId],
    queryFn: async () => {
      const response = await apiClient.get(`/users/wishlist/${tripId}/is-wishlisted`);
      return response.data;
    },
    enabled: !!user,
  });

  const isWishlisted = isOptimistic ? optimisticState : wishlistData?.isWishlisted || false;

  // Mutation to add to wishlist
  const addMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/users/wishlist/${tripId}`);
    },
    onSuccess: () => {
      setIsOptimistic(false);
      queryClient.invalidateQueries({ queryKey: ['wishlist-status', tripId] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-count'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: () => {
      setIsOptimistic(false);
      setOptimisticState(false);
    },
  });

  // Mutation to remove from wishlist
  const removeMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/users/wishlist/${tripId}`);
    },
    onSuccess: () => {
      setIsOptimistic(false);
      queryClient.invalidateQueries({ queryKey: ['wishlist-status', tripId] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-count'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: () => {
      setIsOptimistic(false);
      setOptimisticState(true);
    },
  });

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    // Optimistic update
    setIsOptimistic(true);
    setOptimisticState(!isWishlisted);

    if (isWishlisted) {
      removeMutation.mutate();
    } else {
      addMutation.mutate();
    }
  };

  const isLoading_ = addMutation.isPending || removeMutation.isPending;

  return (
    <motion.button
      onClick={handleClick}
      disabled={isLoading_}
      aria-label={isWishlisted ? t('tripCard.wishlistRemove') : t('tripCard.wishlistAdd')}
      aria-pressed={isWishlisted}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'inline-flex items-center justify-center p-2.5 rounded-full backdrop-blur-md transition-all duration-300',
        'bg-white/20 hover:bg-white/30',
        'border border-white/30',
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

