import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

async function pricing(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "课程价目表", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-ready", "true");
}
async function ready(page: Page) {
  await expect(
    page.getByRole("button", { name: "导出高清 PNG", exact: true }),
  ).toBeEnabled();
}
async function state(page: Page) {
  return page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("xiaohongyan-studio:v1")!);
    return s.projects.find((p: { id: string }) => p.id === s.activeId);
  });
}

test("价目成图与课表使用同一字体和暖灰颜色，没有绿色表头", async ({ page }) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    const state = window as unknown as {
      pricingDraws: { value: string; font: string; color: string }[];
    };
    state.pricingDraws = [];
    CanvasRenderingContext2D.prototype.fillText = function (
      value,
      x,
      y,
      maxWidth,
    ) {
      if (value === "小 鸿 雁") state.pricingDraws = [];
      state.pricingDraws.push({
        value,
        font: this.font,
        color: String(this.fillStyle),
      });
      if (maxWidth === undefined) original.call(this, value, x, y);
      else original.call(this, value, x, y, maxWidth);
    };
  });
  await pricing(page);
  await ready(page);
  const draws = await page.evaluate(
    () =>
      (
        window as unknown as {
          pricingDraws: { value: string; font: string; color: string }[];
        }
      ).pricingDraws,
  );
  expect(draws.length).toBeGreaterThan(20);
  expect(draws.every((d) => ["#514b48", "#777571"].includes(d.color))).toBe(
    true,
  );
  expect(draws.find((d) => d.value === "常规课")?.font).toContain(
    "Noto Sans SC",
  );
  expect(draws.find((d) => d.value === "少儿舞蹈课程价目表")?.font).toContain(
    "Noto Serif SC",
  );
  expect(draws.find((d) => d.value === "少儿舞蹈课程价目表")?.font).toContain(
    "76px",
  );
});

test("价目表可编辑列与单元格，隐藏后恢复且刷新保留", async ({ page }) => {
  await pricing(page);
  await expect(
    page.getByLabel("分区 1 第 1 列表头", { exact: true }),
  ).toHaveValue("常规课");
  await page.getByLabel("分区 1 第 2 列表头", { exact: true }).fill("课程费用");
  await page.getByLabel("分区 1 项目 1 第 2 列", { exact: true }).fill("2,000");
  await page.getByLabel("显示分区 1 项目 1", { exact: true }).uncheck();
  await expect(page.locator(".preview-panel .sr-only")).not.toContainText(
    "2,000",
  );
  await page.getByLabel("显示分区 1 项目 1", { exact: true }).check();
  await ready(page);
  const before = await page
    .locator("canvas")
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.getByLabel("显示分区 1 第 2 列", { exact: true }).uncheck();
  await ready(page);
  const hidden = await page
    .locator("canvas")
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  expect(hidden).not.toBe(before);
  await expect(page.locator(".preview-panel .sr-only")).not.toContainText(
    "2,000",
  );
  await page.getByLabel("显示分区 1 第 2 列", { exact: true }).check();
  await page.reload();
  await expect(
    page.getByLabel("分区 1 第 2 列表头", { exact: true }),
  ).toHaveValue("课程费用");
  await expect(
    page.getByLabel("分区 1 项目 1 第 2 列", { exact: true }),
  ).toHaveValue("2,000");
  expect((await state(page)).pricingTable.sections[0].columns[1].enabled).toBe(
    true,
  );
});

