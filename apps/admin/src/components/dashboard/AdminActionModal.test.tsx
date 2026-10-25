/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AdminActionModal from './AdminActionModal';

const t = (key: string) => key;

function renderModal(overrides: Partial<React.ComponentProps<typeof AdminActionModal>> = {}) {
  const onClose = jest.fn();
  const onSubmit = jest.fn();
  render(
    <AdminActionModal
      t={t}
      title="Force-confirm group"
      description="The group will be confirmed below its minimum."
      confirmLabel="Force confirm"
      onClose={onClose}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { onClose, onSubmit };
}

const reasonBox = () => screen.getByLabelText('dashboard.interventions.reasonLabel');
const confirmButton = () => screen.getByRole('button', { name: 'Force confirm' });

describe('AdminActionModal (#423)', () => {
  it('renders the title, description, audit note and reason field', () => {
    renderModal();
    expect(screen.getByText('Force-confirm group')).not.toBeNull();
    expect(screen.getByText('The group will be confirmed below its minimum.')).not.toBeNull();
    expect(screen.getByText('dashboard.interventions.auditNote')).not.toBeNull();
    expect(reasonBox()).not.toBeNull();
    expect(confirmButton()).toHaveProperty('disabled', true);
  });

  it('blocks submit until the reason has at least 3 non-space characters', () => {
    const { onSubmit } = renderModal();
    fireEvent.change(reasonBox(), { target: { value: 'ab' } });
    expect(confirmButton()).toHaveProperty('disabled', true);
    fireEvent.change(reasonBox(), { target: { value: '   ' } });
    expect(confirmButton()).toHaveProperty('disabled', true);
    fireEvent.change(reasonBox(), { target: { value: 'abc' } });
    expect(confirmButton()).toHaveProperty('disabled', false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the trimmed reason', () => {
    const { onSubmit } = renderModal();
    fireEvent.change(reasonBox(), { target: { value: '  Agency confirmed by phone  ' } });
    fireEvent.click(confirmButton());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('Agency confirmed by phone');
  });

  it('closes from both the cancel button and the header button', () => {
    const { onClose } = renderModal();
    // Two controls carry the cancel label: the header X (aria-label) and
    // the footer cancel button. Both must close the modal.
    const labelled = screen.getAllByRole('button', { name: 'dashboard.interventions.cancel' });
    expect(labelled).toHaveLength(2);
    fireEvent.click(labelled[0]);
    fireEvent.click(labelled[1]);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('shows the API error message when one is passed in', () => {
    renderModal({ error: 'Group already confirmed' });
    expect(screen.getByText('Group already confirmed')).not.toBeNull();
  });

  it('disables confirm and cancel while the action is pending', () => {
    renderModal({ pending: true });
    fireEvent.change(reasonBox(), { target: { value: 'a valid reason' } });
    expect(confirmButton()).toHaveProperty('disabled', true);
    const cancel = screen.getAllByRole('button', { name: 'dashboard.interventions.cancel' });
    expect(cancel[cancel.length - 1]).toHaveProperty('disabled', true);
  });

  it('renders action-specific children above the reason field', () => {
    renderModal({ children: <div>deadline-picker-slot</div> });
    expect(screen.getByText('deadline-picker-slot')).not.toBeNull();
  });

  it('styles the confirm button as destructive only for destructive actions', () => {
    const { unmount } = render(
      <AdminActionModal
        t={t}
        title="Close group"
        confirmLabel="Close group"
        destructive
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Close group' }).className).toContain('bg-danger');
    unmount();
    renderModal();
    expect(confirmButton().className).toContain('bg-deep-blue');
  });
});
