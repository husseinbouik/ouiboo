import React from 'react';
import { render } from '@testing-library/react';
import {
  Skeleton,
  TripCardSkeleton,
  TripCardSkeletonGrid,
  TripDetailSkeleton,
  CardListSkeleton,
} from '@ouiboo/ui';
import {
  BookingCardSkeleton,
  BookingListSkeleton,
  BookingDetailSkeleton,
  CheckoutSkeleton,
  ListRowSkeleton,
} from './Skeletons';

/**
 * #469: skeleton screens mirror the shapes they stand in for, stay
 * decorative for assistive tech (aria-hidden; the surface announces
 * loading), and never animate for reduced-motion users.
 */
describe('loading skeletons (#469)', () => {
  it('Skeleton pulses only when motion is safe (prefers-reduced-motion)', () => {
    const { container } = render(<Skeleton data-testid="sk" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain('motion-safe:animate-pulse');
    expect(el.className.split(/\s+/)).not.toContain('animate-pulse');
  });

  it('TripCardSkeleton mirrors the TripCard layout (h-64 image, p-6 body)', () => {
    const { container } = render(<TripCardSkeleton />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.className).toContain('rounded-[2rem]');
    expect(container.querySelector('.h-64')).not.toBeNull();
  });

  it('TripCardSkeletonGrid renders the requested number of cards', () => {
    const { container } = render(<TripCardSkeletonGrid count={4} />);
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.getAttribute('aria-hidden')).toBe('true');
    expect(grid.childElementCount).toBe(4);
  });

  it('TripDetailSkeleton mirrors the detail gallery and booking panel', () => {
    const { container } = render(<TripDetailSkeleton />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    // Gallery block matches the detail page's responsive gallery heights.
    expect(container.querySelector('.h-\\[280px\\]')).not.toBeNull();
    expect(container.querySelector('.lg\\:h-\\[600px\\]')).not.toBeNull();
  });

  it('BookingCardSkeleton mirrors the horizontal booking card', () => {
    const { container } = render(<BookingCardSkeleton />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.md\\:w-72')).not.toBeNull();
  });

  it('BookingListSkeleton renders the requested number of booking cards', () => {
    const { container } = render(<BookingListSkeleton count={2} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.childElementCount).toBe(2);

    const withDefaults = render(<BookingListSkeleton />);
    expect(
      (withDefaults.container.firstElementChild as HTMLElement).childElementCount,
    ).toBe(3);
  });

  it('BookingDetailSkeleton and CheckoutSkeleton render aria-hidden shapes', () => {
    const detail = render(<BookingDetailSkeleton />);
    expect(
      (detail.container.firstElementChild as HTMLElement).getAttribute('aria-hidden'),
    ).toBe('true');
    const checkout = render(<CheckoutSkeleton />);
    expect(
      (checkout.container.firstElementChild as HTMLElement).getAttribute('aria-hidden'),
    ).toBe('true');
    // Checkout keeps the loaded page's 12-column split.
    expect(checkout.container.querySelector('.lg\\:col-span-8')).not.toBeNull();
    expect(checkout.container.querySelector('.lg\\:col-span-4')).not.toBeNull();
  });

  it('CardListSkeleton and ListRowSkeleton render the requested row counts', () => {
    const cards = render(<CardListSkeleton rows={3} />);
    expect((cards.container.firstElementChild as HTMLElement).childElementCount).toBe(3);
    const rows = render(<ListRowSkeleton rows={2} />);
    expect((rows.container.firstElementChild as HTMLElement).childElementCount).toBe(2);
    const rowsDefault = render(<ListRowSkeleton />);
    expect((rowsDefault.container.firstElementChild as HTMLElement).childElementCount).toBe(3);
  });
});
