import { C, addBg, box, footer, rule, text } from "./theme.mjs";

export async function slide01(presentation) {
  const slide = presentation.slides.add();
  addBg(slide);
  box(slide, { left: 0, top: 0, width: 1280, height: 720 }, { fill: C.ink, line: { width: 0, fill: C.ink } });
  box(slide, { left: 74, top: 72, width: 34, height: 12 }, { fill: C.coral, line: { width: 0, fill: C.coral } });
  text(slide, "OUIBOO", { left: 74, top: 102, width: 360, height: 34 }, { fontSize: 18, bold: true, color: C.ochre });
  text(slide, "MVP launch readiness and production-hardening story", { left: 74, top: 170, width: 820, height: 160 }, { fontSize: 52, bold: true, color: C.paper });
  text(slide, "A concise project presentation for the travel marketplace platform: product shape, architecture, hardening completed, verified demo path, and remaining public-production blockers.", { left: 78, top: 360, width: 730, height: 92 }, { fontSize: 21, color: "#E7E2D8" });
  const metrics = [
    ["82%", "controlled MVP demo readiness"],
    ["74%", "public production readiness"],
    ["0", "high audit vulnerabilities"]
  ];
  metrics.forEach(([value, label], i) => {
    const x = 805 + i * 135;
    rule(slide, x, 516, 82, i === 0 ? C.teal : i === 1 ? C.ochre : C.coral, 4);
    text(slide, value, { left: x, top: 536, width: 110, height: 44 }, { fontSize: 34, bold: true, color: C.paper });
    text(slide, label, { left: x, top: 586, width: 120, height: 46 }, { fontSize: 13, color: "#D8D1C3" });
  });
  text(slide, "June 10, 2026", { left: 74, top: 616, width: 240, height: 24 }, { fontSize: 14, color: "#D8D1C3" });
  footer(slide, 1);
  return slide;
}
