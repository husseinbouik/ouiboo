import { buildCancellationScaleSnapshot, summarizeCancellation } from '../cancellation/cancellation.util';
import { findProhibitedCommercialTerms } from './publish-guardrails.util';

/**
 * #686 (Council S6): per-trip FAQ generation + agency-FAQ validation.
 *
 * Two sources, one rendered block:
 *  1. GENERATED entries, built here from the trip's structured data
 *     (meeting point, staged payment steps, cancellation scale,
 *     includes/excludes, what to bring, pay-on-arrival / private /
 *     pay-later facts). Every string is a language-keyed template in
 *     fr/ar/en — the platform's three launch locales — so a future
 *     locale is a template addition, not surgery.
 *  2. AGENCY entries, capped at MAX_AGENCY_FAQS, language-keyed, and
 *     scanned with the #674 prohibited-terms guardrail: an FAQ answer
 *     must never become a backdoor for free-text commercial terms
 *     (cancellation/payment terms live ONLY in the structured scale).
 */

export const MAX_AGENCY_FAQS = 5;
export const FAQ_LOCALES = ['fr', 'ar', 'en'] as const;

export interface TripFaqEntry {
    question: Record<string, string>;
    answer: Record<string, string>;
}

type FaqTemplate = { question: Record<string, string>; answer: Record<string, string> };

function entry(fr: [string, string], en: [string, string], ar: [string, string]): FaqTemplate {
    return {
        question: { fr: fr[0], en: en[0], ar: ar[0] },
        answer: { fr: fr[1], en: en[1], ar: ar[1] },
    };
}

export interface TripFaqFacts {
    startLocation?: string | null;
    meetingArea?: string | null;
    pickupAvailable?: boolean;
    cancellationPolicy?: unknown;
    agencyName?: string | null;
    inclusions?: string[] | null;
    exclusions?: string[] | null;
    checklist?: string[] | null;
    hasStagedSessions?: boolean;
    payOnArrivalEnabled?: boolean;
    privateTourEnabled?: boolean;
    hasPayLaterSessions?: boolean;
}

