import type { AssetView, Design, RenderResult } from "../types";
import { planSchedule } from "./schedule-layout";
import { fitBodyFont, wrapText } from "./layout";

const INK = "#514b48";
const MUTED = "#777571";
const LINE = "rgba(100, 101, 96, .25)";
const SERIF = '"Noto Serif SC", serif';
const SANS = '"Noto Sans SC", sans-serif';
type Context = CanvasRenderingContext2D;
type TextOptions = {
  center?: boolean;
  size?: number;
  width?: number;
  color?: string;
  serif?: boolean;
  weight?: number;
  lineHeight?: number;
  draw?: boolean;
};

function font(ctx: Context, size: number, serif = false, weight = 400) {
  ctx.font = `${weight} ${size}px ${serif ? SERIF : SANS}`;
}
function text(
  ctx: Context,
  value: string,
  x: number,
  y: number,
  options: TextOptions = {},
): number {
  const {
    size = 28,
    width = 904,
    color = INK,
    serif = false,
    weight = 400,
    lineHeight = 1.5,
    draw = true,
  } = options;
  font(ctx, size, serif, weight);
  const lines = wrapText(value, width, (s) => ctx.measureText(s).width);
  if (draw) {
    ctx.fillStyle = color;
    ctx.textBaseline = "top";
    lines.forEach((line, i) =>
      ctx.fillText(
        line,
        options.center ? x + (width - ctx.measureText(line).width) / 2 : x,
        y + i * size * lineHeight,
      ),
    );
  }
  return lines.length * size * lineHeight;
}
function rule(ctx: Context, x: number, y: number, width: number, color = LINE) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();
function loadImage(url: string): Promise<HTMLImageElement> {
  if (!imageCache.has(url))
    imageCache.set(
      url,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
          imageCache.delete(url);
          reject(new Error("图片无法读取，请重新导入素材。"));
        };
        img.src = url;
      }),
    );
  return imageCache.get(url)!;
}

function cover(
  ctx: Context,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  cropX = 50,
  cropY = 50,
) {
  const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
  const sw = width / scale,
    sh = height / scale;
  ctx.drawImage(
    img,
    ((img.naturalWidth - sw) * cropX) / 100,
    ((img.naturalHeight - sh) * cropY) / 100,
    sw,
    sh,
    x,
    y,
    width,
    height,
  );
}
function contain(
  ctx: Context,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
  const w = img.naturalWidth * scale,
    h = img.naturalHeight * scale;
  ctx.drawImage(img, x + (width - w) / 2, y + (height - h) / 2, w, h);
}

function drawSchedule(
  ctx: Context,
  d: Design,
  y: number,
  plan: ReturnType<typeof planSchedule>,
) {
  const headings = ["星期", "上课时间", "课程名称", "教师", "教室"];
  headings.forEach((value, i) =>
    text(ctx, value, plan.xs[i], y, {
      size: 20,
      width: plan.widths[i] - 12,
      color: MUTED,
    }),
  );
  rule(ctx, 88, y + 36, 904);
  if (!plan.rows.length) {
    text(ctx, "暂无课程，请在左侧添加本周课程。", 88, y + 62, { size: 26 });
    return;
  }
  for (const row of plan.rows) {
    const rowY = y + 48 + plan.rows.indexOf(row) * plan.rowHeight;
    row.values.forEach((value, i) => {
      ctx.save();
      // In an invalid preview, keep cells separate; export remains blocked until it fits.
      ctx.beginPath();
      ctx.rect(plan.xs[i], rowY, plan.widths[i] - 12, plan.rowHeight);
      ctx.clip();
      font(ctx, plan.fontSize);
      ctx.fillStyle = i === 0 ? MUTED : INK;
      ctx.textBaseline = "top";
      ctx.fillText(
        value,
        plan.xs[i],
        rowY + (plan.rowHeight - plan.fontSize * 1.45) / 2,
      );
      ctx.restore();
    });
    if (!d.backgroundId)
      rule(ctx, 88, rowY + plan.rowHeight, 904, "rgba(100,101,96,.12)");
  }
}

const money = (v: string) =>
  v.trim() ? (/^[\d,.\s]+$/.test(v) ? `¥ ${v}` : v) : "—";
