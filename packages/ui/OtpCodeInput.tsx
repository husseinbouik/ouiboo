'use client';

import * as React from 'react';
import { distributeOtpInput } from '@ouiboo/utils';

export interface OtpCodeInputProps {
    /** Current code, one entry per box (empty string for an unfilled box). */
    value: string[];
    /** Called with the full next code whenever a box changes. */
    onChange: (next: string[]) => void;
    /** Classes for the row container. */
    className?: string;
    /** Classes applied to every box (per-app styling stays with the app). */
    inputClassName?: string;
    /** Accessible label for a box, by zero-based index. */
    ariaLabelForDigit?: (index: number) => string;
    /** Text direction of the row; the agency app pins 'ltr' (codes are LTR even in RTL locales). */
    dir?: 'ltr' | 'rtl';
}

/**
 * #492: segmented one-time-code input shared by the traveller and
 * agency email-verification pages (they were clones; the behaviour now
 * lives in one place). The digit rules themselves — single typing,
 * OS one-time-code autofill, paste — are in
 * `distributeOtpInput` (@ouiboo/utils, unit-tested there); this
 * component owns the DOM: refs, focus movement, backspace
 * navigation, and the autofill attributes (the first box accepts the
 * whole code via autoComplete="one-time-code" and maxLength 6).
 */
export function OtpCodeInput({
    value,
    onChange,
    className = 'flex justify-between gap-2',
    inputClassName,
    ariaLabelForDigit,
    dir,
}: OtpCodeInputProps) {
    const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);

    const handleChange = (index: number, rawValue: string) => {
        const result = distributeOtpInput(value, index, rawValue);
        if (!result) {
            // No digit in the value: a cleared box stays clearable,
            // while a non-digit keystroke changes nothing.
            if (rawValue === '') {
                const cleared = [...value];
                cleared[index] = '';
                onChange(cleared);
            }
            return;
        }
        onChange(result.code);
        if (result.nextFocusIndex !== index) {
            inputsRef.current[result.nextFocusIndex]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !value[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    return (
        <div className={className} dir={dir}>
            {value.map((digit, idx) => (
                <input
                    key={idx}
                    id={`otp-${idx}`}
                    ref={(el) => {
                        inputsRef.current[idx] = el;
                    }}
                    type="text"
                    value={digit}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={inputClassName}
                    maxLength={idx === 0 ? value.length : 1}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                    aria-label={ariaLabelForDigit ? ariaLabelForDigit(idx) : undefined}
                />
            ))}
        </div>
    );
}
