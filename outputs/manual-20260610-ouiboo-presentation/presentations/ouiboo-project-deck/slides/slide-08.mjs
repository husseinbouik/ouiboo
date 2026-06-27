import { C, addBg, box, footer, kicker, text, title } from "./theme.mjs";

export async function slide08(presentation) {
  const slide = presentation.slides.add();
  addBg(slide);
  kicker(slide, "Decision", "08");
  title(slide, "Proceed with a controlled MVP demo; hold public production until four blockers are closed.", "The platform is materially stronger after hardening, but production confidence must be earned through real flows and operational rehearsal.");
  const left = [
    ["Demo now", "Seeded accounts, builds passing, audit clean, core flows ready for guided validation."],
    ["Do not public-launch yet", "Full API E2E, upload safety, endpoint pagination/RBAC proof, and staging rehearsal are still open."]
  ];
  left.forEach(([head, body], i) => {
    const y = 292 + i * 142;
    box(slide, { left: 84, top: y, width: 470, height: 108 }, { fill: i === 0 ? C.greenSoft : C.redSoft, stroke: i === 0 ? C.teal : C.coral, width: 2 });
    text(slide, head, { left: 112, top: y + 20, width: 400, height: 28 }, { fontSize: 26, bold: true });
    text(slide, body, { left: 112, top: y + 58, width: 390, height: 36 }, { fontSize: 15, color: C.muted });
  });
  const blockers = ["API-backed E2E passes", "Payment webhook replay tests", "File upload malware/content scanning", "Production migration + rollback rehearsal"];
  box(slide, { left: 640, top: 292, width: 470, height: 250 }, { fill: C.white, stroke: C.line });
  text(slide, "Launch blockers", { left: 674, top: 320, width: 360, height: 30 }, { fontSize: 26, bold: true });
  blockers.forEach((b, i) => {
    box(slide, { left: 678, top: 370 + i * 38, width: 16, height: 16 }, { fill: C.coral, stroke: C.coral });
    text(slide, b, { left: 712, top: 364 + i * 38, width: 330, height: 24 }, { fontSize: 17, color: C.ink });
  });
  text(slide, "Updated readiness: controlled demo 82% / public production 74%", { left: 194, top: 600, width: 820, height: 34 }, { fontSize: 25, bold: true, align: "center", color: C.blue });
  footer(slide, 8);
  return slide;
}
