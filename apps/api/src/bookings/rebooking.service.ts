import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { toMoneyString } from '../common/money.util';
import { normalizeTripLocale, resolveTripText } from '../trips/trip-translations.util';

/**
 * #444 (Council P2-05): leakage defences — rebooking value.
 *
 * Detection alone does not stop leakage; the pair must have a reason
 * to book on Ouiboo again. This service powers the traveller-facing
 * "book again" surface: for each agency the traveller has actually
 * travelled with (a CONFIRMED or COMPLETED booking — a real
 * relationship, not a browse), the agency's next bookable sessions,
 * with the traveller's own booking count with that agency attached.
 * The relationship is the value: verified reviews, the recorded
 * cancellation scale, refund tracking and the departure pack all
 * exist only for on-platform bookings, and this surface is where the
 * traveller is reminded of that at the moment a new trip is due.
 *
 * Deliberate limits:
 * - Sessions the traveller already holds a live booking for are
 *   excluded (a suggestion to re-book the same departure is noise).
 * - At most 2 sessions per agency, so one prolific agency cannot
 *   crowd out the traveller's other relationships.
 * - Only ACTIVE trips with OPEN sessions starting in the future and
 *   seats available — the same bookability bar as the public catalog.
 * - Title/description resolve through the shared trip-translation
 *   chain (requested locale, then French, then any), exactly like
 *   the public trip payloads.
 */

export interface RebookingSuggestion {
  tripId: string;
  title: string;
  language: string;
  image: string | null;
  agencyId: string;
  companyName: string;
  previousBookingsWithAgency: number;
  sessionId: string;
  startDate: string;
  endDate: string;
  price: string;
  currency: string;
  availableSeats: number;
}

const MAX_SUGGESTIONS = 10;
const MAX_PER_AGENCY = 2;
const SESSION_SCAN_LIMIT = 100;

@Injectable()
export class RebookingService {
  constructor(private db: DatabaseService) {}

  async getSuggestions(
    travelerId: string,
    locale?: string | null,
    now: Date = new Date(),
    limit: number = MAX_SUGGESTIONS,
  ): Promise<RebookingSuggestion[]> {
    const normalizedLimit = Number.isFinite(limit)
      ? Math.min(MAX_SUGGESTIONS, Math.max(1, Math.floor(limit)))
      : MAX_SUGGESTIONS;
    const resolvedLocale = normalizeTripLocale(locale ?? undefined);

    // The traveller's agency relationships: one entry per agency with
    // the live-booking count (the trust signal the card renders).
    const pastBookings = await this.db.booking.findMany({
      where: {
        travelerId,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
      select: {
        session: { select: { template: { select: { agencyId: true } } } },
      },
    });
    const bookingsPerAgency = new Map<string, number>();
    for (const booking of pastBookings as any[]) {
      const agencyId = booking.session.template.agencyId;
      bookingsPerAgency.set(agencyId, (bookingsPerAgency.get(agencyId) ?? 0) + 1);
    }
    if (bookingsPerAgency.size === 0) return [];

    // Sessions the traveller already holds: never suggested back.
    const heldBookings = await this.db.booking.findMany({
      where: {
        travelerId,
        status: { notIn: ['CANCELLED', 'REJECTED'] },
      },
      select: { sessionId: true },
    });
    const heldSessionIds = new Set(heldBookings.map((b: any) => b.sessionId));

    const sessions = await this.db.tripSession.findMany({
      where: {
        status: 'OPEN',
        startDate: { gt: now },
        availableSeats: { gt: 0 },
        template: {
          status: 'ACTIVE',
          agencyId: { in: [...bookingsPerAgency.keys()] },
        },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        price: true,
        currency: true,
        availableSeats: true,
        template: {
          select: {
            id: true,
            title: true,
            description: true,
            translations: true,
            images: true,
            agencyId: true,
            agency: { select: { id: true, companyName: true } },
          },
        },
      },
      orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
      take: SESSION_SCAN_LIMIT,
    });

    const perAgencyCount = new Map<string, number>();
    const suggestions: RebookingSuggestion[] = [];
    for (const session of sessions as any[]) {
      if (suggestions.length >= normalizedLimit) break;
      if (heldSessionIds.has(session.id)) continue;
      const agencyId = session.template.agencyId || session.template.agency?.id;
      if (!agencyId) continue;
      const already = perAgencyCount.get(agencyId) ?? 0;
      if (already >= MAX_PER_AGENCY) continue;
      perAgencyCount.set(agencyId, already + 1);

      const text = resolveTripText(session.template, resolvedLocale);
      suggestions.push({
        tripId: session.template.id,
        title: text.title,
        language: text.language,
        image: session.template.images?.[0] ?? null,
        agencyId,
        companyName: session.template.agency?.companyName || '',
        previousBookingsWithAgency: bookingsPerAgency.get(agencyId) ?? 0,
        sessionId: session.id,
        startDate: new Date(session.startDate).toISOString(),
        endDate: new Date(session.endDate).toISOString(),
        price: toMoneyString(session.price) || '0.00',
        currency: session.currency || 'MAD',
        availableSeats: session.availableSeats,
      });
    }
    return suggestions;
  }
}
