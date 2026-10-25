/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PaymentProofBankConfirmation } from './PaymentProofBankConfirmation';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      let out = key;
      if (opts) {
        for (const v of Object.values(opts)) out += ` ${String(v)}`;
      }
      return out;
    },
    i18n: { language: 'en' },
  }),
}));

const CONFIRM_LABEL = 'paymentProof.confirmBankReceipt';
const REFERENCE_LABEL = 'paymentProof.bankReference';
const AMOUNT_LABEL = 'paymentProof.confirmedAmount';
const BANK_REFERENCE_VALUE = 'TRX-2026-001';

describe('PaymentProofBankConfirmation (#422 step 2)', () => {
  it('renders the bank-first instruction and prefills the expected stage amount', () => {
    render(
      <PaymentProofBankConfirmation expectedAmount={300} currency="MAD" onConfirm={jest.fn()} />,
    );
    expect(screen.getByText('paymentProof.bankConfirmationInstruction')).not.toBeNull();
    const amountInput = screen.getByLabelText(AMOUNT_LABEL) as HTMLInputElement;
    expect(amountInput.value).toBe('300');
  });

  it('keeps the confirm action disabled until a bank reference is entered', () => {
    render(
      <PaymentProofBankConfirmation expectedAmount={1000} currency="MAD" onConfirm={jest.fn()} />,
    );
    const confirm = screen.getByRole('button', { name: CONFIRM_LABEL }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(REFERENCE_LABEL), {
      target: { value: BANK_REFERENCE_VALUE },
    });
    expect(confirm.disabled).toBe(false);
  });

  it('submits the parsed amount and the trimmed bank reference', () => {
    const onConfirm = jest.fn();
    render(
      <PaymentProofBankConfirmation expectedAmount={1000} currency="MAD" onConfirm={onConfirm} />,
    );
    fireEvent.change(screen.getByLabelText(AMOUNT_LABEL), {
      target: { value: '1000.50' },
    });
    fireEvent.change(screen.getByLabelText(REFERENCE_LABEL), {
      target: { value: '  TRX-2026-001  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: CONFIRM_LABEL }));
    expect(onConfirm).toHaveBeenCalledWith({
      confirmedAmount: 1000.5,
      bankReference: BANK_REFERENCE_VALUE,
    });
  });

  it('never calls onConfirm while the guard fails (no bank reference)', () => {
    const onConfirm = jest.fn();
    render(
      <PaymentProofBankConfirmation expectedAmount={1000} currency="MAD" onConfirm={onConfirm} />,
    );
    fireEvent.click(screen.getByRole('button', { name: CONFIRM_LABEL }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
