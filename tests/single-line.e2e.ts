import { expect, test } from "@playwright/test";

test("两种版式的长课名、时间、教师、教室均在同一行，字号可手调并保存", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    const state = window as unknown as {
      draws: { value: string; y: number; size: string }[];
    };
    state.draws = [];
    CanvasRenderingContext2D.prototype.fillText = function (
      value,
      x,
      y,
      maxWidth,
    ) {
      if (value === "小 鸿 雁") state.draws = [];
      state.draws.push({ value, y, size: this.font });
      if (maxWidth === undefined) original.call(this, value, x, y);
      else original.call(this, value, x, y, maxWidth);
    };
  });
  await page.goto("/");
  const name = "中国古典舞 · 身韵（柔美悲情）";
  await page.getByLabel("课程 1 名称", { exact: true }).fill(name);
  await page.getByLabel("课程 1 教师", { exact: true }).fill("都都老师");
  await page.getByLabel("课程 1 教室", { exact: true }).fill("江户川桥");
  await page.getByLabel("课程 1 开始时间", { exact: true }).fill("19:30");
  await page.getByLabel("课程 1 结束时间", { exact: true }).fill("21:00");
  await page.getByRole("button", { name: "版式与风格", exact: true }).click();
  for (const layout of [
    "雅序 清晰有序 · 信息丰富",
    "留白 轻盈舒展 · 从容表达",
  ]) {
    await page.getByRole("button", { name: layout, exact: true }).click();
    await expect(
      page.getByRole("button", { name: "导出高清 PNG" }),
    ).toBeEnabled();
    const draws = await page.evaluate(
      () =>
        (
          window as unknown as {
            draws: { value: string; y: number; size: string }[];
          }
        ).draws,
    );
    const cells = [name, "19:30–21:00", "都都老师", "江户川桥"].map((value) =>
      draws.find((d) => d.value === value),
    );
    expect(cells.every(Boolean)).toBe(true);
    expect(new Set(cells.map((c) => c!.y)).size).toBe(1);
    expect(new Set(cells.map((c) => c!.size)).size).toBe(1);
  }
  await page.getByLabel("字号模式").selectOption("manual");
  await page.getByLabel("课表字号", { exact: true }).fill("20");
  await page.getByLabel("课程栏宽度", { exact: true }).fill("48");
  await page.getByLabel("课表行间距", { exact: true }).fill("30");
  await expect(
    page.getByRole("button", { name: "导出高清 PNG" }),
  ).toBeEnabled();
  await expect(page.getByText("正文 20 px · 预览即导出效果")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "版式与风格", exact: true }).click();
  await expect(page.getByLabel("字号模式")).toHaveValue("manual");
  await expect(page.getByLabel("课表字号", { exact: true })).toHaveValue("20");
  await expect(page.getByLabel("课程栏宽度", { exact: true })).toHaveValue(
    "48",
  );
  await expect(page.getByLabel("课表行间距", { exact: true })).toHaveValue(
    "30",
  );
  await page.screenshot({
    path: "test-results/single-line-controls.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "恢复自动排版" }).click();
  await expect(page.getByLabel("字号模式")).toHaveValue("auto");
});

test("单行内容放不下时不省略、不导出；手动16px切回自动保持合法", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("课程 1 名称", { exact: true })
    .fill("极长课程名称".repeat(30));
  await expect(
    page.getByText("文字过长，无法在当前字号和栏宽内单行显示。", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "导出高清 PNG" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "版式与风格", exact: true }).click();
  await page.getByLabel("字号模式").selectOption("manual");
  await page.getByLabel("课表字号", { exact: true }).fill("16");
  await page.getByLabel("字号模式").selectOption("auto");
  await expect(page.getByLabel("课表字号", { exact: true })).toHaveValue("18");
});
