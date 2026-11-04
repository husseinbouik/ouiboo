/**
 * @jest-environment jsdom
 *
 * Issue #804: the agency mobile navigation drawer could never be opened.
 * The shared Sheet wrapped the whole sheet — trigger included — in a
 * `hidden` div while closed, and SheetTrigger / SheetClose never wired a
 * click to `onOpenChange`, so the trigger sat in a display:none subtree
 * and the drawer was unreachable. These tests pin the contract the one
 * consumer (apps/agency AgencyMobileNav) relies on: the trigger is never
 * inside a hidden subtree, a trigger click opens the drawer, and the
 * close controls close it — in both controlled and uncontrolled usage.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sheet, SheetTrigger, SheetContent, SheetClose } from './Sheet';

function ControlledSheet() {
  const [open, setOpen] = React.useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger aria-label="Open navigation menu">Menu</SheetTrigger>
      <SheetContent side="left">
        <p>Drawer body</p>
        <SheetClose aria-label="Dismiss drawer">Dismiss</SheetClose>
      </SheetContent>
    </Sheet>
  );
}

describe('Sheet (#804)', () => {
  it('renders the trigger outside any hidden subtree while closed', () => {
    render(<ControlledSheet />);
    const trigger = screen.getByRole('button', { name: 'Open navigation menu' });
    expect(trigger.closest('.hidden')).toBeNull();
  });

  it('does not render the drawer content while closed', () => {
    render(<ControlledSheet />);
    expect(screen.queryByText('Drawer body')).toBeNull();
  });

  it('opens the drawer when the trigger is clicked', () => {
    render(<ControlledSheet />);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    const body = screen.getByText('Drawer body');
    expect(body.closest('.hidden')).toBeNull();
  });

  it('closes the drawer from the built-in close button', () => {
    render(<ControlledSheet />);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    expect(screen.getByText('Drawer body')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Drawer body')).toBeNull();
  });

  it('closes the drawer from a SheetClose placed in the content', () => {
    render(<ControlledSheet />);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    expect(screen.getByText('Drawer body')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss drawer' }));
    expect(screen.queryByText('Drawer body')).toBeNull();
  });

  it('supports uncontrolled usage (internal open state)', () => {
    render(
      <Sheet>
        <SheetTrigger aria-label="Open navigation menu">Menu</SheetTrigger>
        <SheetContent side="left">
          <p>Drawer body</p>
        </SheetContent>
      </Sheet>,
    );
    const trigger = screen.getByRole('button', { name: 'Open navigation menu' });
    expect(trigger.closest('.hidden')).toBeNull();
    fireEvent.click(trigger);
    const body = screen.getByText('Drawer body');
    expect(body.closest('.hidden')).toBeNull();
  });
});
