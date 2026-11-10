import { useEffect, useRef, useState } from "react";
import type { Asset, AssetView } from "../types";
import { deleteAsset, listAssets, putAsset } from "../lib/assets";
import { BRAND_BACKGROUNDS } from "../lib/brand";

export function useAssets() {
  const [assets, setAssets] = useState<AssetView[]>(BRAND_BACKGROUNDS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const urls = useRef(new Set<string>());
  function view(a: Asset): AssetView {
    const url = URL.createObjectURL(a.blob);
    urls.current.add(url);
    const { blob: _blob, ...rest } = a;
    return { ...rest, url };
  }
  useEffect(() => {
    let live = true;
    listAssets()
      .then((items) => {
        if (live) setAssets([...BRAND_BACKGROUNDS, ...items.map(view)]);
      })
      .catch((e) => {
        if (live) setError(String(e.message));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    const owned = urls.current;
    return () => {
      live = false;
      owned.forEach((url) => URL.revokeObjectURL(url));
      owned.clear();
    };
  }, []);
  function add(asset: Asset) {
    setAssets((prev) => [...prev, view(asset)]);
  }
  async function remove(id: string) {
    await deleteAsset(id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }
  async function importMany(items: Asset[]) {
    for (const a of items) await putAsset(a);
    const records = await listAssets();
    setAssets([...BRAND_BACKGROUNDS, ...records.map(view)]);
  }
  return { assets, loading, error, add, remove, importMany };
}
