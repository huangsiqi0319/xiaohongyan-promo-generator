import { expect, test } from "@playwright/test";

test("六张内置原图可直接切换、刷新保留并生成不同的 PNG", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "品牌素材", exact: true }).click();
  await expect(page.locator(".background-thumb img")).toHaveCount(6);
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
    await expect(
      page.getByRole("button", { name: "导出高清 PNG" }),
    ).toBeEnabled();
    images.add(
      await page
        .locator("canvas")
        .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
    );
  }
  expect(images.size).toBe(6);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "导出高清 PNG" }),
  ).toBeEnabled();
  const id = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("xiaohongyan-studio:v1")!);
    return s.projects.find((p: { id: string }) => p.id === s.activeId)
      .backgroundId;
  });
  expect(id).toBe("brand-lake-06");
});

test("编辑、自动保存、多项目和恢复前次", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("物料标题", { exact: true }).fill("秋日身韵课程表");
  await expect(page.getByText("所有更改已保存")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("物料标题", { exact: true })).toHaveValue(
    "秋日身韵课程表",
  );
  await page.getByRole("button", { name: "复制当前设计" }).click();
  await expect(page.getByLabel("项目名称", { exact: true })).toHaveValue(
    /副本/,
  );
  await page.getByLabel("物料标题", { exact: true }).fill("副本标题");
  await page.getByRole("button", { name: "恢复前次编辑" }).click();
  await expect(page.getByLabel("物料标题", { exact: true })).toHaveValue(
    "秋日身韵课程表",
  );
  await page.getByRole("button", { name: "课程价目表", exact: true }).click();
  await expect(page.getByLabel("课程 1 名称")).toHaveValue("中国古典舞");
  await page.getByLabel("项目名称", { exact: true }).fill("正式价目项目");
  await page.reload();
  await expect(page.getByLabel("项目名称", { exact: true })).toHaveValue(
    "正式价目项目",
  );
});

test("真实 PNG 与高清预览逐字节一致，三个尺寸正确", async ({ page }) => {
  await page.goto("/");
  for (const height of [1440, 1920, 1080]) {
    await page.getByLabel("导出尺寸").selectOption(String(height));
    await expect(
      page.getByRole("button", { name: "导出高清 PNG" }),
    ).toBeEnabled();
    const data = await page
      .locator("canvas")
      .evaluate((c: HTMLCanvasElement) => c.toDataURL("image/png"));
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "导出高清 PNG" }).click(),
    ]);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const png = Buffer.concat(chunks);
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(height);
    expect(png.equals(Buffer.from(data.split(",")[1], "base64"))).toBe(true);
  }
});

test("课程增删、自动排序与过量内容保护", async ({ page }) => {
  await page.goto("/");
  const before = await page.getByRole("button", { name: /删除课程 / }).count();
  await page.getByRole("button", { name: "添加课程", exact: true }).click();
  await expect(page.getByRole("button", { name: /删除课程 / })).toHaveCount(
    before + 1,
  );
  await page.getByLabel(`课程 ${before + 1} 名称`).fill("测试新增课程");
  await page
    .getByRole("button", { name: `删除课程 ${before + 1}`, exact: true })
    .click();
  await expect(page.getByRole("button", { name: /删除课程 / })).toHaveCount(
    before,
  );
  await page
    .getByLabel("物料标题", { exact: true })
    .fill("这是一个非常长的标题".repeat(50));
  await expect(
    page.getByText("内容超出安全区域", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "导出高清 PNG" }),
  ).toBeDisabled();
});

test("手机布局可编辑且页面没有横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("物料标题", { exact: true }).fill("手机编辑测试");
  await expect(page.getByLabel("物料标题", { exact: true })).toHaveValue(
    "手机编辑测试",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator("canvas")).toHaveAttribute("data-ready", "true");
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});

test("手机预览可放大且不会使整个页面横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveAttribute("data-ready", "true");
  const before = (await page.locator("canvas").boundingBox())!.width;
  await page.getByRole("button", { name: "放大预览", exact: true }).click();
  const after = (await page.locator("canvas").boundingBox())!.width;
  expect(after).toBeGreaterThan(before);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

async function sampleImage(page: import("@playwright/test").Page) {
  const data = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#a4b6c4";
    c.fillRect(0, 0, 320, 240);
    return canvas.toDataURL("image/png");
  });
  return Buffer.from(data.split(",")[1], "base64");
}

