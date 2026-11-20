import { describe, expect, it } from "vitest";
import { createDesign } from "./model";
import type { PricingPlan } from "./pricing-layout";
import { planPricing, getPricingVisibleText } from "./pricing-layout";

const measure = (value: string, size: number) =>
  Array.from(value).length * size * 0.8;
const values = (plan: PricingPlan) => plan.texts.map((t) => t.value).join(" ");

describe("价目表自动布局", () => {
  it("隐藏列后其他列填满宽度，重新开启仍有原金额", () => {
    const d = createDesign("pricing"),
      section = d.pricingTable!.sections[0];
    const before = planPricing(d, measure, 1600);
    section.columns[1].enabled = false;
    const after = planPricing(d, measure, 1600);
    expect(values(after)).not.toContain("1,500");
    expect(
      after.texts.find((t) => t.value === "体验课")!.width,
    ).toBeGreaterThan(before.texts.find((t) => t.value === "体验课")!.width);
    section.columns[1].enabled = true;
    expect(values(planPricing(d, measure, 1600))).toContain("1,500");
  });

  it("关闭分区、赠品和说明后不保留空位，可访问文字也不泄漏隐藏内容", () => {
    const d = createDesign("pricing"),
      table = d.pricingTable!;
    const before = planPricing(d, measure, 1600);
    table.sections[0].showGifts = false;
    table.sections[0].showNote = false;
    table.sections[1].enabled = false;
    table.remarks[0].enabled = false;
    const after = planPricing(d, measure, 1600);
    expect(after.height).toBeLessThan(before.height);
    expect(values(after)).not.toContain("舞蹈袜");
    expect(getPricingVisibleText(d).join(" ")).not.toMatch(
      /一对一私教|舞蹈袜|入会费|补课安排/,
    );
  });

  it("长表头、单元格和赠品都增加真实行高，不侵入后续行", () => {
    const d = createDesign("pricing"),
      section = d.pricingTable!.sections[0];
    section.columns[0].label = "可自由编辑的很长课程类别表头";
    section.rows[0].cells[section.columns[0].id] =
      "中国古典舞初学者基础训练专项课程";
    section.rows[0].gift = "附赠说明".repeat(20);
    const plan = planPricing(d, measure, 2500);
    expect(plan.overflow).toBe(false);
    const gift = plan.texts.filter((t) => t.role === "gift");
    const second = plan.texts.find((t) => t.value === "次卡")!;
    expect(gift.filter((t) => t.y < second.y).length).toBeGreaterThan(1);
    expect(second.y).toBeGreaterThan(
      Math.max(...gift.filter((t) => t.y < second.y).map((t) => t.y + t.size)),
    );
    for (const t of plan.texts)
      expect(measure(t.value, t.size)).toBeLessThanOrEqual(t.width + 0.01);
  });

  it("所有分区和备注关闭时返回空态，不崩溃", () => {
    const d = createDesign("pricing");
    d.pricingTable!.sections.forEach((s) =>
      s.columns.forEach((c) => (c.enabled = false)),
    );
    d.pricingTable!.remarks.forEach((r) => (r.enabled = false));
    const plan = planPricing(d, measure, 500);
    expect(plan.overflow).toBe(false);
    expect(plan.rules).toHaveLength(0);
    expect(plan.texts).toHaveLength(0);
    expect(plan.height).toBe(0);
  });

  it("内容过多或列过窄时拒绝安全适配，字号不低于22px", () => {
    const d = createDesign("pricing");
    expect(planPricing(d, measure, 150).overflow).toBe(true);
    expect(planPricing(d, measure, 150).fontSize).toBe(22);
    const section = d.pricingTable!.sections[0];
    section.columns.push(
      ...Array.from({ length: 80 }, (_, i) => ({
        id: `x${i}`,
        label: "字",
        enabled: true,
        weight: 1,
      })),
    );
    const narrow = planPricing(d, measure, 3000);
    expect(narrow.overflow).toBe(true);
    expect(narrow.reason).toContain("列");
  });

  it("单独隐藏价格行，画布与无障碍内容都不包含，重新开启恢复", () => {
    const d = createDesign("pricing"),
      row = d.pricingTable!.sections[0].rows[0];
    const before = planPricing(d, measure, 1600);
    row.enabled = false;
    const hidden = planPricing(d, measure, 1600);
    expect(values(hidden)).not.toContain("1,500");
    expect(hidden.height).toBeLessThan(before.height);
    expect(getPricingVisibleText(d)).not.toContain("体验课");
    row.enabled = true;
    expect(values(planPricing(d, measure, 1600))).toContain("1,500");
  });

  it("表格沿用课表的暖灰文字和细线，不使用绿色色块或反白表头", () => {
    const plan = planPricing(createDesign("pricing"), measure, 1600);
    expect(plan.texts.every((t) => ["ink", "muted"].includes(t.color))).toBe(
      true,
    );
    expect(
      plan.texts
        .filter((t) => t.role === "header")
        .every((t) => !t.serif && t.size === 22),
    ).toBe(true);
    expect(plan).not.toHaveProperty("bands");
  });
});
