import { test, expect, type Page } from "@playwright/test";

async function openPricing(page: Page, width = 390) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "课程价目表", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "导出高清 PNG" }),
  ).toBeEnabled();
}
async function more(page: Page, label: string) {
  await page
    .getByRole("button", { name: `${label}更多操作`, exact: true })
    .click();
}

test("横向滑动时固定的名称及操作表头保持不透明，不与其他列叠字", async ({
  page,
}) => {
  await openPricing(page, 320);
  const region = page.getByRole("region", { name: "分区 1 价格内容" });
  await region.evaluate((e) => (e.scrollLeft = 57));
  const tableColor = await region
    .locator("table")
    .evaluate((e) => getComputedStyle(e).backgroundColor);
  for (const index of [0, 1, -1]) {
    const headers = region.locator("thead th");
    const header = index < 0 ? headers.last() : headers.nth(index);
    expect(
      await header.evaluate((e) => getComputedStyle(e).backgroundColor),
    ).toBe(tableColor);
  }
});

test("长英文表头不能撑宽固定列，手机仍能直接点进价格输入", async ({ page }) => {
  await openPricing(page, 320);
  await page
    .getByLabel("分区 1 第 1 列表头", { exact: true })
    .fill("LongUnbrokenCourseIdentificationLabelForInternationalCourses");
  const region = page.getByRole("region", { name: "分区 1 价格内容" });
  const header = region.locator("thead th").nth(1);
  expect((await header.boundingBox())!.width).toBeLessThanOrEqual(110);
  const price = page.getByLabel("分区 1 项目 1 第 2 列", { exact: true });
  await price.scrollIntoViewIfNeeded();
  await price.click();
  await expect(price).toBeFocused();
  await price.fill("2,800");
  await expect(price).toHaveValue("2,800");
});

test("关闭赠品备注后焦点回到该行，键盘可继续编辑下一项", async ({ page }) => {
  await openPricing(page, 320);
  const trigger = page.getByRole("button", {
    name: "分区 1 项目 1更多操作",
    exact: true,
  });
  for (const method of ["escape", "done", "backdrop"]) {
    await trigger.click();
    await page
      .getByRole("button", { name: "编辑赠品与备注", exact: true })
      .click();
    if (method === "escape") await page.keyboard.press("Escape");
    else if (method === "done")
      await page.getByRole("button", { name: "完成", exact: true }).click();
    else await page.mouse.click(1, 1);
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByLabel("显示分区 1 项目 2", { exact: true }),
    ).toBeFocused();
  }
});

test("手机栏目显示、名称、宽度和操作同排，五列设置高度紧凑", async ({
  page,
}) => {
  for (const width of [320, 390, 430]) {
    await openPricing(page, width);
    const controls = [
      "显示分区 1 第 1 列",
      "分区 1 第 1 列表头",
      "分区 1 第 1 列宽度",
    ];
    const boxes = await Promise.all(
      controls.map((name) =>
        page.getByLabel(name, { exact: true }).boundingBox(),
      ),
    );
    const centers = boxes.map((b) => b!.y + b!.height / 2);
    expect(Math.max(...centers) - Math.min(...centers)).toBeLessThan(5);
    const settings = await page
      .locator(".pricing-columns")
      .first()
      .boundingBox();
    expect(settings!.height).toBeLessThan(265);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("价格内容同表格编辑，容器内滚动，菜单修改不丢失单元格", async ({
  page,
}) => {
  await openPricing(page);
  const name = page.getByLabel("分区 1 项目 1 第 1 列", { exact: true });
  const price = page.getByLabel("分区 1 项目 1 第 2 列", { exact: true });
  const a = (await name.boundingBox())!,
    b = (await price.boundingBox())!;
  expect(Math.abs(a.y - b.y)).toBeLessThan(2);
  const scroller = page.getByRole("region", { name: "分区 1 价格内容" });
  expect(await scroller.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(
    true,
  );
  await scroller.evaluate((e) => (e.scrollLeft = e.scrollWidth));
  await page.getByLabel("分区 1 项目 1 第 4 列", { exact: true }).fill("5个月");
  await scroller.evaluate((e) => (e.scrollLeft = 0));
  await price.fill("2,300");
  await more(page, "分区 1 项目 1");
  await page
    .getByRole("button", { name: "下移分区 1 项目 1", exact: true })
    .click();
  await expect(
    page.getByLabel("分区 1 项目 2 第 2 列", { exact: true }),
  ).toHaveValue("2,300");
  await more(page, "分区 1 第 2 列");
  await page
    .getByRole("button", { name: "下移分区 1 第 2 列", exact: true })
    .click();
  await expect(
    page.getByLabel("分区 1 项目 2 第 3 列", { exact: true }),
  ).toHaveValue("2,300");
  await page.reload();
  await expect(
    page.getByLabel("分区 1 项目 2 第 3 列", { exact: true }),
  ).toHaveValue("2,300");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("手机快捷预览始终可见，返回保留滚动位置和编辑内容", async ({ page }) => {
  await openPricing(page);
  await page.getByLabel("分区 1 项目 1 第 2 列", { exact: true }).fill("8,800");
  await page
    .getByLabel("分区 1 第 1 列表头", { exact: true })
    .scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  const button = page.getByRole("button", { name: "查看成图", exact: true });
  const box = (await button.boundingBox())!;
  expect(box.y).toBeGreaterThan(700);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  await button.click();
  await expect(
    page.getByRole("button", { name: "返回编辑", exact: true }),
  ).toBeVisible();
  const canvas = (await page.locator("canvas").boundingBox())!;
  expect(canvas.y).toBeLessThan(200);
  expect(canvas.y + canvas.height).toBeGreaterThan(200);
  await page.getByRole("button", { name: "返回编辑", exact: true }).click();
  expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThan(
    3,
  );
  await expect(
    page.getByLabel("分区 1 项目 1 第 2 列", { exact: true }),
  ).toHaveValue("8,800");
});

test("赠品附注默认折叠，逐行备注从更多操作编辑并保存", async ({ page }) => {
  await openPricing(page);
  await expect(
    page.getByLabel("分区 1 显示赠品", { exact: true }),
  ).toBeHidden();
  await more(page, "分区 1 项目 1");
  await page
    .getByRole("button", { name: "编辑赠品与备注", exact: true })
    .click();
  await page.getByLabel("分区 1 项目 1 赠品", { exact: true }).fill("练功手册");
  await page.getByLabel("分区 1 项目 1 备注", { exact: true }).fill("新生适用");
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await more(page, "分区 1 项目 1");
  await page
    .getByRole("button", { name: "编辑赠品与备注", exact: true })
    .click();
  await expect(
    page.getByLabel("分区 1 项目 1 赠品", { exact: true }),
  ).toHaveValue("练功手册");
});
