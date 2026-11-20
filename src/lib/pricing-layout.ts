import type { Design } from "../types";
import { getPricingTable } from "./pricing";
import { wrapText } from "./layout";

type Measure = (value: string, size: number, serif?: boolean) => number;
export function hasVisiblePricingContent(d: Design): boolean {
  const t = getPricingTable(d);
  return (
    t.sections.some((s) => s.enabled && s.columns.some((c) => c.enabled)) ||
    t.remarks.some((r) => r.enabled && Boolean(r.text))
  );
}
export interface PricingText {
  value: string;
  x: number;
  y: number;
  width: number;
  size: number;
  serif: boolean;
  align: "left" | "center" | "right";
  color: "ink" | "muted";
  role: "header" | "cell" | "gift" | "note" | "heading";
}
export interface PricingPlan {
  texts: PricingText[];
  rules: number[];
  height: number;
  fontSize: number;
  overflow: boolean;
  reason?: string;
}

export function getPricingVisibleText(d: Design): string[] {
  const t = getPricingTable(d);
  return [
    d.title,
    t.showCurrency ? t.currencyLabel : "",
    t.showDate ? d.dateRange : "",
    ...t.sections
      .filter((s) => s.enabled && s.columns.some((c) => c.enabled))
      .flatMap((s) => [
        ...s.columns.filter((c) => c.enabled).map((c) => c.label),
        ...s.rows
          .filter((r) => r.enabled !== false)
          .flatMap((r) => [
            ...s.columns
              .filter((c) => c.enabled)
              .map((c) => r.cells[c.id] ?? ""),
            s.showGifts && r.showGift && r.gift ? `赠送：${r.gift}` : "",
            s.showRowNotes && r.showNote ? r.note : "",
          ]),
        s.showNote && s.note ? s.noteTitle : "",
        s.showNote ? s.note : "",
      ]),
    ...t.remarks
      .filter((r) => r.enabled && r.text)
      .flatMap((r) => [r.title, r.text]),
    t.showFooterNote ? d.note : "",
  ].filter(Boolean);
}

function layout(d: Design, measure: Measure, fontSize: number): PricingPlan {
  const t = getPricingTable(d),
    width = 904;
  const plan: PricingPlan = {
    texts: [],
    rules: [],
    height: 0,
    fontSize,
    overflow: false,
  };
  let y = 0,
    narrow = false;
  const pad = d.layout === "airy" ? 18 : 14;
  const gap = d.layout === "airy" ? 54 : 40;
  const small = Math.max(18, fontSize - 7);
  const add = (
    value: string,
    x: number,
    top: number,
    w: number,
    size: number,
    role: PricingText["role"],
    align: PricingText["align"] = "left",
    color: PricingText["color"] = "ink",
    serif = false,
  ) => {
    if (!value) return 0;
    const safeWidth = Math.max(1, w);
    if (
      Array.from(value).some(
        (c) => c !== "\n" && measure(c, size, serif) > safeWidth,
      )
    )
      narrow = true;
    const lines = wrapText(value, safeWidth, (s) => measure(s, size, serif));
    lines.forEach((line, i) =>
      plan.texts.push({
        value: line,
        x,
        y: top + i * size * 1.5,
        width: safeWidth,
        size,
        role,
        align,
        color,
        serif,
      }),
    );
    return lines.length * size * 1.5;
  };
  for (const section of t.sections) {
    const columns = section.columns.filter((c) => c.enabled);
    if (!section.enabled || !columns.length) continue;
    if (y) y += gap;
    const total = columns.reduce((n, c) => n + c.weight, 0);
    const widths = columns.map((c) => (width * c.weight) / total);
    const headerTop = y;
    let x = 0,
      headerHeight = 22 * 1.5;
    columns.forEach((c, i) => {
      headerHeight = Math.max(
        headerHeight,
        add(
          c.label,
          x + 12,
          headerTop + 10,
          widths[i] - 24,
          22,
          "header",
          "center",
          "muted",
        ),
      );
      x += widths[i];
    });
    headerHeight += 20;
    y += headerHeight;
    plan.rules.push(y);
    for (const row of section.rows.filter((r) => r.enabled !== false)) {
      x = 0;
      const top = y + pad;
      let height = fontSize * 1.5;
      columns.forEach((c, i) => {
        height = Math.max(
          height,
          add(
            row.cells[c.id] ?? "",
            x + 12,
            top,
            widths[i] - 24,
            fontSize,
            "cell",
            "center",
          ),
        );
        x += widths[i];
      });
      y = top + height;
      if (section.showGifts && row.showGift && row.gift) {
        y += 4;
        y += add(
          `赠送：${row.gift}`,
          12,
          y,
          width - 24,
          small,
          "gift",
          "right",
          "muted",
        );
      }
      if (section.showRowNotes && row.showNote && row.note) {
        y += 4;
        y += add(row.note, 12, y, width - 24, small, "note", "left", "muted");
      }
      y += pad;
    }
    if (section.showNote && section.note) {
      y += 16;
      y += add(
        section.noteTitle,
        0,
        y,
        width,
        small + 3,
        "heading",
        "left",
        "muted",
        true,
      );
      if (section.noteTitle) y += 6;
      y += add(section.note, 0, y, width, small, "note", "left", "muted");
    }
  }
  for (const remark of t.remarks) {
    if (!remark.enabled || !remark.text) continue;
    if (y) {
      y += gap;
      plan.rules.push(y);
      y += 18;
    }
    y += add(
      remark.title,
      0,
      y,
      width,
      fontSize,
      "heading",
      "left",
      "ink",
      true,
    );
    if (remark.title) y += 8;
    y += add(remark.text, 0, y, width, Math.max(20, fontSize - 4), "note");
  }
  plan.height = y;
  plan.overflow = narrow;
  if (narrow)
    plan.reason =
      "部分列过窄，无法完整显示文字。请增加列宽，或隐藏不需要的列。";
  return plan;
}

export function planPricing(
  d: Design,
  measure: Measure,
  available: number,
): PricingPlan {
  let plan: PricingPlan | undefined;
  for (let size = 30; size >= 22; size -= 2) {
    plan = layout(d, measure, size);
    if (!plan.overflow && plan.height <= available) return plan;
  }
  return {
    ...plan!,
    overflow: true,
    reason:
      plan!.reason ??
      "价目内容超出画面，请切换至 1080 × 1920、使用「雅序」布局，或关闭部分分区、列和说明。",
  };
}
