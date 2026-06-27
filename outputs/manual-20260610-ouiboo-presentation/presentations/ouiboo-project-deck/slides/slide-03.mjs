import { C, addBg, box, footer, kicker, statusPill, text } from "./theme.mjs";

export async function slide03(presentation) {
  const slide = presentation.slides.add();
  addBg(slide);
  kicker(slide, "Hardening Pass", "03");
  text(slide, "The second pass attacked deployment blockers first: money precision, distributed safety, and security controls.", { left: 74, top: 92, width: 930, height: 92 }, { fontSize: 34, bold: true });
  text(slide, "The changes are operationally focused: reduce financial correctness risk, make API replicas safe, and make launch readiness auditable.", { left: 76, top: 190, width: 780, height: 38 }, { fontSize: 16, color: C.muted });
  const rows = [
    ["Money precision", "Prisma money fields converted to Decimal; API money contract becomes decimal strings; provider minor units use Decimal arithmetic.", "Fixed", C.greenSoft],
    ["Distributed runtime", "Redis-backed rate limiting, Redis health checks, BullMQ worker entrypoint, API-local cron removed.", "Fixed", C.greenSoft],
    ["Security/RBAC", "Analytics guard gaps fixed; route inventory created; remaining endpoint-by-endpoint authorization failures need full E2E coverage.", "Partial", C.amberSoft],
    ["Deployment", "Prod compose example, Docker CMD fix, runbook, managed Postgres/Redis/storage assumption documented.", "Partial", C.amberSoft],
    ["E2E evidence", "Unit/app builds pass; full API E2E timed out locally and remains launch verification.", "Open", C.redSoft]
  ];
  rows.forEach(([area, detail, status, color], i) => {
    const y = 258 + i * 68;
    box(slide, { left: 76, top: y, width: 1040, height: 54 }, { fill: i % 2 === 0 ? C.white : "#FBF8F0", stroke: C.line });
    text(slide, area, { left: 100, top: y + 14, width: 190, height: 24 }, { fontSize: 18, bold: true });
    text(slide, detail, { left: 310, top: y + 11, width: 610, height: 34 }, { fontSize: 14, color: C.muted });
    statusPill(slide, status, 950, y + 11, color);
  });
  footer(slide, 3);
  return slide;
}
