import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

/** #692 — agency replies flow through the review moderation lifecycle. */
function makeService(review: any) {
    const state = { review: { ...review }, notifications: [] as any[], audits: [] as any[] };
    const db: any = {
        review: {
            findUnique: jest.fn(async () => state.review),
            update: jest.fn(async ({ data }: any) => { Object.assign(state.review, data); return state.review; }),
        },
        auditLog: { create: jest.fn(async ({ data }: any) => { state.audits.push(data); return data; }) },
        notificationLog: { create: jest.fn(async ({ data }: any) => { state.notifications.push(data); return data; }) },
    };
    return { service: new ReviewsService(db), state };
}

const baseReview = {
    id: 'r1', agencyId: 'agency-1', travelerId: 'traveller-1', tripTemplateId: 'trip-1',
    status: 'VISIBLE', response: null, responseStatus: null, responseEditCount: 0,
    booking: { session: { template: { agencyId: 'agency-1' } } },
    traveler: { email: 'traveller@ouiboo.test', name: 'Test Traveller' },
    tripTemplate: { title: 'Atlas Day Trip' },
    agency: { companyName: 'Atlas Adventures' },
};

describe('agency review replies (#692)', () => {
    it('another agency replying gets 403', async () => {
        const { service } = makeService(baseReview);
        await expect(service.respondToReview('r1', 'agency-2', { response: 'Thanks!' } as any)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('a reply enters PENDING moderation — never straight to public', async () => {
        const { service, state } = makeService(baseReview);
        const updated: any = await service.respondToReview('r1', 'agency-1', { response: 'Thank you!' } as any);
        expect(updated.response).toBe('Thank you!');
        expect(updated.responseStatus).toBe('PENDING');
        expect(state.review.responseStatus).toBe('PENDING');
    });

    it('public payload hides a PENDING reply and shows a VISIBLE one', async () => {
        const { service, state } = makeService({ ...baseReview, response: 'Hi', responseStatus: 'PENDING' });
        (service as any).prisma.review = {
            findMany: jest.fn(async () => [{ ...state.review, traveler: { id: 'traveller-1', name: 'T', avatar: null } }]),
            count: jest.fn(async () => 1),
        };
        const pending = await service.getReviewsByTrip('trip-1');
        expect((pending.reviews[0] as any).response).toBeNull();
        state.review.responseStatus = 'VISIBLE';
        (service as any).prisma.review.findMany = jest.fn(async () => [{ ...state.review, traveler: { id: 'traveller-1', name: 'T', avatar: null } }]);
        const visible = await service.getReviewsByTrip('trip-1');
        expect((visible.reviews[0] as any).response).toBe('Hi');
    });

    it('moderation approves a reply to VISIBLE and notifies the author', async () => {
        const { service, state } = makeService({ ...baseReview, response: 'Thank you!', responseStatus: 'PENDING' });
        const updated: any = await service.moderateReviewResponse('r1', { id: 'admin-1', email: 'admin@ouiboo.test' }, 'approve');
        expect(updated.responseStatus).toBe('VISIBLE');
        expect(state.audits[0].action).toBe('REVIEW_RESPONSE_MODERATED');
        expect(state.notifications).toHaveLength(1);
        expect(state.notifications[0].notificationType).toBe('REVIEW_RESPONSE');
        expect(state.notifications[0].userId).toBe('traveller-1');
    });

    it('moderation rejects illegal transitions and reason-less removals', async () => {
        const { service } = makeService({ ...baseReview, response: 'x', responseStatus: 'VISIBLE' });
        await expect(service.moderateReviewResponse('r1', { id: 'a' }, 'REMOVE')).rejects.toBeInstanceOf(BadRequestException);
        const { service: s2 } = makeService({ ...baseReview, response: 'x', responseStatus: 'REMOVED' });
        await expect(s2.moderateReviewResponse('r1', { id: 'a' }, 'RESTORE')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('editing a VISIBLE reply sends it back to PENDING', async () => {
        const { service } = makeService({ ...baseReview, response: 'old', responseStatus: 'VISIBLE', responseEditCount: 0 });
        const updated: any = await service.respondToReview('r1', 'agency-1', { response: 'new text' } as any);
        expect(updated.responseStatus).toBe('PENDING');
        expect(updated.responseEditCount).toBe(1);
    });
});
