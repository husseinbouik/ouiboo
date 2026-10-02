import { C, addBg, box, footer, kicker, rule, text, title } from "./theme.mjs";

export async function slide02(presentation) {
  const slide = presentation.slides.add();
  addBg(slide);
  kicker(slide, "Product System", "02");
  title(slide, "Ouiboo organizes travel demand, agency supply, and platform governance into one marketplace loop.", "The platform is not a single storefront; it is three role-specific applications coordinated by one API, one data model, and financial controls.");
  const lanes = [
    ["Traveler", "Search trips\nBook sessions\nPay securely\nReview + wishlist", C.teal],
    ["Agency", "Create supply\nManage bookings\nMessage travelers\nWithdraw earnings", C.ochre],
    ["Admin", "Approve agencies\nMonitor finance\nResolve refunds\nGovern quality", C.coral]
  ];
  lanes.forEach(([head, body, color], i) => {
    const x = 80 + i * 380;
    box(slide, { left: x, top: 298, width: 320, height: 210 }, { fill: C.white, stroke: color, width: 3 });
    rule(slide, x, 298, 320, color, 8);
    text(slide, head, { left: x + 24, top: 326, width: 220, height: 34 }, { fontSize: 27, bold: true });
    text(slide, body, { left: x + 24, top: 378, width: 260, height: 98 }, { fontSize: 20, color: C.muted });
  });
  rule(slide, 245, 534, 770, C.blue, 3);
  text(slide, "Shared capabilities: Auth/RBAC • Trips • Bookings • Payments • Wallet • Reviews • Messaging • Notifications • Analytics", { left: 168, top: 558, width: 940, height: 30 }, { fontSize: 18, bold: true, align: "center" });
  footer(slide, 2);
  return slide;
}
