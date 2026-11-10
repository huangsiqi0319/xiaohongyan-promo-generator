import type { Asset, MaterialState } from "../types";
import { listAssets } from "./assets";
import { parseState } from "./storage";
import { BRAND_BACKGROUNDS } from "./brand";

function toDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("无法读取备份素材。"));
    r.readAsDataURL(blob);
  });
}
export async function makeBackup(state: MaterialState): Promise<Blob> {
  const assets = await listAssets();
  const serialized = await Promise.all(
    assets.map(async ({ blob, ...metadata }) => ({
      ...metadata,
      data: await toDataURL(blob),
    })),
  );
  return new Blob(
    [
      JSON.stringify({
        format: "xiaohongyan-backup-v1",
        state,
        assets: serialized,
      }),
    ],
    { type: "application/json" },
  );
}

export async function readBackup(
  file: File,
): Promise<{ state: MaterialState; assets: Asset[] }> {
  // Do not impose an import-only size cap: every backup we export must be accepted again.
  // Browser memory still bounds JSON serialization on both paths.
  const raw = JSON.parse(await file.text());
  if (raw.format !== "xiaohongyan-backup-v1" || !Array.isArray(raw.assets))
    throw new Error("请选择小鸿雁生成器导出的 JSON 备份。");
  const state = parseState(JSON.stringify(raw.state));
  const assets: Asset[] = [];
  for (const a of raw.assets) {
    if (
      typeof a.id !== "string" ||
      typeof a.name !== "string" ||
      !["background", "logo", "photo", "qr"].includes(a.kind) ||
      typeof a.noPeople !== "boolean" ||
      typeof a.createdAt !== "number" ||
      typeof a.data !== "string" ||
      !/^data:image\/(png|jpeg|webp);base64,/.test(a.data)
    )
      throw new Error("备份含有无效素材，未导入项目。");
    const response = await fetch(a.data),
      blob = await response.blob();
    if (blob.size > 20 * 1024 * 1024)
      throw new Error("备份中单张素材超过 20 MB，请检查文件。");
    const bitmap = await createImageBitmap(blob);
    const pixels = bitmap.width * bitmap.height;
    bitmap.close();
    if (pixels > 60_000_000) throw new Error("备份中素材像素超过支持范围。");
    assets.push({
      id: a.id,
      name: a.name,
      kind: a.kind,
      noPeople: a.noPeople,
      createdAt: a.createdAt,
      blob,
    });
  }
  const available = new Set([...BRAND_BACKGROUNDS, ...assets].map((a) => a.id));
  if (
    state.projects.some((p) =>
      [p.backgroundId, p.logoId, p.photoId, p.qrId].some(
        (id) => id && !available.has(id),
      ),
    )
  )
    throw new Error("备份缺少引用的图片素材，未导入项目。");
  return { state, assets };
}
