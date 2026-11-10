import { describe, expect, it } from "vitest";
import { wrapText, fitBodyFont } from "./layout";

describe("海报排版", () => {
  const measure = (text: string) => Array.from(text).length * 10;
  it("中文按实际宽度换行，保留所有文字", () => {
    const value = "中国古典舞身韵与民族民间舞";
    const lines = wrapText(value, 50, measure);
    expect(lines.every((l) => measure(l) <= 50)).toBe(true);
    expect(lines.join("")).toBe(value);
  });
  it("保留手动换行和空行，长网址也不会越界", () => {
    expect(wrapText("甲\n\n乙", 50, measure)).toEqual(["甲", "", "乙"]);
    const url = "https://example.com/averylongworkshop";
    const lines = wrapText(url, 70, measure);
    expect(lines.join("")).toBe(url);
    expect(lines.every((l) => measure(l) <= 70)).toBe(true);
  });
  it("少量内容放大；大量内容不低于可读字号，并报告溢出", () => {
    expect(fitBodyFont(500, (f) => f * 4)).toEqual({
      fontSize: 34,
      overflow: false,
    });
    expect(fitBodyFont(100, (f) => f * 20)).toEqual({
      fontSize: 28,
      overflow: true,
    });
  });
});