test("添加列、分区与补充说明，自由开关保留内容", async ({ page }) => {
  await pricing(page);
  await page
    .getByRole("button", { name: "分区 1 添加列", exact: true })
    .click();
  await page.getByLabel("分区 1 第 5 列表头", { exact: true }).fill("优惠说明");
  await page
    .getByLabel("分区 1 项目 1 第 5 列", { exact: true })
    .fill("新生体验");
  await page.getByLabel("分区 1 显示赠品", { exact: true }).uncheck();
  await page.getByLabel("分区 1 显示附注", { exact: true }).uncheck();
  await page.getByLabel("显示分区 2", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "添加自定义分区", exact: true })
    .click();
  await page.getByLabel("分区 4 第 1 列表头", { exact: true }).fill("服装道具");
  await page
    .getByLabel("分区 4 项目 1 第 1 列", { exact: true })
    .fill("舞蹈鞋");
  await page.getByLabel("分区 4 项目 1 第 2 列", { exact: true }).fill("1,800");
  await page.getByRole("button", { name: "添加补充说明", exact: true }).click();
  await page.getByLabel("说明 2 标题", { exact: true }).fill("体验费说明");
  await page
    .getByLabel("说明 2 内容", { exact: true })
    .fill("体验当天报名可抵扣");
  await page.getByLabel("显示说明 2", { exact: true }).uncheck();
  await page.reload();
  const saved = await state(page);
  expect(saved.pricingTable.sections).toHaveLength(4);
  expect(saved.pricingTable.sections[1].enabled).toBe(false);
  expect(saved.pricingTable.sections[0].rows[3].gift).toBe("舞蹈袜一双");
  expect(saved.pricingTable.remarks[1]).toMatchObject({
    enabled: false,
    title: "体验费说明",
    text: "体验当天报名可抵扣",
  });
  await expect(page.locator(".preview-panel .sr-only")).not.toContainText(
    "体验当天报名可抵扣",
  );
  await expect(page.locator(".preview-panel .sr-only")).toContainText("舞蹈鞋");
});

test("旧价目设计直接转换、备份迁移保持全部原价格与设置", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { createDesign } = await import("/src/lib/model.ts");
    const d = createDesign("pricing");
    delete d.pricingTable;
    d.title = "原有正式收费";
    d.note = "旧备注保留";
    d.height = 1920;
    d.prices[0].name = "原有课程";
    d.prices[0].single = "咨询价格";
    localStorage.setItem(
      "xiaohongyan-studio:v1",
      JSON.stringify({
        version: 1,
        projects: [d],
        activeId: d.id,
        previous: {},
      }),
    );
  });
  await page.reload();
  await expect(
    page.getByLabel("分区 1 项目 1 第 1 列", { exact: true }),
  ).toHaveValue("原有课程");
  await expect(
    page.getByLabel("分区 1 项目 1 第 2 列", { exact: true }),
  ).toHaveValue("咨询价格");
  await page.getByLabel("分区 1 第 2 列表头", { exact: true }).fill("单次费用");
  await page.getByLabel("显示分区 2", { exact: true }).uncheck();
  await page.getByRole("button", { name: "我的设计", exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "下载全部设计与素材" }).click(),
  ]);
  const path = await download.path();
  const ctx = await browser.newContext(),
    other = await ctx.newPage();
  await other.goto("/");
  await other.getByRole("button", { name: "我的设计", exact: true }).click();
  await other.getByLabel("导入设计备份").setInputFiles(path!);
  await expect(
    other.getByText("已导入 1 个设计，保留了原有项目。"),
  ).toBeVisible();
  await other.getByRole("button", { name: "编辑物料", exact: true }).click();
  await expect(
    other.getByLabel("分区 1 第 2 列表头", { exact: true }),
  ).toHaveValue("单次费用");
  await expect(
    other.getByLabel("分区 1 项目 1 第 2 列", { exact: true }),
  ).toHaveValue("咨询价格");
  await expect(other.getByLabel("底部备注", { exact: true })).toHaveValue(
    "旧备注保留",
  );
  expect((await state(other)).pricingTable.sections[1].enabled).toBe(false);
  await ctx.close();
});

