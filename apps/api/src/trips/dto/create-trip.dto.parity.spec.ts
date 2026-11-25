import { getMetadataStorage } from 'class-validator';
import { CreateTripTemplateSchema } from '@ouiboo/schemas';
import { CreateTripTemplateDto } from './create-trip.dto';

/**
 * #1025 (A5): DTO ↔ Zod-schema field-parity census for the trip write
 * model. CreateTripInput has ONE source of truth (the Zod schema in
 * @ouiboo/schemas, from which the api-client contract is now derived);
 * the Nest DTO is the server-side validator for the same payload. This
 * test fails when a field is added to one side and not the other —
 * the drift that left the old hand-written api-client contract missing
 * translations/cancellationPolicy/faqs/pickupPoints/payOnArrivalEnabled/
 * privateTourEnabled/imageAlts.
 *
 * KNOWN DELTAS below are intentional, reviewed differences (server-only
 * or client-only fields). Adding to either list requires a comment
 * justifying why the field exists on only one side.
 */
const DTO_ONLY_FIELDS: string[] = [
    // (none currently)
];
const SCHEMA_ONLY_FIELDS: string[] = [
    // (none currently)
];

function dtoFields(): string[] {
    const storage = getMetadataStorage() as unknown as {
        getTargetValidationMetadatas: (
            ctor: unknown,
            target: string,
            propertyName: string,
            targetString: unknown,
            groups: unknown,
        ) => Array<{ propertyName: string }>;
    };
    const names = storage
        .getTargetValidationMetadatas(CreateTripTemplateDto, '', '', undefined, undefined)
        .map((m) => m.propertyName);
    return [...new Set(names)].sort();
}

function schemaFields(): string[] {
    const shape = (CreateTripTemplateSchema as unknown as { shape?: Record<string, unknown> }).shape;
    if (!shape) throw new Error('CreateTripTemplateSchema exposes no .shape — update this census.');
    return Object.keys(shape).sort();
}

describe('CreateTripTemplateDto ↔ CreateTripTemplateSchema parity (#1025)', () => {
    it('every DTO field exists in the Zod schema (modulo documented deltas)', () => {
        const schema = new Set(schemaFields());
        for (const field of dtoFields()) {
            if (DTO_ONLY_FIELDS.includes(field)) continue;
            expect(schema.has(field)).toBe(true);
        }
    });

    it('every Zod schema field exists in the DTO (modulo documented deltas)', () => {
        const dto = new Set(dtoFields());
        for (const field of schemaFields()) {
            if (SCHEMA_ONLY_FIELDS.includes(field)) continue;
            expect(dto.has(field)).toBe(true);
        }
    });
});