function pricingBody(
  ctx: Context,
  d: Design,
  y: number,
  size: number,
  draw: boolean,
): number {
  const start = y,
    airy = d.layout === "airy";
  if (!d.prices.length)
    return text(ctx, "暂无价格项目，请在左侧添加。", 88, y + 28, {
      size,
      draw,
    });
  if (d.height === 1080 && !airy) {
    for (const [label, x, width] of [
      ["课程 / 类别", 88, 370],
      ["单次", 500, 208],
      ["套餐 / 课时", 736, 256],
    ] as const)
      text(ctx, label, x, y, { size: 21, width, color: MUTED, draw });
    y += 44;
    if (draw) rule(ctx, 88, y - 10, 904);
    for (const item of d.prices) {
      const top = y + 10;
      const labelH = text(ctx, item.category || "课程", 88, top, {
        size: 20,
        width: 370,
        lineHeight: 1.4,
        color: MUTED,
        draw,
      });
      const nameH = text(ctx, item.name || "未命名课程", 88, top + labelH + 3, {
        size: size + 4,
        width: 370,
        serif: true,
        weight: 600,
        lineHeight: 1.4,
        draw,
      });
      const a = text(ctx, money(item.single), 500, top + 15, {
        size,
        width: 208,
        serif: true,
        lineHeight: 1.4,
        draw,
      });
      const b = text(
        ctx,
        `${money(item.packagePrice)}${item.sessions ? ` / ${item.sessions}` : ""}`,
        736,
        top + 15,
        { size, width: 256, serif: true, lineHeight: 1.4, draw },
      );
      const detail = [
        item.offer,
        item.validity ? `有效期 ${item.validity}` : "",
        item.note,
      ]
        .filter(Boolean)
        .join(" · ");
      const detailY = Math.max(
        top + labelH + nameH + 12,
        top + 15 + Math.max(a, b) + 12,
      );
      y =
        detailY +
        (detail
          ? text(ctx, detail, 88, detailY, {
              size: 23,
              lineHeight: 1.4,
              color: MUTED,
              draw,
            })
          : 0) +
        20;
      if (draw) rule(ctx, 88, y, 904);
    }
    return y - start;
  }
  if (draw) rule(ctx, 88, y - 8, 904);
  for (const item of d.prices) {
    const top = y + 26;
    const labelH = text(ctx, item.category || "课程", 88, top, {
      size: 21,
      width: airy ? 904 : 370,
      color: MUTED,
      draw,
    });
    const nameH = text(ctx, item.name || "未命名课程", 88, top + labelH + 5, {
      size: size + 6,
      width: airy ? 904 : 370,
      serif: true,
      weight: 600,
      draw,
    });
    const detail = [
      item.offer,
      item.validity ? `有效期 ${item.validity}` : "",
      item.note,
    ]
      .filter(Boolean)
      .join(" · ");
    let bottom: number;
    if (airy) {
      const priceY = top + labelH + nameH + 20;
      const a = text(ctx, `单次  ${money(item.single)}`, 88, priceY, {
        size,
        width: 420,
        draw,
      });
      const b = text(
        ctx,
        `套餐  ${money(item.packagePrice)}${item.sessions ? ` / ${item.sessions}` : ""}`,
        540,
        priceY,
        { size, width: 452, draw },
      );
      const detailY = priceY + Math.max(a, b) + 12;
      bottom =
        detailY +
        (detail
          ? text(ctx, detail, 88, detailY, { size: 23, color: MUTED, draw })
          : 0);
    } else {
      text(ctx, "单次", 500, top, { size: 21, color: MUTED, width: 176, draw });
      text(ctx, "套餐", 736, top, { size: 21, color: MUTED, width: 256, draw });
      const a = text(ctx, money(item.single), 500, top + 38, {
        size: size + 4,
        width: 208,
        serif: true,
        draw,
      });
      const b = text(ctx, money(item.packagePrice), 736, top + 38, {
        size: size + 12,
        width: 256,
        serif: true,
        draw,
      });
      const sessionsH = item.sessions
        ? text(ctx, item.sessions, 736, top + 38 + b, {
            size: 23,
            width: 256,
            color: MUTED,
            draw,
          })
        : 0;
      const detailY = Math.max(
        top + labelH + nameH + 12,
        top + 38 + Math.max(a, b + sessionsH) + 12,
      );
      bottom =
        detailY +
        (detail
          ? text(ctx, detail, 88, detailY, { size: 23, color: MUTED, draw })
          : 0);
    }
    y = bottom + 28;
    if (draw) rule(ctx, 88, y, 904, "rgba(100, 101, 96, .20)");
  }
  return y - start;
}

