export const C = {
  paper: "#F7F3EA",
  ink: "#14213D",
  muted: "#6C6A61",
  line: "#D8D1C3",
  coral: "#E76F51",
  teal: "#2A9D8F",
  ochre: "#E9C46A",
  blue: "#264653",
  white: "#FFFFFF",
  greenSoft: "#DDEFE8",
  amberSoft: "#F5E7BF",
  redSoft: "#F2D5CC",
  blueSoft: "#DAE5EA"
};

export function addBg(slide) {
  slide.shapes.add({
    geometry: "rect",
    position: { left: 0, top: 0, width: 1280, height: 720 },
    fill: C.paper,
    line: { width: 0, fill: C.paper }
  });
}

export function text(slide, body, pos, style = {}) {
  const shape = slide.shapes.add({ geometry: "textbox", position: pos });
  shape.text.set(body);
  shape.text.style = {
    fontFace: "Aptos",
    fontSize: style.fontSize ?? 20,
    color: style.color ?? C.ink,
    bold: style.bold ?? false,
    italic: style.italic ?? false,
    align: style.align ?? "left",
    valign: style.valign ?? "top"
  };
  return shape;
}

export function box(slide, pos, opts = {}) {
  return slide.shapes.add({
    geometry: opts.geometry ?? "rect",
    position: pos,
    fill: opts.fill ?? C.white,
    line: opts.line ?? { fill: opts.stroke ?? C.line, style: "solid", width: opts.width ?? 1 },
    borderRadius: opts.radius ?? 0
  });
}

export function rule(slide, left, top, width, color = C.line, h = 2) {
  return box(slide, { left, top, width, height: h }, { fill: color, line: { width: 0, fill: color } });
}

export function kicker(slide, label, n = "01") {
  box(slide, { left: 74, top: 54, width: 28, height: 10 }, { fill: C.coral, line: { width: 0, fill: C.coral } }).name = `kicker-${n}-marker`;
  const k = text(slide, label.toUpperCase(), { left: 114, top: 44, width: 420, height: 32 }, {
    fontSize: 12,
    bold: true,
    color: C.muted,
    valign: "mid"
  });
  k.name = `kicker-${n}-label`;
}

export function title(slide, claim, note) {
  text(slide, claim, { left: 74, top: 92, width: 930, height: 104 }, { fontSize: 40, bold: true });
  if (note) text(slide, note, { left: 76, top: 194, width: 760, height: 48 }, { fontSize: 17, color: C.muted });
}

export function footer(slide, page) {
  rule(slide, 74, 668, 1060, C.line, 1);
  text(slide, "Sources: repository docs and hardening execution report", { left: 74, top: 676, width: 620, height: 20 }, { fontSize: 10, color: C.muted });
  text(slide, String(page).padStart(2, "0"), { left: 1160, top: 676, width: 45, height: 20 }, { fontSize: 10, color: C.muted, align: "right" });
}

export function statusPill(slide, label, x, y, color) {
  box(slide, { left: x, top: y, width: 130, height: 32 }, { fill: color, stroke: color });
  text(slide, label, { left: x + 12, top: y + 7, width: 106, height: 18 }, { fontSize: 12, bold: true, color: C.ink, align: "center" });
}
