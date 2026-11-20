import { describe, expect, it } from "vitest";
import { createDesign, duplicateDesign, isDesign } from "./model";
import { parseState } from "./storage";

describe("自由分区价目表", () => {
  it("新价目表默认包含三种可编辑的日元演示分区", () => {
    const d = createDesign("pricing");
    expect(d.pricingTable?.sections).toHaveLength(3);
    expect(d.pricingTable?.sections[0].columns.map((c) => c.label)).toEqual([
      "常规课",
      "价格",
      "课时",
      "有效期",
    ]);
    expect(d.pricingTable?.sections[0].rows).toHaveLength(5);
    expect(d.pricingTable?.currencyLabel).toContain("日元");
    expect(d.height).toBe(1920);
    expect(d.demo).toBe(true);
  });

  it("拒绝非法新结构，不把损坏的备份当成有效设计", () => {
    const d = createDesign("pricing");
    expect(isDesign({ ...d, pricingTable: { sections: "broken" } })).toBe(
      false,
    );
  });

  it("旧价格迁移保持原值，不添加演示私教或虚构货币", async () => {
    const { getPricingTable } = await import("./pricing");
    const d = createDesign("pricing");
    delete d.pricingTable;
    const before = JSON.stringify(d);
    const table = getPricingTable(d);
    expect(table.sections).toHaveLength(2);
    const all = JSON.stringify(table);
    for (const p of d.prices) {
      for (const key of [
        "name",
        "single",
        "packagePrice",
        "sessions",
        "offer",
        "validity",
        "note",
      ] as const)
        expect(all).toContain(p[key]);
    }
    expect(table.showCurrency).toBe(false);
    expect(
      table.sections.some((s) => s.columns[0].label.includes("私教")),
    ).toBe(false);
    expect(JSON.stringify(d)).toBe(before);
    expect(getPricingTable(d)).toEqual(table);
  });

  it("隐藏列与分区的值经过保存恢复后仍然存在", () => {
    const d = createDesign("pricing"),
      table = d.pricingTable!;
    expect(table).toBeDefined();
    const section = table.sections[0],
      column = section.columns[1];
    const original = section.rows[0].cells[column.id];
    column.enabled = false;
    section.enabled = false;
    const restored = parseState(
      JSON.stringify({
        version: 1,
        projects: [d],
        activeId: d.id,
        previous: {},
      }),
    );
    const saved = restored.projects[0].pricingTable!.sections[0];
    expect(saved.columns[1].enabled).toBe(false);
    expect(saved.rows[0].cells[column.id]).toBe(original);
    expect(saved.enabled).toBe(false);
  });

  it("复制分区行列与说明有独立 ID，单元格映射不丢失", () => {
    const d = createDesign("pricing"),
      copy = duplicateDesign(d);
    expect(d.pricingTable).toBeDefined();
    const a = d.pricingTable!,
      b = copy.pricingTable!;
    expect(b.sections[0].id).not.toBe(a.sections[0].id);
    expect(b.sections[0].columns[0].id).not.toBe(a.sections[0].columns[0].id);
    expect(b.sections[0].rows[0].id).not.toBe(a.sections[0].rows[0].id);
    expect(b.sections[0].rows[0].cells[b.sections[0].columns[0].id]).toBe(
      "体验课",
    );
    expect(b.remarks[0].id).not.toBe(a.remarks[0].id);
    b.sections[0].rows[0].cells[b.sections[0].columns[0].id] = "独立修改";
    expect(a.sections[0].rows[0].cells[a.sections[0].columns[0].id]).toBe(
      "体验课",
    );
  });

  it("重复 ID、无效列宽、未归属的单元格以及错误开关不能进入存储", () => {
    const d = createDesign("pricing");
    expect(d.pricingTable).toBeDefined();
    for (const mutate of [
      (s: any) => {
        s.columns[1].id = s.columns[0].id;
      },
      (s: any) => {
        s.columns[0].weight = 0;
      },
      (s: any) => {
        s.rows[0].cells.unknown = "bad";
      },
      (s: any) => {
        s.enabled = "false";
      },
    ]) {
      const broken = structuredClone(d);
      mutate(broken.pricingTable!.sections[0]);
      expect(isDesign(broken)).toBe(false);
    }
  });

  it("缺少某个单元格是损坏备份，显式空白单元格仍有效", () => {
    const d = createDesign("pricing"),
      section = d.pricingTable!.sections[0];
    const key = section.columns[1].id;
    section.rows[0].cells[key] = "";
    expect(isDesign(d)).toBe(true);
    delete section.rows[0].cells[key];
    expect(isDesign(d)).toBe(false);
  });

  it("旧项目的空类别不会与显式课程类别合并，复制的兼容ID独立", async () => {
    const { getPricingTable } = await import("./pricing");
    const d = createDesign("pricing");
    delete d.pricingTable;
    d.prices = d.prices.slice(0, 2);
    d.prices[0].category = "";
    d.prices[1].category = "课程";
    const table = getPricingTable(d);
    expect(table.sections).toHaveLength(2);
    expect(table.sections[0].columns[0].label).toBe("");
    expect(table.sections[1].columns[0].label).toBe("课程");
    const copy = getPricingTable(duplicateDesign(d));
    expect(copy.sections[0].id).not.toBe(table.sections[0].id);
    expect(copy.sections[0].rows[0].id).not.toBe(table.sections[0].rows[0].id);
  });
});