function eventBody(
  ctx: Context,
  d: Design,
  y: number,
  size: number,
  draw: boolean,
  photo?: HTMLImageElement,
  qr?: HTMLImageElement,
): number {
  const start = y,
    e = d.event;
  const introWidth = photo ? 490 : 904;
  const subtitleH = text(ctx, e.subtitle, 88, y, {
    size: size + 10,
    serif: true,
    width: introWidth,
    draw,
  });
  const descH = text(ctx, e.description, 88, y + subtitleH + 20, {
    size,
    width: introWidth,
    draw,
  });
  if (photo && draw) cover(ctx, photo, 628, y, 364, 360);
  y += Math.max(subtitleH + descH + 20, photo ? 360 : 0) + 40;
  if (draw) rule(ctx, 88, y - 15, 904);
  const fields = [
    ["日期 / 时间", [e.date, e.time].filter(Boolean).join("  ·  ")],
    ["活动地点", e.location],
    ["授课教师", e.teacher],
    ["课程费用", e.price],
    ["报名方式", e.registration],
  ];
  for (const [label, value] of fields) {
    if (!value) continue;
    const labelH = text(ctx, label, 88, y, {
      size: 23,
      width: 150,
      color: MUTED,
      draw,
    });
    const valueH = text(ctx, value, 268, y, {
      size,
      width: qr ? 500 : 724,
      draw,
    });
    y += Math.max(labelH, valueH) + 18;
  }
  if (qr) {
    const qrTop = Math.max(
      start + Math.max(subtitleH + descH + 20, photo ? 360 : 0) + 40,
      y - 220,
    );
    if (draw) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(806, qrTop, 186, 186);
      contain(ctx, qr, 814, qrTop + 8, 170, 170);
      text(ctx, "扫码了解详情", 806, qrTop + 196, { size: 21, width: 186 });
    }
    y = Math.max(y, qrTop + 232);
  }
  return y - start;
}

