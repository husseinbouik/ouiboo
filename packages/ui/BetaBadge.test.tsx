import React from 'react';
import { render, screen } from '@testing-library/react';
import { BetaBadge } from './BetaBadge';

describe('BetaBadge (@ouiboo/ui)', () => {
  const original = process.env.NEXT_PUBLIC_BETA_BADGE;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_BETA_BADGE;
    } else {
      process.env.NEXT_PUBLIC_BETA_BADGE = original;
    }
  });

  it('renders the BETA pill by default (flag unset)', () => {
    delete process.env.NEXT_PUBLIC_BETA_BADGE;
    render(<BetaBadge />);
    const badge = screen.getByTestId('beta-badge');
    expect(badge.textContent).toBe('BETA');
    // Decorative text only: never an interactive element.
    expect(badge.tagName).toBe('SPAN');
    expect(badge.getAttribute('tabindex')).toBeNull();
  });

  it("renders nothing when NEXT_PUBLIC_BETA_BADGE is 'false'", () => {
    process.env.NEXT_PUBLIC_BETA_BADGE = 'false';
    const { container } = render(<BetaBadge />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('beta-badge')).toBeNull();
  });

  it("still renders for other flag values such as 'true'", () => {
    process.env.NEXT_PUBLIC_BETA_BADGE = 'true';
    render(<BetaBadge />);
    expect(screen.getByTestId('beta-badge').textContent).toBe('BETA');
  });
});
