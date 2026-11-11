import { describe, it, expect } from "vitest";
import { createDesign, isDesign } from "./model";
import { planSchedule, getScheduleStyle } from "./schedule-layout";

const measure = (value: string, size: number) =>
  Array.from(value).reduce(
    (sum, c) =>
      sum + (/[\u3000-\u9fff\uff00-\uffef]/u.test(c) ? size : size * 0.55),
    0,
  );
describe("单行课表", () => {
  it("同一星期后续课程的星期栏留空，不显示圆点，其他字段仍然对齐", () => {
    const d = createDesign("schedule");
    d.courses = [
      { ...d.courses[0], id: "later", day: 3, time: "15:45" },
      { ...d.courses[0], id: "first", day: 3, time: "14:00" },
      { ...d.courses[0], id: "next-day", day: 4, time: "19:30" },
    ];
    const p = planSchedule(d, measure, 1000);
    expect(p.rows.map((r) => r.values[0])).toEqual(["周三", "", "周四"]);
    expect(p.rows[1].values[1]).toBe("15:45–20:00");
  });
  it("旧项目缺少设置时沿用自动单行，不改课程数据", () => {
    const d = createDesign("schedule");
    delete d.scheduleStyle;
    const before = structuredClone(d.courses);
    expect(getScheduleStyle(d).mode).toBe("auto");
    const p = planSchedule(d, measure, 1000);
    expect(p.rows[0].values).toHaveLength(5);
    expect(p.rows[0].values[1]).toBe("18:30–20:00");
    expect(d.courses).toEqual(before);
  });
  it("长课名含括号完整保留，统一缩小字号且每列不越界", () => {
    const d = createDesign("schedule");
    d.courses[0].name = "中国古典舞·身韵（柔美悲情）";
    d.courses[0].teacher = "都都老师";
    d.courses[0].room = "江户川桥";
    const p = planSchedule(d, measure, 1000);
    expect(p.overflow).toBe(false);
    expect(p.fontSize).toBeLessThan(28);
    expect(p.rows[0].values[2]).toBe(d.courses[0].name);
    expect(
      p.rows.every((r) =>
        r.values.every((v, i) => measure(v, p.fontSize) <= p.widths[i] - 12),
      ),
    ).toBe(true);
    expect(p.rows.every((r) => r.values.every((v) => !v.includes("\n")))).toBe(
      true,
    );
  });
  it("手动字号不被偷偷压缩；超长内容禁止导出", () => {
    const d = createDesign("schedule");
    d.scheduleStyle = {
      mode: "manual",
      fontSize: 32,
      courseWidth: 46,
      rowGap: 24,
    };
    d.courses[0].name = "非常长的中国古典舞课程".repeat(10);
    const p = planSchedule(d, measure, 1000);
    expect(p.fontSize).toBe(32);
    expect(p.overflow).toBe(true);
    expect(p.reason).toContain("单行");
  });
  it("自动模式有字号下限，过长不省略文字", () => {
    const d = createDesign("schedule");
    d.courses[0].name = "完整课名".repeat(50);
    const p = planSchedule(d, measure, 1000);
    expect(p.fontSize).toBeGreaterThanOrEqual(18);
    expect(p.overflow).toBe(true);
    expect(p.rows[0].values[2]).toBe(d.courses[0].name);
  });
  it("内容过多也不裁掉行；可调整列宽和行距", () => {
    const d = createDesign("schedule");
    const regular = planSchedule(d, measure, 1000);
    d.scheduleStyle = {
      mode: "auto",
      fontSize: 28,
      courseWidth: 52,
      rowGap: 40,
    };
    const wide = planSchedule(d, measure, 1000);
    expect(wide.widths[2]).toBeGreaterThan(regular.widths[2]);
    expect(wide.rowHeight).toBeGreaterThan(regular.rowHeight);
    expect(planSchedule(d, measure, 100).overflow).toBe(true);
  });
  it("自动字号考虑像素取整，贴近高度边界时仍能放下", () => {
    const d = createDesign("schedule");
    const p = planSchedule(d, measure, 400);
    expect(p.overflow).toBe(false);
    expect(p.height).toBeLessThanOrEqual(400);
  });
  it("空课表也预留提示文字的高度，避免和备注重叠", () => {
    const d = createDesign("schedule");
    d.courses = [];
    expect(planSchedule(d, measure, 80).overflow).toBe(true);
  });
  it("非法字号设置拒绝加载，旧版本无设置的数据仍合法", () => {
    const d = createDesign("schedule");
    expect(isDesign(d)).toBe(true);
    d.scheduleStyle = {
      mode: "manual",
      fontSize: 20,
      courseWidth: 48,
      rowGap: 30,
    };
    expect(isDesign(d)).toBe(true);
    d.scheduleStyle.fontSize = 100;
    expect(isDesign(d)).toBe(false);
    d.scheduleStyle.fontSize = 16;
    d.scheduleStyle.mode = "auto";
    expect(isDesign(d)).toBe(false);
  });
});
