import { C, addBg, box, footer, kicker, rule, text, title } from "./theme.mjs";

export async function slide06(presentation) {
  const slide = presentation.slides.add();
  addBg(slide);
  kicker(slide, "Demo Readiness", "06");
  title(slide, "The controlled demo is seeded and build-verified; full API-backed E2E remains the public-launch gate.", "This is the practical readiness view for a stakeholder demo versus a real external production launch.");
  const bars = [
    ["API build + unit tests", 1.0, "passed"],
    ["Traveler / Agency / Admin builds", 1.0, "passed"],
    ["Dependency audit high", 1.0, "0 findings"],
    ["Seeded demo data", 1.0, "available"],
    ["Root build", 0.72, "timed out locally"],
    ["API E2E", 0.42, "not fully verified"]
  ];
  bars.forEach(([label, v, note], i) => {
    const y = 292 + i * 48;
    text(slide, label, { left: 98, top: y, width: 290, height: 22 }, { fontSize: 16, bold: true });
    box(slide, { left: 420, top: y + 4, width: 430, height: 14 }, { fill: "#E6DFD0", line: { width: 0, fill: "#E6DFD0" } });
    box(slide, { left: 420, top: y + 4, width: 430 * v, height: 14 }, { fill: v === 1 ? C.teal : v > 0.6 ? C.ochre : C.coral, line: { width: 0, fill: C.teal } });
    text(slide, note, { left: 884, top: y - 1, width: 180, height: 22 }, { fontSize: 14, color: C.muted });
  });
  rule(slide, 100, 600, 950, C.line, 1);
  text(slide, "Recommendation: use the current state for a controlled MVP demo, but do not open public production until E2E and deployment rehearsal pass cleanly.", { left: 120, top: 622, width: 900, height: 36 }, { fontSize: 18, bold: true, align: "center" });
  footer(slide, 6);
  return slide;
}