test("六张原图批量上传、像素保留、刷新恢复与完整备份迁移", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  const buffer = await sampleImage(page);
  await page.getByRole("button", { name: "品牌素材", exact: true }).click();
  await page.getByLabel("确认背景不包含人物").check();
  await page.getByLabel("上传背景原图").setInputFiles(
    Array.from({ length: 6 }, (_, i) => ({
      name: `原图${i + 1}.png`,
      mimeType: "image/png",
      buffer,
    })),
  );
  await expect(
    page.getByText("已保存 6 张原图，刷新后仍可使用。"),
  ).toBeVisible();
  await page.getByRole("button", { name: "编辑物料", exact: true }).click();
  await page.getByRole("button", { name: "版式与风格" }).click();
  await page.getByLabel("雾白遮罩", { exact: true }).fill("0");
  await expect(
    page.getByRole("button", { name: "导出高清 PNG" }),
  ).toBeEnabled();
  await page.reload();
  await expect(page.locator("canvas")).toHaveAttribute("data-ready", "true");
  expect(
    await page
      .locator("canvas")
      .evaluate((canvas: HTMLCanvasElement) => [
        ...canvas.getContext("2d")!.getImageData(10, 10, 1, 1).data,
      ]),
  ).toEqual([164, 182, 196, 255]);
  await page.getByRole("button", { name: "品牌素材", exact: true }).click();
  await expect(page.locator(".background-thumb img")).toHaveCount(12);
  await page.getByRole("button", { name: "我的设计", exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "下载全部设计与素材" }).click(),
  ]);
  const path = await download.path();
  const ctx = await browser.newContext();
  const clean = await ctx.newPage();
  await clean.goto("/");
  await clean.getByRole("button", { name: "我的设计", exact: true }).click();
  await clean.getByLabel("导入设计备份").setInputFiles(path!);
  await expect(
    clean.getByText("已导入 1 个设计，保留了原有项目。"),
  ).toBeVisible();
  await expect(clean.locator(".project-card")).toHaveCount(2);
  await clean.getByRole("button", { name: "品牌素材", exact: true }).click();
  await expect(clean.locator(".background-thumb img")).toHaveCount(12);
  await expect(clean.locator("canvas")).toHaveAttribute("data-ready", "true");
  expect(
    await clean
      .locator("canvas")
      .evaluate((canvas: HTMLCanvasElement) => [
        ...canvas.getContext("2d")!.getImageData(10, 10, 1, 1).data,
      ]),
  ).toEqual([164, 182, 196, 255]);
  await ctx.close();
});

test("价目项目排序、添加删除，三项演示可导出方形", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "课程价目表", exact: true }).click();
  await page.getByRole("button", { name: "下移价格 1" }).click();
  const first = page.getByLabel("课程 1 名称");
  await page.locator(".edit-item").first().locator("summary").click();
  await expect(first).toHaveValue("民族民间舞");
  await page.getByRole("button", { name: "添加价格项目", exact: true }).click();
  await expect(page.getByRole("button", { name: /删除价格 / })).toHaveCount(4);
  await page.getByRole("button", { name: "删除价格 4", exact: true }).click();
  await page.getByLabel("导出尺寸").selectOption("1080");
  await expect(
    page.getByRole("button", { name: "导出高清 PNG" }),
  ).toBeEnabled();
});

test("活动基础内容、可选人物照片与二维码，仅限活动模板显示", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "活动海报", exact: true }).click();
  await page
    .getByLabel("物料标题", { exact: true })
    .fill("古典舞身韵 Workshop");
  await page.getByLabel("活动地点", { exact: true }).fill("小鸿雁艺术空间");
  await expect(
    page.getByRole("button", { name: "导出高清 PNG" }),
  ).toBeEnabled();
  const buffer = await sampleImage(page);
  await page.getByRole("button", { name: "品牌素材", exact: true }).click();
  for (const label of ["活动人物照片", "报名二维码"]) {
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: `上传${label}`, exact: true }).click(),
    ]);
    await chooser.setFiles({
      name: `${label}.png`,
      mimeType: "image/png",
      buffer,
    });
    await expect(
      page.getByRole("button", { name: `移除${label}` }),
    ).toBeVisible();
  }
  await page.getByLabel("导出尺寸").selectOption("1920");
  await expect(
    page.getByRole("button", { name: "导出高清 PNG" }),
  ).toBeEnabled();
  await page.reload();
  await page.getByRole("button", { name: "品牌素材", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "移除活动人物照片" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "编辑物料", exact: true }).click();
  await page.getByRole("button", { name: "每周课程表", exact: true }).click();
  await page.getByRole("button", { name: "品牌素材", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "上传活动人物照片" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "上传报名二维码" }),
  ).toHaveCount(0);
});

