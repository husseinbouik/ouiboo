import { C, addBg, box, footer, kicker, text, title } from "./theme.mjs";

export async function slide05(presentation) {
  const slide = presentation.slides.add();
  addBg(slide);
  kicker(slide, "Security Controls", "05");
  title(slide, "Security is now documented as an endpoint inventory, but launch needs failing-authorization proof.", "The right question is no longer whether RBAC exists; it is whether every route proves auth, role, ownership, pagination, sorting, filtering, and rate limits.");
  const controls = [
    ["Auth guard", "JWT boundary on private APIs", "verify all routes"],
    ["Role guard", "traveler / agency / admin", "analytics fixed"],
    ["Ownership", "tenant + resource owner checks", "needs E2E failures"],
    ["Pagination", "bounded list endpoints", "remaining rollout"],
    ["Input rules", "sort allowlists + filters", "needs audit closure"],
    ["Rate limits", "Redis counters by route/user/IP", "production REDIS_URL"]
  ];
  controls.forEach(([name, value, note], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 82 + col * 362;
    const y = 304 + row * 130;
    box(slide, { left: x, top: y, width: 310, height: 94 }, { fill: C.white, stroke: i < 2 || i === 5 ? C.teal : C.ochre, width: 2 });
    text(slide, name, { left: x + 20, top: y + 16, width: 260, height: 24 }, { fontSize: 21, bold: true });
    text(slide, value, { left: x + 20, top: y + 45, width: 260, height: 20 }, { fontSize: 14, color: C.muted });
    text(slide, note, { left: x + 20, top: y + 68, width: 260, height: 16 }, { fontSize: 11, color: i < 2 || i === 5 ? C.teal : C.coral, bold: true });
  });
  footer(slide, 5);
  return slide;
}
