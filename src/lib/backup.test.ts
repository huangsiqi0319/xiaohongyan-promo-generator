import { expect, it } from "vitest";
import { readBackup } from "./backup";
import { createDesign } from "./model";

it("可重新导入超过旧 150 MiB 门槛的有效备份，不拒绝自己导出的文件", async () => {
  const project = createDesign("schedule");
  const state = {
    version: 1,
    projects: [project],
    activeId: project.id,
    previous: {},
  };
  const raw = JSON.stringify({
    format: "xiaohongyan-backup-v1",
    state,
    assets: [],
  });
  const file = new File(
    [raw, " ".repeat(150 * 1024 * 1024)],
    "large-backup.json",
    { type: "application/json" },
  );
  expect(file.size).toBeGreaterThan(150 * 1024 * 1024);
  expect((await readBackup(file)).state).toEqual(state);
}, 15000);
