/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { RatingDistribution } from './RatingDistribution';

// react-i18next is mocked in traveller jest tests: t() returns the
// key, so the aria-label assertions target the distributionRating key
// (the en/fr/ar copy lives in public/locales/*/translation.json).
describe('RatingDistribution (#587)', () => {
    it('labels each row with its rating number and a star, never a literal "?"', () => {
        const { container } = render(
            <RatingDistribution distribution={{ 5: 3, 4: 1, 3: 0, 2: 0, 1: 0 }} totalReviews={4} />,
        );

        // No literal placeholder artefact anywhere in the block.
        expect(container.textContent).not.toContain('?');

        // Five rows, 5 down to 1, each with a localised star aria-label.
        const labels = screen.getAllByLabelText('tripDetails.distributionRating');
        expect(labels).toHaveLength(5);
        expect(labels.map((el) => el.textContent?.trim())).toEqual(['5', '4', '3', '2', '1']);

        // Each row pairs its rating with its count (row text = rating + count).
        expect(labels.map((el) => el.parentElement?.textContent)).toEqual(['53', '41', '30', '20', '10']);
    });

    it('renders zero-count rows and empty bars when there is no distribution', () => {
        const { container } = render(<RatingDistribution distribution={undefined} totalReviews={0} />);

        expect(container.textContent).not.toContain('?');
        expect(screen.getAllByLabelText('tripDetails.distributionRating')).toHaveLength(5);
        expect(screen.getAllByText('0')).toHaveLength(5);
    });
});
