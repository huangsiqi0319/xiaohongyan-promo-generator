import { expect, test } from "@playwright/test";

test("窄屏星期和两个时间保持原有同一行，输入框留缝不重叠并可保存", async ({
  page,
}) => {
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const day = page.getByLabel("课程 1 星期", { exact: true });
    const start = page.getByLabel("课程 1 开始时间", { exact: true });
    const end = page.getByLabel("课程 1 结束时间", { exact: true });
    const dayBox = (await day.boundingBox())!,
      startBox = (await start.boundingBox())!,
      endBox = (await end.boundingBox())!;
    expect(Math.abs(startBox.y - dayBox.y)).toBeLessThan(1);
    expect(Math.abs(startBox.y - endBox.y)).toBeLessThan(1);
    expect(startBox.x + startBox.width).toBeLessThanOrEqual(endBox.x - 8);
    expect(endBox.x + endBox.width).toBeLessThanOrEqual(width - 20);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await start.fill("19:30");
    await end.fill("21:00");
    await page.reload();
    await expect(start).toHaveValue("19:30");
    await expect(end).toHaveValue("21:00");
  }
  await page.screenshot({
    path: "test-results/time-fields-mobile.png",
    fullPage: true,
  });
});
