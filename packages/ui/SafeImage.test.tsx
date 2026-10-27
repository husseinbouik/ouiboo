/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SafeImage } from './SafeImage';

jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: any) => <img {...props} alt={props.alt} />,
}));

describe('SafeImage (Session #3 P0-2)', () => {
  it('renders the image while it loads fine', () => {
    render(<SafeImage src="https://cdn.example/trip.jpg" alt="Atlas trek" fill />);
    const img = screen.getByAltText('Atlas trek');
    expect(img.tagName).toBe('IMG');
    expect(document.querySelector('[data-safe-image-fallback]')).toBeNull();
  });

  it('swaps to the branded fallback when the image fails', () => {
    render(<SafeImage src="https://example.com/dead.jpg" alt="Dead photo" fill />);
    fireEvent.error(screen.getByAltText('Dead photo'));
    const fallback = document.querySelector('[data-safe-image-fallback]');
    expect(fallback).not.toBeNull();
    expect(fallback?.getAttribute('role')).toBe('img');
    expect(fallback?.getAttribute('aria-label')).toBe('Dead photo');
  });

  it('shows the fallback immediately when there is no source', () => {
    render(<SafeImage src="" alt="No photo" fill />);
    expect(document.querySelector('[data-safe-image-fallback]')).not.toBeNull();
  });

  it('does not suppress a new source after a different one failed', () => {
    const { rerender } = render(
      <SafeImage src="https://example.com/dead.jpg" alt="Trip" fill />,
    );
    fireEvent.error(screen.getByAltText('Trip'));
    expect(document.querySelector('[data-safe-image-fallback]')).not.toBeNull();
    rerender(<SafeImage src="https://cdn.example/good.jpg" alt="Trip" fill />);
    expect(document.querySelector('[data-safe-image-fallback]')).toBeNull();
    expect(screen.getByAltText('Trip').tagName).toBe('IMG');
  });
});
