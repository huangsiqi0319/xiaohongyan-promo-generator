import type { Page } from "@playwright/test";

export async function pricingAction(
  page: Page,
  label: string,
  action: "上移" | "下移" | "删除",
) {
  await page
    .getByRole("button", { name: `${label}更多操作`, exact: true })
    .click();
  await page
    .getByRole("button", { name: `${action}${label}`, exact: true })
    .click();
}
export async function pricingRowDetails(page: Page, section = 1, row = 1) {
  await page
    .getByRole("button", {
      name: `分区 ${section} 项目 ${row}更多操作`,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "编辑赠品与备注", exact: true })
    .click();
}
export async function pricingSectionOptions(page: Page, index = 1) {
  const section = page.locator(".pricing-section").nth(index - 1);
  if ((await section.getAttribute("open")) === null)
    await section.locator(":scope > summary").click();
  const options = section.locator(".pricing-section-options");
  if ((await options.getAttribute("open")) === null)
    await options.locator(":scope > summary").click();
}
