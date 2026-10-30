/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ModelExplainer, MODEL_EXPLAINER_ITEM_IDS } from './ModelExplainer';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'en' },
    }),
}));

describe('ModelExplainer (#678)', () => {
    it('renders the title, intro and every explainer item', () => {
        render(<ModelExplainer />);
        expect(screen.getByTestId('model-explainer')).not.toBeNull();
        expect(screen.getByText('modelExplainer.title')).not.toBeNull();
        expect(screen.getByText('modelExplainer.intro')).not.toBeNull();
        for (const id of MODEL_EXPLAINER_ITEM_IDS) {
            expect(screen.getByText(`modelExplainer.items.${id}.question`)).not.toBeNull();
            expect(screen.getByText(`modelExplainer.items.${id}.answer`)).not.toBeNull();
        }
    });

    it('covers who sells, direct payment, staged payments, refunds and verification', () => {
        expect([...MODEL_EXPLAINER_ITEM_IDS]).toEqual([
            'whoSells',
            'payDirect',
            'stagedPayments',
            'refunds',
            'verification',
        ]);
    });
});
