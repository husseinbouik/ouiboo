import { C, addBg, box, footer, kicker, rule, text, title } from "./theme.mjs";

export async function slide07(presentation) {
  const slide = presentation.slides.add();
  addBg(slide);
  kicker(slide, "Launch Path", "07");
  title(slide, "The remaining production work is a short, concrete launch rehearsal rather than an open-ended rebuild.", "The sequence must prove the system under production-like conditions: backup, migration, deploy, observe, rollback.");
  const steps = [
    ["1", "Freeze", "lock env + release candidate"],
    ["2", "Back up", "snapshot Postgres + storage"],
    ["3", "Migrate", "Prisma migrate deploy"],
    ["4", "Deploy", "API, worker, three frontends"],
    ["5", "Observe", "logs, health, Redis, DB"],
    ["6", "Rollback", "exercise documented rollback"]
  ];
  steps.forEach(([n, head, body], i) => {
    const x = 92 + i * 178;
    box(slide, { left: x, top: 330, width: 128, height: 128 }, { fill: i < 3 ? C.white : C.blueSoft, stroke: C.line });
    text(slide, n, { left: x + 14, top: 344, width: 32, height: 28 }, { fontSize: 24, bold: true, color: C.coral });
    text(slide, head, { left: x + 14, top: 382, width: 100, height: 26 }, { fontSize: 19, bold: true });
    text(slide, body, { left: x + 14, top: 415, width: 96, height: 42 }, { fontSize: 12, color: C.muted });
    if (i < steps.length - 1) rule(slide, x + 128, 394, 50, C.coral, 3);
  });
  text(slide, "Blocking proof: a clean run through this sequence on staging with monitoring and rollback evidence attached to the release notes.", { left: 170, top: 545, width: 820, height: 46 }, { fontSize: 21, bold: true, align: "center" });
  footer(slide, 7);
  return slide;
}
