import { expect, test } from "@playwright/test";

test("手机导出先显示可保存高清图片，不假报完成下载", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let downloads = 0;
  page.on("download", () => downloads++);
  await page.goto("/");
  await page.getByLabel("物料标题", { exact: true }).fill("手机保存测试");
  await expect(
    page.getByText("已自动保存到此浏览器", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "导出高清 PNG" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "导出高清 PNG" }).click();
  await expect(
    page.getByRole("dialog", { name: "保存高清图片" }),
  ).toBeVisible();
  const image = page.getByRole("img", { name: "可长按保存的高清物料" });
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(1080);
  expect(
    await image.evaluate((img: HTMLImageElement) => img.naturalHeight),
  ).toBe(1440);
  expect(downloads).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-image-save.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "关闭窗口", exact: true }).click();
  await expect(page.getByLabel("物料标题", { exact: true })).toHaveValue(
    "手机保存测试",
  );
});

test("手机系统分享使用已生成的PNG；取消和失败都保留图片", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const state = window as unknown as { shared: string[]; shareMode: string };
    state.shared = [];
    state.shareMode = "cancel";
    Object.defineProperty(navigator, "canShare", {
      value: () => true,
      configurable: true,
    });
    Object.defineProperty(navigator, "share", {
      value: async (data: ShareData) => {
        state.shared = data.files!.map((f) => f.type);
        if (state.shareMode === "cancel")
          throw new DOMException("cancelled", "AbortError");
        if (state.shareMode === "fail") throw new Error("blocked");
      },
      configurable: true,
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "导出高清 PNG" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "导出高清 PNG" }).click();
  await page
    .getByRole("button", { name: "保存／分享图片", exact: true })
    .click();
  await expect(
    page.getByText("已取消分享，图片仍在这里，可以长按保存。"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { shared: string[] }).shared,
    ),
  ).toEqual(["image/png"]);
  await page.evaluate(
    () => ((window as unknown as { shareMode: string }).shareMode = "fail"),
  );
  await page
    .getByRole("button", { name: "保存／分享图片", exact: true })
    .click();
  await expect(
    page.getByText(
      "此浏览器暂时无法分享文件，请长按下方图片保存，或打开原图后保存。",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "可长按保存的高清物料" }),
  ).toBeVisible();
});

test("续编链接可在全新浏览器恢复当前项目和上传图片，保留已有设计", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.getByLabel("物料标题", { exact: true }).fill("跨浏览器保留的课程");
  await page.getByRole("button", { name: "品牌素材", exact: true }).click();
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "上传机构 Logo", exact: true }).click(),
  ]);
  const raw = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#61918d";
    ctx.fillRect(0, 0, 32, 32);
    return c.toDataURL();
  });
  await chooser.setFiles({
    name: "机构标识.png",
    mimeType: "image/png",
    buffer: Buffer.from(raw.split(",")[1], "base64"),
  });
  await expect(
    page.getByRole("button", { name: "移除机构 Logo" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "跨浏览器继续", exact: true }).click();
  const field = page.getByLabel("续编链接", { exact: true });
  await expect(field).toBeVisible();
  const url = await field.inputValue();
  expect(url).toContain("#xh-resume=");
  const context = await browser.newContext();
  const other = await context.newPage();
  await other.goto(url);
  await expect(
    other.getByRole("dialog", { name: "恢复续编设计" }),
  ).toBeVisible();
  await other
    .getByRole("button", { name: "打开这份设计", exact: true })
    .click();
  await expect(other.getByLabel("物料标题", { exact: true })).toHaveValue(
    "跨浏览器保留的课程",
  );
  await expect(
    other.getByRole("button", { name: "导出高清 PNG" }),
  ).toBeEnabled();
  expect(other.url()).not.toContain("#xh-resume=");
  await other.getByRole("button", { name: "品牌素材", exact: true }).click();
  await expect(
    other.getByRole("button", { name: "移除机构 Logo" }),
  ).toBeVisible();
  await other.getByRole("button", { name: "我的设计", exact: true }).click();
  await expect(other.locator(".project-card")).toHaveCount(2);
  await other.reload();
  await expect(other.getByLabel("物料标题", { exact: true })).toHaveValue(
    "跨浏览器保留的课程",
  );
  await context.close();
});

test("手机保存失败时明确显示未保存，不显示成功状态", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page.goto("/");
  await page.getByLabel("物料标题", { exact: true }).fill("未保存的当前草稿");
  await expect(page.getByText("未保存，请查看下方提示")).toBeVisible();
  await page.getByRole("button", { name: "跨浏览器继续", exact: true }).click();
  await expect(page.getByLabel("续编链接", { exact: true })).toBeVisible();
});

test("接收浏览器保存失败时保留续编链接，刷新仍能恢复且不覆盖损坏数据", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.getByLabel("物料标题", { exact: true }).fill("不能丢失的续编草稿");
  await page.getByRole("button", { name: "跨浏览器继续", exact: true }).click();
  const field = page.getByLabel("续编链接", { exact: true });
  await expect(field).toBeVisible();
  const url = await field.inputValue();
  for (const mode of ["quota", "corrupt"]) {
    const context = await browser.newContext();
    await context.addInitScript((mode) => {
      if (mode === "corrupt")
        localStorage.setItem("xiaohongyan-studio:v1", "{broken");
      else
        Storage.prototype.setItem = () => {
          throw new DOMException("Full", "QuotaExceededError");
        };
    }, mode);
    const other = await context.newPage();
    await other.goto(url);
    await other
      .getByRole("button", { name: "打开这份设计", exact: true })
      .click();
    await expect(other.getByLabel("物料标题", { exact: true })).toHaveValue(
      "不能丢失的续编草稿",
    );
    expect(other.url()).toContain("#xh-resume=");
    await expect(
      other.getByText("设计已读取，但尚未保存到此浏览器。", { exact: false }),
    ).toBeVisible();
    if (mode === "corrupt")
      expect(
        await other.evaluate(() =>
          localStorage.getItem("xiaohongyan-studio:v1"),
        ),
      ).toBe("{broken");
    await other.reload();
    await expect(
      other.getByRole("dialog", { name: "恢复续编设计" }),
    ).toBeVisible();
    await context.close();
  }
});