export async function renderPoster(
  canvas: HTMLCanvasElement,
  d: Design,
  assets: AssetView[],
): Promise<RenderResult> {
  const allText = JSON.stringify(d);
  await Promise.all([
    document.fonts.load(`400 28px ${SANS}`, allText),
    document.fonts.load(`600 72px ${SERIF}`, allText),
    document.fonts.load(`400 40px ${SERIF}`, allText),
  ]);
  const resolve = async (id: string | null) => {
    if (!id) return undefined;
    const asset = assets.find((a) => a.id === id);
    if (!asset) throw new Error("该设计的图片素材已丢失，请重新选择或上传。");
    return loadImage(asset.url);
  };
  const background = d.backgroundId
    ? assets.find((a) => a.id === d.backgroundId)
    : undefined;
  if (background && d.kind !== "event" && !background.noPeople)
    throw new Error("课程表和价目表只能使用已确认为无人像的背景。");
  const [bg, logo, photo, qr] = await Promise.all([
    resolve(d.backgroundId),
    resolve(d.logoId),
    d.kind === "event" ? resolve(d.photoId) : undefined,
    d.kind === "event" ? resolve(d.qrId) : undefined,
  ]);
  canvas.width = 1080;
  canvas.height = d.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("此浏览器不支持图片画布，请使用新版浏览器。");
  ctx.fillStyle = "#f4f1eb";
  ctx.fillRect(0, 0, 1080, d.height);
  if (bg) cover(ctx, bg, 0, 0, 1080, d.height, d.cropX, d.cropY);
  // Only overlays are drawn. The uploaded background pixels themselves are never regenerated.
  ctx.fillStyle = `rgba(249,247,242,${bg ? (d.mist / 100) * 0.88 : 0.35})`;
  ctx.fillRect(0, 0, 1080, d.height);
  if (logo) contain(ctx, logo, bg ? 450 : 88, 58, 180, 66);
  else
    text(ctx, "小 鸿 雁", 88, 64, {
      size: 31,
      serif: true,
      weight: 600,
      width: bg ? 904 : 240,
      center: Boolean(bg),
    });
  text(ctx, "DANCE  &  ART", bg ? 88 : 774, bg ? 112 : 72, {
    size: bg ? 16 : 19,
    width: bg ? 904 : 230,
    color: MUTED,
    center: Boolean(bg),
  });
  rule(ctx, bg ? 516 : 88, 148, bg ? 48 : 904);
  const titleSize = d.height === 1080 ? 62 : 76;
  const titleY = 176;
  const titleH = text(ctx, d.title || "未命名物料", 88, titleY, {
    size: titleSize,
    serif: true,
    weight: bg ? 400 : 600,
    lineHeight: 1.35,
    center: Boolean(bg),
  });
  const english = {
    schedule: "WEEKLY SCHEDULE",
    pricing: "COURSE COLLECTION",
    event: "A MOMENT TO DANCE",
  }[d.kind];
  const metaY = titleY + titleH + 22;
  const dateH = text(ctx, d.dateRange, 88, metaY, {
    size: 24,
    width: bg ? 904 : 562,
    color: MUTED,
    center: Boolean(bg),
  });
  text(ctx, english, bg ? 88 : 692, bg ? metaY + dateH + 4 : metaY + 3, {
    size: 17,
    width: bg ? 904 : 300,
    color: MUTED,
    center: Boolean(bg),
  });
  const bodyY =
    metaY + Math.max(dateH, 36) + (d.height === 1080 ? 30 : 54) + (bg ? 24 : 0);
  const footerText = [
    d.demo
      ? "演示数据 · 课程与价格仅供排版参考，不代表机构实际安排或收费。"
      : "",
    d.note,
  ]
    .filter(Boolean)
    .join("\n");
  const footerH = footerText
    ? text(ctx, footerText, 88, 0, {
        size: 22,
        width: 904,
        draw: false,
        lineHeight: 1.6,
      })
    : 0;
  const footerY = d.height - 98 - footerH;
  const available = footerY - bodyY - 42;
  const schedule =
    d.kind === "schedule"
      ? planSchedule(
          d,
          (value, size) => {
            font(ctx, size);
            return ctx.measureText(value).width;
          },
          available,
        )
      : null;
  const measureBody = (f: number) =>
    d.kind === "pricing"
      ? pricingBody(ctx, d, bodyY, f, false)
      : eventBody(ctx, d, bodyY, f, false, photo, qr);
  const fit = schedule
    ? { fontSize: schedule.fontSize, overflow: schedule.overflow }
    : fitBodyFont(available, measureBody);
  const bodyH = schedule ? schedule.height : measureBody(fit.fontSize);
  if (bg) {
    ctx.save();
    ctx.translate(540, bodyY + bodyH / 2);
    ctx.scale(520, (bodyH + 160) / 2);
    const mist = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    mist.addColorStop(0, "rgba(250,248,244,.40)");
    mist.addColorStop(0.55, "rgba(250,248,244,.28)");
    mist.addColorStop(1, "rgba(250,248,244,0)");
    ctx.fillStyle = mist;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  if (schedule) drawSchedule(ctx, d, bodyY, schedule);
  else if (d.kind === "pricing") pricingBody(ctx, d, bodyY, fit.fontSize, true);
  else eventBody(ctx, d, bodyY, fit.fontSize, true, photo, qr);
  if (!fit.overflow) {
    rule(ctx, 88, footerY - 24, 904);
    text(ctx, footerText, 88, footerY, {
      size: 22,
      color: MUTED,
      lineHeight: 1.6,
    });
  }
  text(ctx, "以 舞 为 诗   ·   向 美 而 生", 88, d.height - 46, {
    size: 18,
    color: MUTED,
  });
  return {
    overflow: fit.overflow || bodyY < 0 || footerY < bodyY,
    bodyFont: fit.fontSize,
    overflowReason: schedule?.reason,
    contentBottom: bodyY + bodyH,
  };
}
