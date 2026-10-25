/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import { AgencyTripCardSkeleton, AgencyTripCardSkeletonGrid } from './Skeletons';

/**
 * #469: the dashboard trips grid shows card-shaped skeletons that mirror
 * the real agency trip card (h-48 image, p-6 body) while trips load.
 */
describe('AgencyTripCardSkeleton (#469)', () => {
  it('is aria-hidden and mirrors the agency trip card image height', () => {
    const { container } = render(<AgencyTripCardSkeleton />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.h-48')).not.toBeNull();
  });

  it('grid renders one skeleton per requested card', () => {
    const { container } = render(
      <div>
        <AgencyTripCardSkeletonGrid count={3} />
      </div>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.childElementCount).toBe(3);
  });
});
