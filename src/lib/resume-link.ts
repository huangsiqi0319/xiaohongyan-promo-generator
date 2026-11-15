const PREFIX = "#xh-resume=";
const MAX_LINK = 8000;
const MAX_BYTES = 5 * 1024 * 1024;

async function bytesFrom(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = stream.getReader(),
    parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new Error("续编内容过大，请使用项目文件转移。");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const p of parts) {
    result.set(p, offset);
    offset += p.length;
  }
  return result;
}

export async function makeResumeURL(
  backup: Blob,
  base: string,
): Promise<string> {
  const url = new URL(base);
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("请在在线网站生成续编链接，或使用项目文件。");
  // Force a fresh document when moving from an older open Safari tab.
  url.searchParams.set("v", "20261115");
  if (backup.size > MAX_BYTES)
    throw new Error("上传素材较大，请使用项目文件转移，图片不会被丢弃。");
  const compressed = typeof CompressionStream !== "undefined";
  const bytes = compressed
    ? await bytesFrom(
        backup.stream().pipeThrough(new CompressionStream("gzip")),
      )
    : new Uint8Array(await backup.arrayBuffer());
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const data = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  url.hash = `${PREFIX.slice(1)}${compressed ? "gzip" : "plain"}.${data}`;
  if (url.href.length > MAX_LINK)
    throw new Error(
      "上传素材较大，续编链接放不下。请使用下方项目文件转移，图片不会被丢弃。",
    );
  return url.href;
}

export async function resumeFile(hash: string): Promise<File> {
  if (!hash.startsWith(PREFIX) || hash.length > MAX_LINK)
    throw new Error("续编链接无效或过长。");
  const match = /^(gzip|plain)\.([A-Za-z0-9_-]+)$/.exec(
    hash.slice(PREFIX.length),
  );
  if (!match) throw new Error("续编链接不完整，请重新复制整个链接。");
  try {
    const raw = atob(match[2].replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    if (match[1] === "plain")
      return new File([bytes], "续编项目.json", { type: "application/json" });
    if (typeof DecompressionStream === "undefined")
      throw new Error("浏览器版本过旧，请用项目文件转移。");
    const decoded = await bytesFrom(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
    );
    return new File([decoded as BlobPart], "续编项目.json", {
      type: "application/json",
    });
  } catch (e) {
    throw new Error(
      e instanceof Error
        ? `无法读取续编链接：${e.message}`
        : "无法读取续编链接。",
    );
  }
}

export const hasResumeLink = (hash: string) => hash.startsWith(PREFIX);
