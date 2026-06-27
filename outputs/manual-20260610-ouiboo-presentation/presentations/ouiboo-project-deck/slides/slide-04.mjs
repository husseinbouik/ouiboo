import { C, addBg, box, footer, kicker, rule, text, title } from "./theme.mjs";

export async function slide04(presentation) {
  const slide = presentation.slides.add();
  addBg(slide);
  kicker(slide, "Runtime Architecture", "04");
  title(slide, "The target runtime separates user traffic from scheduled work and shared state.", "API replicas now rely on Redis for rate limit state, while scheduled maintenance belongs to a worker queue rather than per-replica cron.");
  const nodes = [
    ["Traveler\nAgency\nAdmin", 76, 318, C.blueSoft],
    ["NestJS API\n/api/v1", 352, 318, C.white],
    ["Postgres\nPrisma", 642, 256, C.greenSoft],
    ["Redis\nrate limit + queue", 642, 386, C.amberSoft],
    ["BullMQ Worker\nreminders + FX + cancels", 936, 318, C.white]
  ];
  nodes.forEach(([label, x, y, fill]) => {
    box(slide, { left: x, top: y, width: 210, height: 86 }, { fill, stroke: C.blue, width: 2 });
    text(slide, label, { left: x + 18, top: y + 19, width: 174, height: 48 }, { fontSize: 19, bold: true, align: "center", valign: "mid" });
  });
  [
    [286, 361, 66, 0],
    [562, 320, 80, -34],
    [562, 382, 80, 34],
    [852, 429, 84, -68]
  ].forEach(([x, y, w, h]) => {
    slide.shapes.add({ geometry: "line", position: { left: x, top: y, width: w, height: h }, line: { fill: C.coral, style: "solid", width: 3 }, fill: C.coral });
  });
  rule(slide, 76, 540, 1060, C.line, 1);
  text(slide, "Production implication: horizontal API scaling becomes safer only when Redis, worker idempotency, migration discipline, and readiness checks are exercised together.", { left: 100, top: 566, width: 1000, height: 42 }, { fontSize: 20, bold: true, align: "center" });
  footer(slide, 4);
  return slide;
}
