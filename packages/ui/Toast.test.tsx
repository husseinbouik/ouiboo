/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import {
  Toast,
  ToastTitle,
  ToastAction,
  TOAST_DEFAULT_DURATION_MS,
  TOAST_ACTION_DURATION_MS,
} from './Toast';
import { ToastProvider, useToast } from './Toaster';

describe('Toast action support (#485)', () => {
  it('renders exactly as before when no action is passed', () => {
    render(
      <Toast>
        <ToastTitle>Saved</ToastTitle>
      </Toast>,
    );
    expect(screen.getByText('Saved')).not.toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders an action object as a focusable button and fires its handler', () => {
    const onClick = jest.fn();
    render(
      <Toast action={{ label: 'Undo', onClick }}>
        <ToastTitle>Removed from wishlist</ToastTitle>
      </Toast>,
    );
    const button = screen.getByRole('button', { name: 'Undo' });
    expect(button).not.toBeNull();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('accepts a rendered ToastAction element as the action', () => {
    const onClick = jest.fn();
    render(
      <Toast action={<ToastAction onClick={onClick}>Undo</ToastAction>}>
        <ToastTitle>Deleted</ToastTitle>
      </Toast>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('gives action toasts a longer default duration than plain toasts', () => {
    expect(TOAST_ACTION_DURATION_MS).toBeGreaterThan(TOAST_DEFAULT_DURATION_MS);
  });
});

function ToastHarness({ onUndo }: { onUndo: () => void }) {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        toast({
          title: 'Removed from your wishlist',
          action: { label: 'Undo', onClick: onUndo },
        })
      }
    >
      remove
    </button>
  );
}

describe('ToastProvider / useToast (#485)', () => {
  // M2 exit timing is timer-driven; fake timers make it deterministic.
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the toast in a polite live region without stealing focus, and Undo runs + dismisses', () => {
    const onUndo = jest.fn();
    render(
      <ToastProvider>
        <ToastHarness onUndo={onUndo} />
      </ToastProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'remove' });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByText('Removed from your wishlist')).not.toBeNull();
    // The toast must not steal focus from where the user already was.
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    // M2: dismissal plays the 150ms exit animation before the toast is
    // removed from the stack (it no longer vanishes in the same frame).
    expect(screen.getByText('Removed from your wishlist')).not.toBeNull();
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.queryByText('Removed from your wishlist')).toBeNull();
  });

  it('animates toasts in over 200ms and out over 150ms (M2 timing)', () => {
    const onUndo = jest.fn();
    render(
      <ToastProvider>
        <ToastHarness onUndo={onUndo} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'remove' }));
    const toastText = screen.getByText('Removed from your wishlist');
    const wrapper = toastText.closest('div[class*="animate-in"]');
    expect(wrapper?.className).toContain('duration-200');
  });
});