/** Generated FAQ entries from structured trip data (never free text). */
export function generateTripFaqs(facts: TripFaqFacts): TripFaqEntry[] {
    const faqs: TripFaqEntry[] = [];
    const agency = facts.agencyName?.trim() || '';

    // Meeting point.
    if (facts.meetingArea || facts.pickupAvailable) {
        const area = facts.meetingArea || facts.startLocation || '';
        faqs.push(entry(
            ['Où est le point de rendez-vous ?', `Le départ se fait depuis ${area}. L'adresse exacte et le lien de carte apparaissent sur votre réservation confirmée.${facts.pickupAvailable ? ' Une prise en charge est également possible.' : ''}`],
            ['Where is the meeting point?', `Departure is from ${area}. The exact address and map link appear on your confirmed booking.${facts.pickupAvailable ? ' Pickup is also available.' : ''}`],
            ['أين نقطة الالتقاء؟', `تنطلق الرحلة من ${area}. يظهر العنوان الدقيق ورابط الخريطة في حجزك المؤكد.${facts.pickupAvailable ? ' الاستلام متاح أيضًا.' : ''}`],
        ));
    }

    // How payment works — always agency-direct, never Ouiboo.
    faqs.push(entry(
        ['Comment payer ?', `Vous payez directement l'agence${agency ? ` (${agency})` : ''} par virement bancaire, jamais Ouiboo. Ouiboo ne détient aucun fonds.`],
        ['How do I pay?', `You pay the agency${agency ? ` (${agency})` : ''} directly by bank transfer — never Ouiboo. Ouiboo holds no funds.`],
        ['كيف أدفع؟', `تدفع مباشرة للوكالة${agency ? ` (${agency})` : ''} عبر تحويل بنكي، وليس لـ Ouiboo أبدًا. لا تحتفظ Ouiboo بأي أموال.`],
    ));

    if (facts.hasStagedSessions) {
        faqs.push(entry(
            ['Comment fonctionne le paiement en deux étapes ?', `Pour les voyages avec un groupe minimum, vous payez d'abord un acompte plafonné à l'agence. Le solde n'est dû que si le groupe minimum est confirmé avant la date limite ; sinon l'agence vous rembourse l'acompte.`],
            ['How does staged payment work?', `For trips with a minimum group size, you first pay a capped deposit to the agency. The balance is due only if the minimum group is confirmed before the deadline; otherwise the agency refunds your deposit.`],
            ['كيف يعمل الدفع على مرحلتين؟', `بالنسبة للرحلات ذات الحد الأدنى للمجموعة، تدفع أولاً عربونًا محدودًا للوكالة. لا يستحق الرصيد إلا إذا تم تأكيد الحد الأدنى للمجموعة قبل الموعد النهائي؛ وإلا تسترد العربون من الوكالة.`],
        ));
    }

    // Cancellation — derived from the structured scale only.
    const snapshot = buildCancellationScaleSnapshot(facts.cancellationPolicy);
    const summary = summarizeCancellation(facts.cancellationPolicy);
    if (summary.freeCancellation && summary.freeCancellationDays !== null) {
        faqs.push(entry(
            ['Puis-je annuler gratuitement ?', `Oui — annulation gratuite jusqu'à ${summary.freeCancellationDays} jour(s) avant le départ. Au-delà, l'échelle d'annulation du voyage s'applique. Tout remboursement est effectué par l'agence${agency ? ` (${agency})` : ''}.`],
            ['Can I cancel for free?', `Yes — free cancellation up to ${summary.freeCancellationDays} day(s) before departure. After that, the trip's cancellation scale applies. Any refund is paid by the agency${agency ? ` (${agency})` : ''}.`],
            ['هل يمكنني الإلغاء مجانًا؟', `نعم — إلغاء مجاني حتى ${summary.freeCancellationDays} يوم (أيام) قبل الانطلاق. بعد ذلك تطبق سلم الإلغاء الخاص بالرحلة. أي استرداد تدفعه الوكالة${agency ? ` (${agency})` : ''}.`],
        ));
    } else {
        const top = snapshot.bands[0];
        faqs.push(entry(
            ['Que se passe-t-il si j\'annule ?', `L'échelle d'annulation du voyage s'applique${top ? ` (jusqu'à ${top.refundPercent}% remboursés selon le délai)` : ''}. Tout remboursement est effectué par l'agence${agency ? ` (${agency})` : ''} ; Ouiboo ne détient aucun fonds.`],
            ['What happens if I cancel?', `The trip's cancellation scale applies${top ? ` (up to ${top.refundPercent}% refunded depending on timing)` : ''}. Any refund is paid by the agency${agency ? ` (${agency})` : ''}; Ouiboo holds no funds.`],
            ['ماذا يحدث إذا ألغيت؟', `يطبق سلم الإلغاء الخاص بالرحلة${top ? ` (حتى ${top.refundPercent}% مستردة حسب التوقيت)` : ''}. أي استرداد تدفعه الوكالة${agency ? ` (${agency})` : ''}؛ لا تحتفظ Ouiboo بأي أموال.`],
        ));
    }

    if (facts.inclusions && facts.inclusions.length > 0) {
        const list = facts.inclusions.slice(0, 6).join(', ');
        faqs.push(entry(
            ['Qu\'est-ce qui est inclus ?', `Inclus : ${list}.`],
            ['What is included?', `Included: ${list}.`],
            ['ما الذي يشمله السعر؟', `يشمل: ${list}.`],
        ));
    }
    if (facts.exclusions && facts.exclusions.length > 0) {
        const list = facts.exclusions.slice(0, 6).join(', ');
        faqs.push(entry(
            ['Qu\'est-ce qui n\'est pas inclus ?', `Non inclus : ${list}.`],
            ['What is not included?', `Not included: ${list}.`],
            ['ما الذي لا يشمله السعر؟', `لا يشمل: ${list}.`],
        ));
    }
    if (facts.checklist && facts.checklist.length > 0) {
        const list = facts.checklist.slice(0, 6).join(', ');
        faqs.push(entry(
            ['Que dois-je apporter ?', `À apporter : ${list}.`],
            ['What should I bring?', `Bring: ${list}.`],
            ['ماذا يجب أن أحضر؟', `أحضر: ${list}.`],
        ));
    }

    if (facts.payOnArrivalEnabled) {
        faqs.push(entry(
            ['Puis-je payer sur place ?', `Oui — pour cette activité, vous payez l'agence sur place le jour de l'activité. Aucun paiement n'est effectué via Ouiboo.`],
            ['Can I pay on arrival?', `Yes — for this activity you pay the agency on site on the day. No payment is made through Ouiboo.`],
            ['هل يمكنني الدفع عند الوصول؟', `نعم — بالنسبة لهذا النشاط تدفع للوكالة في الموقع في نفس اليوم. لا يتم أي دفع عبر Ouiboo.`],
        ));
    }
    if (facts.privateTourEnabled) {
        faqs.push(entry(
            ['Puis-je réserver ce voyage en privé ?', `Oui — une session privée réserve tout le départ pour votre groupe uniquement, au prix par groupe indiqué. Les règles de groupe minimum ne s'appliquent pas aux sessions privées.`],
            ['Can I book this trip privately?', `Yes — a private session books the whole departure for your group only, at the stated per-group price. Minimum-group rules do not apply to private sessions.`],
            ['هل يمكنني حجز هذه الرحلة بشكل خاص؟', `نعم — الجلسة الخاصة تحجز المغادرة كاملة لمجموعتك فقط، بالسعر المعلن للمجموعة. لا تنطبق قواعد الحد الأدنى للمجموعة على الجلسات الخاصة.`],
        ));
    }
    if (facts.hasPayLaterSessions) {
        faqs.push(entry(
            ['Puis-je réserver maintenant et payer plus tard ?', `Oui — votre place est conservée jusqu'à la date limite indiquée. Vous payez l'agence directement avant cette date ; Ouiboo ne conserve aucune carte et ne prélève jamais automatiquement.`],
            ['Can I reserve now and pay later?', `Yes — your seat is held until the stated deadline. You pay the agency directly before it; Ouiboo stores no card and never charges automatically.`],
            ['هل يمكنني الحجز الآن والدفع لاحقًا؟', `نعم — يبقى مقعدك محجوزًا حتى الموعد النهائي المحدد. تدفع للوكالة مباشرة قبل ذلك؛ لا تخزن Ouiboo أي بطاقة ولا تخصم تلقائيًا أبدًا.`],
        ));
    }

    return faqs;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanLangMap(raw: unknown): Record<string, string> | null {
    if (!isRecord(raw)) return null;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        if (trimmed) out[key.toLowerCase().slice(0, 8)] = trimmed.slice(0, 2000);
    }
    return Object.keys(out).length > 0 ? out : null;
}

/**
 * Validate + normalize agency-authored FAQs on write. Returns null for
 * absent input (leave stored value untouched / none). Throws a plain
 * Error with a traveller-safe message on any violation — callers map
 * it to BadRequestException. The #674 scan runs over EVERY language's
 * question + answer text.
 */
export function normalizeTripFaqs(raw: unknown): TripFaqEntry[] | null {
    if (raw === undefined || raw === null) return null;
    if (!Array.isArray(raw)) throw new Error('faqs must be an array');
    if (raw.length > MAX_AGENCY_FAQS) {
        throw new Error(`A trip may carry at most ${MAX_AGENCY_FAQS} agency FAQ entries`);
    }
    const out: TripFaqEntry[] = [];
    for (const item of raw) {
        if (!isRecord(item)) throw new Error('Each FAQ entry needs a question and an answer');
        const question = cleanLangMap(item.question);
        const answer = cleanLangMap(item.answer);
        if (!question || !answer) throw new Error('Each FAQ entry needs a question and an answer in at least one language');
        if (!question.fr || !answer.fr) {
            throw new Error('Each FAQ entry needs a French question and answer (French is required; Arabic and English are encouraged)');
        }
        const texts = [...Object.values(question), ...Object.values(answer)];
        const hits = findProhibitedCommercialTerms(texts);
        if (hits.length > 0) {
            throw new Error(
                'FAQ entries may not state cancellation or payment terms — those live only in the trip\'s structured cancellation scale',
            );
        }
        out.push({ question, answer });
    }
    return out;
}

/** FAQPage JSON-LD for one locale, from generated + agency entries. */
export function buildTripFaqJsonLd(faqs: TripFaqEntry[], locale: string): Record<string, unknown> | null {
    const lang = (locale || 'fr').split('-')[0].toLowerCase();
    const pick = (map: Record<string, string>) => map[lang] ?? map.fr ?? map.en ?? Object.values(map)[0];
    const entities = faqs
        .map((faq) => {
            const name = pick(faq.question);
            const text = pick(faq.answer);
            return name && text ? { '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } } : null;
        })
        .filter(Boolean);
    if (entities.length === 0) return null;
    return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: entities };
}
