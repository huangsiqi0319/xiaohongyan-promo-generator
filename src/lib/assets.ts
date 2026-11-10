import type { Asset, AssetKind } from "../types";
import { uid } from "./model";

const DB_NAME = "xiaohongyan-assets";
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("assets", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("无法打开素材库。请检查浏览器是否允许本地存储。"));
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  operation: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("assets", mode);
    const request = operation(tx.objectStore("assets"));
    tx.oncomplete = () => {
      resolve(request.result);
      db.close();
    };
    tx.onerror = tx.onabort = () => {
      reject(new Error("素材保存失败，可能是浏览器存储空间不足。"));
      db.close();
    };
    request.onerror = () => {
      reject(request.error);
      db.close();
    };
  });
}

export const listAssets = () =>
  transact<Asset[]>("readonly", (s) => s.getAll());
export const putAsset = (asset: Asset) =>
  transact("readwrite", (s) => s.put(asset));
export const deleteAsset = (id: string) =>
  transact("readwrite", (s) => s.delete(id));

export async function importAsset(
  file: File,
  kind: AssetKind,
  noPeople: boolean,
): Promise<Asset> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("请选择 PNG、JPG 或 WebP 图片。");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("单张图片请控制在 20 MB 以内。");
  const image = await createImageBitmap(file);
  if (image.width * image.height > 60_000_000) {
    image.close();
    throw new Error("图片像素过大，请使用不超过 6000 万像素的图片。");
  }
  image.close();
  const asset: Asset = {
    id: uid(),
    name: file.name,
    blob: file,
    kind,
    noPeople,
    createdAt: Date.now(),
  };
  await putAsset(asset);
  return asset;
}
