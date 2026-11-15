import { expect, it } from "vitest";
import { makeResumeURL, resumeFile } from "./resume-link";

it("中文项目可以通过URL片段转移，草稿不出现在查询参数中", async () => {
  const raw = JSON.stringify({
    title: "中国古典舞（柔美悲情）",
    courses: ["19:30–21:00"],
    image: "data:image/png;base64,example",
  });
  const url = new URL(
    await makeResumeURL(new Blob([raw]), "https://example.com/tool/?v=1"),
  );
  expect(url.hash.startsWith("#xh-resume=")).toBe(true);
  expect(url.search).not.toContain("中国");
  expect(await (await resumeFile(url.hash)).text()).toBe(raw);
});
it("错误及过长链接被拒绝，不尝试导入", async () => {
  await expect(resumeFile("#xh-resume=gzip.invalid!")).rejects.toThrow();
  await expect(
    resumeFile("#xh-resume=plain." + "a".repeat(9000)),
  ).rejects.toThrow();
});
it("本地HTML路径不能生成跨设备续编链接", async () => {
  await expect(
    makeResumeURL(new Blob(["{}"]), "file:///tmp/tool.html"),
  ).rejects.toThrow();
});
it("大素材及无法放进链接的内容明确拒绝，避免生成不可用链接", async () => {
  await expect(
    makeResumeURL(
      new Blob([new Uint8Array(5 * 1024 * 1024 + 1)]),
      "https://example.com/",
    ),
  ).rejects.toThrow();
  const noise = crypto.getRandomValues(new Uint8Array(10000));
  await expect(
    makeResumeURL(new Blob([noise]), "https://example.com/"),
  ).rejects.toThrow();
});
it("小压缩包解压超过5MiB时终止读取", async () => {
  const stream = new Blob([new Uint8Array(5 * 1024 * 1024 + 1)])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  const data = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  await expect(resumeFile("#xh-resume=gzip." + data)).rejects.toThrow("过大");
});
