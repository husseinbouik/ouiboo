/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import {
  AgencyTripCardSkeleton,
  AgencyTripCardSkeletonGrid,
  TableBodySkeleton,
  FormSkeleton,
} from './Skeletons';

/**
 * #469: the dashboard trips grid shows card-shaped skeletons that mirror
 * the real agency trip card (h-48 image, p-6 body) while trips load;
 * agency tables/forms use matching row/field skeletons.
 */
describe('agency skeletons (#469)', () => {
  it('trip card skeleton is aria-hidden and mirrors the card image height', () => {
    const { container } = render(<AgencyTripCardSkeleton />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.h-48')).not.toBeNull();
  });

  it('grid renders one skeleton per requested card, with a default count', () => {
    const explicit = render(
      <div>
        <AgencyTripCardSkeletonGrid count={3} />
      </div>,
    );
    expect((explicit.container.firstElementChild as HTMLElement).childElementCount).toBe(3);

    const withDefault = render(
      <div>
        <AgencyTripCardSkeletonGrid />
      </div>,
    );
    expect((withDefault.container.firstElementChild as HTMLElement).childElementCount).toBe(3);
  });

  it('TableBodySkeleton renders rows x columns cells for a table body', () => {
    const { container } = render(
      <table>
        <tbody>
          <TableBodySkeleton rows={2} columns={3} />
        </tbody>
      </table>,
    );
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(container.querySelectorAll('tbody td')).toHaveLength(6);
    expect(container.querySelector('tbody tr')?.getAttribute('aria-hidden')).toBe('true');

    const withDefaults = render(
      <table>
        <tbody>
          <TableBodySkeleton />
        </tbody>
      </table>,
    );
    expect(withDefaults.container.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(withDefaults.container.querySelectorAll('tbody td')).toHaveLength(25);
  });

  it('FormSkeleton renders a block per field', () => {
    const { container } = render(<FormSkeleton fields={4} />);
    expect(
      (container.firstElementChild as HTMLElement).getAttribute('aria-hidden'),
    ).toBe('true');
    expect(container.querySelectorAll('.h-12.w-full')).toHaveLength(4);

    const withDefaults = render(<FormSkeleton />);
    expect(withDefaults.container.querySelectorAll('.h-12.w-full')).toHaveLength(6);
  });
});
