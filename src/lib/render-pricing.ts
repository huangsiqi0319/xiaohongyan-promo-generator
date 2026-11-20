import type { Design, RenderResult } from "../types";
import { getPricingTable } from "./pricing";
import { planPricing } from "./pricing-layout";
import { wrapText } from "./layout";
import { POSTER_THEME } from "./poster-theme";

const { sans: SANS, serif: SERIF } = POSTER_THEME;
const colors = { ink: POSTER_THEME.ink, muted: POSTER_THEME.muted };

export function renderPricingPage(
  ctx: CanvasRenderingContext2D,
  d: Design,
  background: boolean,
): RenderResult {
  const table = getPricingTable(d),
    width = 904,
    left = 88;
  const measure = (v: string, size: number, serif = false) => {
    ctx.font = `400 ${size}px ${serif ? SERIF : SANS}`;
    return ctx.measureText(v).width;
  };
  const draw = (
    value: string,
    top: number,
    size: number,
    center = false,
    serif = false,
    color: string = colors.ink,
    draw = true,
  ) => {
    if (!value) return 0;
    const lines = wrapText(value, width, (v) => measure(v, size, serif));
    if (draw) {
      ctx.font = `400 ${size}px ${serif ? SERIF : SANS}`;
      ctx.fillStyle = color;
      ctx.textBaseline = "top";
      lines.forEach((v, i) =>
        ctx.fillText(
          v,
          left + (center ? (width - measure(v, size, serif)) / 2 : 0),
          top + i * size * 1.5,
        ),
      );
    }
    return lines.length * size * 1.5;
  };
  let y = 176;
  y += draw(
    d.title || "课程价目表",
    y,
    d.height === 1080 ? 62 : 76,
    true,
    true,
  );
  const meta = [
    table.showCurrency ? table.currencyLabel : "",
    table.showDate ? d.dateRange : "",
  ].filter(Boolean);
  if (meta.length) {
    y += 14;
    for (const line of meta) y += draw(line, y, 22, true, false, colors.muted);
  }
  const bodyY = y + 32;
  const footer = [
    d.demo ? "演示数据 · 金额仅供排版参考，请替换为机构实际收费。" : "",
    table.showFooterNote ? d.note : "",
  ]
    .filter(Boolean)
    .join("\n");
  const footerHeight = draw(footer, 0, 20, false, false, colors.muted, false);
  const footerY = d.height - 84 - footerHeight;
  const available = footerY - bodyY - 28;
  const plan = planPricing(d, measure, available);
  if (background) {
    ctx.save();
    ctx.translate(540, bodyY + plan.height / 2);
    ctx.scale(560, Math.max(1, (plan.height + 120) / 2));
    const fog = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    fog.addColorStop(0, "rgba(250,248,244,.40)");
    fog.addColorStop(0.55, "rgba(250,248,244,.28)");
    fog.addColorStop(1, "rgba(250,248,244,0)");
    ctx.fillStyle = fog;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  ctx.save();
  // Invalid previews stay within the body; export is blocked with an explicit explanation.
  ctx.beginPath();
  ctx.rect(left, bodyY, width, Math.max(0, available));
  ctx.clip();
  ctx.strokeStyle = POSTER_THEME.line;
  ctx.lineWidth = 1;
  for (const yy of plan.rules) {
    ctx.beginPath();
    ctx.moveTo(left, bodyY + yy);
    ctx.lineTo(left + width, bodyY + yy);
    ctx.stroke();
  }
  for (const t of plan.texts) {
    ctx.font = `400 ${t.size}px ${t.serif ? SERIF : SANS}`;
    ctx.fillStyle = colors[t.color];
    ctx.textBaseline = "top";
    const tw = measure(t.value, t.size, t.serif);
    const offset =
      t.align === "center"
        ? (t.width - tw) / 2
        : t.align === "right"
          ? t.width - tw
          : 0;
    ctx.fillText(t.value, left + t.x + offset, bodyY + t.y);
  }
  ctx.restore();
  if (footer) {
    ctx.strokeStyle = "rgba(100,101,96,.24)";
    ctx.beginPath();
    ctx.moveTo(left, footerY - 16);
    ctx.lineTo(left + width, footerY - 16);
    ctx.stroke();
    draw(footer, footerY, 20, false, false, colors.muted);
  }
  draw(
    "以 舞 为 诗   ·   向 美 而 生",
    d.height - 42,
    18,
    false,
    false,
    colors.muted,
  );
  return {
    overflow: plan.overflow || available < 0,
    bodyFont: plan.fontSize,
    contentBottom: bodyY + plan.height,
    overflowReason: plan.reason,
  };
}