test("手机价目编辑无横向溢出，关闭全部分区也可生成图片", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await pricing(page);
  await page
    .getByRole("button", { name: "分区 1 添加列", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (let i = 1; i <= 3; i++)
    await page.getByLabel(`显示分区 ${i}`, { exact: true }).uncheck();
  await page.getByLabel("显示说明 1", { exact: true }).uncheck();
  await ready(page);
  await page.getByRole("button", { name: "导出高清 PNG", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "保存高清图片" }),
  ).toBeVisible();
  await expect(page.getByAltText("可长按保存的高清物料")).toBeVisible();
});

test("新价目保留六图选择、遮罩与裁切，实际样张及三尺寸PNG与画布一致", async ({
  page,
}) => {
  await pricing(page);
  await expect(page.getByLabel("导出尺寸")).toHaveValue("1920");
  await ready(page);
  await mkdir("artifacts", { recursive: true });
  const sample = await page
    .locator("canvas")
    .evaluate((c: HTMLCanvasElement) => c.toDataURL("image/png"));
  await writeFile(
    "artifacts/新版价目表-原图库.png",
    Buffer.from(sample.split(",")[1], "base64"),
  );
  await page.getByRole("button", { name: "品牌素材", exact: true }).click();
  const images = new Set<string>();
  for (const name of [
    "雾湖初光",
    "水上轻羽",
    "花影远山",
    "暮色微澜",
    "粉霞流光",
    "云水羽梦",
  ]) {
    await page
      .locator(".background-thumb")
      .filter({ has: page.getByAltText(name, { exact: true }) })
      .click();
    await ready(page);
    images.add(
      await page
        .locator("canvas")
        .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
    );
  }
  expect(images.size).toBe(6);
  await page.getByRole("button", { name: "编辑物料", exact: true }).click();
  await page.getByRole("button", { name: "版式与风格", exact: true }).click();
  await page.getByLabel("雾白遮罩", { exact: true }).fill("40");
  await page.getByLabel("水平裁切位置", { exact: true }).fill("65");
  await ready(page);
  await page.reload();
  expect(await state(page)).toMatchObject({
    mist: 40,
    cropX: 65,
    backgroundId: "brand-lake-06",
  });
  // A compact regular-course design should fit all export sizes without tiny text.
  for (const i of [2, 3])
    await page.getByLabel(`显示分区 ${i}`, { exact: true }).uncheck();
  await page.getByLabel("显示说明 1", { exact: true }).uncheck();
  await page.getByLabel("分区 1 显示赠品", { exact: true }).uncheck();
  await page.getByLabel("分区 1 显示附注", { exact: true }).uncheck();
  for (const height of [1920, 1440, 1080]) {
    await page.getByLabel("导出尺寸").selectOption(String(height));
    await ready(page);
    const data = await page
      .locator("canvas")
      .evaluate((c: HTMLCanvasElement) => c.toDataURL("image/png"));
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "导出高清 PNG" }).click(),
    ]);
    const stream = await download.createReadStream(),
      chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const png = Buffer.concat(chunks);
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(height);
    expect(png.equals(Buffer.from(data.split(",")[1], "base64"))).toBe(true);
  }
});

test("长单元格及说明不截断，过量内容阻止导出且复制保留新结构", async ({
  page,
}) => {
  await pricing(page);
  await page
    .getByLabel("分区 1 项目 1 第 1 列", { exact: true })
    .fill("中国古典舞基础与身韵专项训练");
  await page
    .getByLabel("分区 1 项目 1 赠品", { exact: true })
    .fill("舞蹈袜、训练带及入门练习手册一套");
  await ready(page);
  await page.getByRole("button", { name: "复制当前设计" }).click();
  await expect(
    page.getByLabel("分区 1 项目 1 赠品", { exact: true }),
  ).toHaveValue("舞蹈袜、训练带及入门练习手册一套");
  await page
    .getByLabel("分区 1 附注内容", { exact: true })
    .fill("过长的课程有效期及补课安排说明".repeat(80));
  await expect(
    page.getByText("内容超出安全区域", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "导出高清 PNG" }),
  ).toBeDisabled();
});
