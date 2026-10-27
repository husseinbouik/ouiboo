import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { OtpCodeInput } from './OtpCodeInput';

function Harness({ ariaLabels = false }: { ariaLabels?: boolean }) {
    const [code, setCode] = React.useState(['', '', '', '', '', '']);
    return (
        <OtpCodeInput
            value={code}
            onChange={setCode}
            inputClassName="otp-box"
            ariaLabelForDigit={ariaLabels ? (i) => `Digit ${i + 1}` : undefined}
        />
    );
}

const boxes = () => screen.getAllByRole('textbox') as HTMLInputElement[];

describe('OtpCodeInput (#492, @ouiboo/ui)', () => {
    it('renders one box per digit with the autofill contract on the first box', () => {
        render(<Harness />);
        const inputs = boxes();
        expect(inputs).toHaveLength(6);
        // The OS delivers the whole code into the first box: it alone
        // carries one-time-code and room for all six digits.
        expect(inputs[0].getAttribute('autocomplete')).toBe('one-time-code');
        expect(inputs[0].getAttribute('maxlength')).toBe('6');
        for (const input of inputs.slice(1)) {
            expect(input.getAttribute('autocomplete')).toBe('off');
            expect(input.getAttribute('maxlength')).toBe('1');
        }
        for (const input of inputs) {
            expect(input.getAttribute('inputmode')).toBe('numeric');
            expect(input.getAttribute('pattern')).toBe('[0-9]*');
        }
    });

    it('distributes a full-code autofill/paste across the boxes and focuses the last', () => {
        render(<Harness />);
        const inputs = boxes();
        fireEvent.change(inputs[0], { target: { value: '123456' } });
        expect(boxes().map((b) => b.value)).toEqual(['1', '2', '3', '4', '5', '6']);
        expect(document.activeElement).toBe(boxes()[5]);
    });

    it('advances focus as single digits are typed', () => {
        render(<Harness />);
        fireEvent.change(boxes()[0], { target: { value: '7' } });
        expect(boxes()[0].value).toBe('7');
        expect(document.activeElement).toBe(boxes()[1]);
    });

    it('moves focus back on Backspace from an empty box', () => {
        render(<Harness />);
        fireEvent.change(boxes()[0], { target: { value: '7' } });
        // Focus is now on box 1 (empty). Backspace returns to box 0.
        fireEvent.keyDown(boxes()[1], { key: 'Backspace' });
        expect(document.activeElement).toBe(boxes()[0]);
    });

    it('clears a filled box when its value is cleared', () => {
        render(<Harness />);
        fireEvent.change(boxes()[0], { target: { value: '7' } });
        fireEvent.change(boxes()[0], { target: { value: '' } });
        expect(boxes()[0].value).toBe('');
    });

    it('applies per-digit aria labels when provided', () => {
        render(<Harness ariaLabels />);
        expect(screen.getByLabelText('Digit 1')).toBe(boxes()[0]);
        expect(screen.getByLabelText('Digit 6')).toBe(boxes()[5]);
    });
});
