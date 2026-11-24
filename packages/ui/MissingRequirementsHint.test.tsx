import React from 'react';
import { render, screen } from '@testing-library/react';
import { MissingRequirementsHint } from './MissingRequirementsHint';

describe('MissingRequirementsHint (Design Council Phase 1)', () => {
  it('renders nothing when every requirement is met', () => {
    const { container } = render(<MissingRequirementsHint missing={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('lists each unmet requirement next to the disabled submit', () => {
    render(
      <MissingRequirementsHint
        title="To continue, you still need:"
        missing={['Select a session', 'Accept the booking terms']}
      />,
    );
    expect(screen.getByTestId('missing-requirements-hint')).toBeTruthy();
    expect(screen.getByText('To continue, you still need:')).toBeTruthy();
    expect(screen.getByText('Select a session')).toBeTruthy();
    expect(screen.getByText('Accept the booking terms')).toBeTruthy();
  });
});
