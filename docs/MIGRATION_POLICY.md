# Database Migration Policy

## Expand-Contract Pattern

All schema changes follow the expand → migrate → contract pattern:

1. **Expand**: Add new columns/tables as nullable or with defaults. Do not remove old ones yet.
2. **Backfill**: Migrate existing data to the new schema.
3. **Dual-write**: Update application code to write to both old and new schema.
4. **Switch**: Update reads to use the new schema.
5. **Contract**: Remove old columns/tables in a later release.

## Requirements for Every Schema PR

- [ ] Prisma migration file included
- [ ] Preflight check for duplicate/invalid data
- [ ] Rollback/impact note in PR description
- [ ] Lock/timeout assessment for large tables
- [ ] `npx prisma validate` passes
- [ ] `npx prisma generate` succeeds

## Prohibited

- Destructive changes (DROP COLUMN, DROP TABLE) without a prior expand phase
- Adding NOT NULL columns without defaults on tables with existing rows
- Renaming columns (use expand-contract instead)

## CI Checks

- Prisma schema validation
- Migration file presence check
- Destructive change detection (requires manual review label)