test("损坏的本地数据保留原文，编辑不会悄悄覆盖", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("xiaohongyan-studio:v1", "{broken"),
  );
  await page.goto("/");
  await expect(page.getByText("保存异常", { exact: true })).toBeVisible();
  await page.getByLabel("物料标题", { exact: true }).fill("新的内容");
  expect(
    await page.evaluate(() => localStorage.getItem("xiaohongyan-studio:v1")),
  ).toBe("{broken");
  await page.getByRole("button", { name: "恢复保存", exact: true }).click();
  await expect(page.getByText("所有更改已保存")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("xiaohongyan-studio:v1")!).projects[0]
          .title,
    ),
  ).toBe("新的内容");
});

test("删除最后一个设计后仍可继续编辑", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "我的设计", exact: true }).click();
  await page.getByRole("button", { name: /删除设计 / }).click();
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page.getByRole("button", { name: "编辑物料", exact: true }).click();
  await expect(page.getByLabel("物料标题", { exact: true })).toBeEditable();
});

test("长价格类别不会侵入金额列", async ({ page }) => {
  // Observe real text draws without replacing Canvas behavior.
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    (
      window as unknown as {
        categoryDraws: { x: number; right: number; text: string }[];
      }
    ).categoryDraws = [];
    CanvasRenderingContext2D.prototype.fillText = function (
      value,
      x,
      y,
      maxWidth,
    ) {
      if (String(value).includes("成人中国古典舞"))
        (
          window as unknown as {
            categoryDraws: { x: number; right: number; text: string }[];
          }
        ).categoryDraws.push({
          x,
          right: x + this.measureText(value).width,
          text: value,
        });
      if (maxWidth === undefined) original.call(this, value, x, y);
      else original.call(this, value, x, y, maxWidth);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "课程价目表", exact: true }).click();
  await page
    .getByLabel("价格 1 类别")
    .fill("成人中国古典舞基础训练与身韵专项常规课程");
  await expect(
    page.getByRole("button", { name: "导出高清 PNG" }),
  ).toBeEnabled();
  const draws = await page.evaluate(
    () =>
      (window as unknown as { categoryDraws: { right: number }[] })
        .categoryDraws,
  );
  expect(draws.length).toBeGreaterThan(0);
  expect(draws.every((draw) => draw.right < 500)).toBe(true);
});

test("上传中切换项目，原图仍绑定发起上传的设计", async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.createImageBitmap.bind(window);
    window.createImageBitmap = ((
      ...args: Parameters<typeof createImageBitmap>
    ) =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          original(...args).then(resolve, reject);
        }, 900);
      })) as typeof createImageBitmap;
  });
  await page.goto("/");
  const buffer = await sampleImage(page);
  await page.getByRole("button", { name: "品牌素材", exact: true }).click();
  await page.getByLabel("确认背景不包含人物").check();
  await page
    .getByLabel("上传背景原图")
    .setInputFiles({ name: "异步上传.png", mimeType: "image/png", buffer });
  await page.getByRole("button", { name: "编辑物料", exact: true }).click();
  await page.getByRole("button", { name: "课程价目表", exact: true }).click();
  await expect(
    page.getByText("已保存 1 张原图，刷新后仍可使用。"),
  ).toBeVisible();
  const projects = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("xiaohongyan-studio:v1")!).projects as {
        kind: string;
        backgroundId: string | null;
      }[],
  );
  expect(
    projects.find((p) => p.kind === "schedule")!.backgroundId,
  ).toBeTruthy();
  expect(projects.find((p) => p.kind === "pricing")!.backgroundId).toBe(
    "brand-lake-06",
  );
  expect(projects.find((p) => p.kind === "schedule")!.backgroundId).not.toBe(
    "brand-lake-06",
  );
});
