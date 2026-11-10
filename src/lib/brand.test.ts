import { expect, it } from "vitest";
import { BRAND_BACKGROUNDS, DEFAULT_BACKGROUND_ID } from "./brand";
import { createDesign } from "./model";

it("六张原图内置且新项目默认使用羽毛湖面，不依赖用户再次上传", () => {
  expect(BRAND_BACKGROUNDS).toHaveLength(6);
  expect(new Set(BRAND_BACKGROUNDS.map((a) => a.id)).size).toBe(6);
  expect(
    BRAND_BACKGROUNDS.every(
      (a) => a.noPeople && a.url.startsWith("data:image/jpeg;base64,"),
    ),
  ).toBe(true);
  expect(createDesign("schedule").backgroundId).toBe(DEFAULT_BACKGROUND_ID);
  expect(createDesign("pricing").backgroundId).toBe(DEFAULT_BACKGROUND_ID);
  expect(createDesign("schedule").mist).toBeLessThan(30);
});
