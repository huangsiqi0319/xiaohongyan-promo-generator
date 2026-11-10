import { Check, ImagePlus, LoaderCircle, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import type { Asset, AssetKind, AssetView, Design } from "../types";
import { importAsset } from "../lib/assets";
import { SectionHeading } from "./Fields";

interface Props {
  design: Design;
  assets: AssetView[];
  onChange: (patch: Partial<Design>, projectId?: string) => void;
  onAdd: (a: Asset) => void;
  notify: (text: string) => void;
}
const linkedField = {
  background: "backgroundId",
  logo: "logoId",
  photo: "photoId",
  qr: "qrId",
} as const;

export function AssetLibrary({
  design: d,
  assets,
  onChange,
  onAdd,
  notify,
}: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<AssetKind>("background");
  const input = useRef<HTMLInputElement>(null);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if (kind === "background" && !confirmed) {
      notify("请先确认背景图片不包含人物，再上传原图。");
      return;
    }
    setBusy(true);
    let first: Asset | undefined,
      count = 0;
    try {
      for (const file of Array.from(files)) {
        const asset = await importAsset(file, kind, kind === "background");
        onAdd(asset);
        first ??= asset;
        count++;
      }
      if (first) onChange({ [linkedField[kind]]: first.id }, d.id);
      notify(`已保存 ${count} 张原图，刷新后仍可使用。`);
    } catch (e) {
      notify(
        `${count ? `已保存 ${count} 张；` : ""}${e instanceof Error ? e.message : "上传失败，请重试。"}`,
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  function chooseUpload(nextKind: AssetKind) {
    setKind(nextKind);
    setTimeout(() => input.current?.click(), 0);
  }

  return (
    <div className="asset-library editor-content">
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple={kind === "background"}
        aria-label={`上传${{ background: "背景原图", logo: "机构 Logo", photo: "活动照片", qr: "报名二维码" }[kind]}`}
        onChange={(e) => void upload(e.target.files)}
      />
      <section className="form-section">
        <SectionHeading
          title="品牌背景"
          meta={
            <span className="count-label">
              {assets.filter((a) => a.kind === "background").length} 张
            </span>
          }
        />
        <p className="section-help">
          直接使用你的湖面、云雾与羽毛原图。支持一次导入六张，保留原有艺术质感。
        </p>
        <label className="check-field material-confirm">
          <input
            aria-label="确认背景不包含人物"
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>我确认上传的背景不包含任何人物</span>
        </label>
        <button
          className="upload-area"
          disabled={busy}
          onClick={() => chooseUpload("background")}
        >
          {busy ? (
            <LoaderCircle className="spin" />
          ) : (
            <ImagePlus size={26} strokeWidth={1.3} />
          )}
          <strong>{busy ? "正在保存原图…" : "导入背景原图"}</strong>
          <small>JPG / PNG / WebP · 每张 ≤ 20 MB</small>
        </button>
        <div className="background-grid">
          <button
            className={`background-thumb plain ${!d.backgroundId ? "selected" : ""}`}
            onClick={() => onChange({ backgroundId: null })}
          >
            <span className="plain-swatch">雾白</span>
            <span>纯色雾白{!d.backgroundId && <Check size={13} />}</span>
          </button>
          {assets
            .filter(
              (a) =>
                a.kind === "background" && (d.kind === "event" || a.noPeople),
            )
            .map((a) => (
              <button
                key={a.id}
                className={`background-thumb ${d.backgroundId === a.id ? "selected" : ""}`}
                onClick={() =>
                  onChange({
                    backgroundId: a.id,
                    ...(a.id.startsWith("brand-lake-") ? { mist: 18 } : {}),
                  })
                }
              >
                <img src={a.url} alt={a.name} />
                <span title={a.name}>
                  {a.name}
                  {d.backgroundId === a.id && <Check size={13} />}
                </span>
              </button>
            ))}
        </div>
        {!assets.some((a) => a.kind === "background") && (
          <p className="asset-note">
            尚未导入原图。聊天参考图不会被自动替换为其他图片。
          </p>
        )}
      </section>
      {(
        ["logo", ...(d.kind === "event" ? ["photo", "qr"] : [])] as AssetKind[]
      ).map((k, i) => {
        const field = linkedField[k],
          selected = assets.find((a) => a.id === d[field]);
        const name = {
          background: "背景",
          logo: "机构 Logo",
          photo: "活动人物照片",
          qr: "报名二维码",
        }[k];
        return (
          <section className="form-section" key={k}>
            <SectionHeading
              title={name}
              meta={<span className="optional-tag">可选</span>}
            />
            <p className="section-help">
              {k === "logo"
                ? "未上传时使用「小鸿雁」品牌文字。"
                : k === "photo"
                  ? "仅用于活动海报；不上传也能完整排版。"
                  : "上传已有二维码图片，建议保留白色边距。"}
            </p>
            {selected && (
              <div className={`selected-asset ${k}`}>
                <img src={selected.url} alt={selected.name} />
                <span>{selected.name}</span>
                <button
                  className="icon-button"
                  aria-label={`移除${name}`}
                  onClick={() => onChange({ [field]: null })}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <button
              className="secondary-button full"
              disabled={busy}
              onClick={() => chooseUpload(k)}
            >
              <Upload size={15} />
              {selected ? "更换" : "上传"}
              {name}
            </button>
            {assets.filter((a) => a.kind === k && a.id !== d[field]).length >
              0 && (
              <label className="field saved-asset-picker">
                <span className="field-label">从已保存的素材选择</span>
                <select
                  aria-label={`选择已保存的${name}`}
                  value={d[field] ?? ""}
                  onChange={(e) =>
                    onChange({ [field]: e.target.value || null })
                  }
                >
                  <option value="">选择素材</option>
                  {assets
                    .filter((a) => a.kind === k)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <span className="sr-only">素材区域 {i + 1}</span>
          </section>
        );
      })}
      <p className="local-reminder">
        素材保存在当前浏览器。更换设备前，请在「我的设计」中下载含素材的备份。
      </p>
    </div>
  );
}
