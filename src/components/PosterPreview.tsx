import {
  forwardRef,
  useLayoutEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  AlertCircle,
  Image,
  LoaderCircle,
  Maximize2,
  Minus,
  Plus,
} from "lucide-react";
import type { AssetView, Design, RenderResult } from "../types";
import { renderPoster } from "../lib/render";

export interface PosterHandle {
  exportPNG: () => Promise<Blob>;
}
interface Props {
  design: Design;
  assets: AssetView[];
  assetsLoading: boolean;
  onStatus: (status: RenderResult | null) => void;
}

export const PosterPreview = forwardRef<PosterHandle, Props>(
  function PosterPreview({ design, assets, assetsLoading, onStatus }, ref) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState<RenderResult | null>(null);
    const [zoom, setZoom] = useState(1);
    const statusRef = useRef(status);
    useLayoutEffect(() => {
      let live = true;
      setStatus(null);
      statusRef.current = null;
      onStatus(null);
      if (assetsLoading) return;
      const buffer = document.createElement("canvas");
      renderPoster(buffer, design, assets)
        .then((result) => {
          if (!live || !canvas.current) return;
          canvas.current.width = buffer.width;
          canvas.current.height = buffer.height;
          canvas.current.getContext("2d")!.drawImage(buffer, 0, 0);
          statusRef.current = result;
          setStatus(result);
          onStatus(result);
        })
        .catch((e) => {
          if (!live) return;
          const result = {
            overflow: false,
            error: e.message,
            bodyFont: 28,
            contentBottom: 0,
          };
          statusRef.current = result;
          setStatus(result);
          onStatus(result);
        });
      return () => {
        live = false;
      };
    }, [design, assets, assetsLoading, onStatus]);

    useImperativeHandle(
      ref,
      () => ({
        exportPNG: () =>
          new Promise((resolve, reject) => {
            if (
              !canvas.current ||
              !statusRef.current ||
              statusRef.current.overflow ||
              statusRef.current.error
            ) {
              reject(new Error("当前预览尚不能导出，请先处理提示。"));
              return;
            }
            canvas.current.toBlob(
              (blob) =>
                blob
                  ? resolve(blob)
                  : reject(new Error("PNG 导出失败，请重试。")),
              "image/png",
            );
          }),
      }),
      [],
    );

    return (
      <section
        className="preview-panel"
        aria-label="物料实时预览"
        style={{ "--poster-ratio": 1080 / design.height } as CSSProperties}
      >
        <div className="preview-heading">
          <div>
            <span className="eyebrow">YOUR BRAND, BEAUTIFULLY.</span>
            <h1>让每一份表达，都有小鸿雁的模样。</h1>
            <p>内容由你书写，美感自有章法。</p>
          </div>
          <span className="live-tag">
            <i /> 实时预览
          </span>
        </div>
        <div className="preview-toolbar">
          <div>
            <span className="canvas-dot" />
            {design.layout === "editorial"
              ? "雅序 · 经典版式"
              : "留白 · 舒展版式"}
          </div>
          <div className="zoom-control">
            <button
              aria-label="缩小预览"
              onClick={() =>
                setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(1)))
              }
            >
              <Minus size={14} />
            </button>
            <button onClick={() => setZoom(1)} title="适应窗口">
              {Math.round(zoom * 100)}%
            </button>
            <button
              aria-label="放大预览"
              onClick={() =>
                setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(1)))
              }
            >
              <Plus size={14} />
            </button>
            <button aria-label="适应窗口" onClick={() => setZoom(1)}>
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
        <div className="preview-stage">
          <div
            className="canvas-frame"
            style={{
              width: `calc(var(--poster-width) * ${zoom})`,
              aspectRatio: `1080 / ${design.height}`,
            }}
          >
            <canvas
              ref={canvas}
              role="img"
              aria-label={`${design.title}，${design.demo ? "演示数据，" : ""}高清物料预览`}
              data-ready={Boolean(status && !status.error)}
            />
            {!status && (
              <div className="render-overlay">
                <LoaderCircle className="spin" size={24} />
                <span>正在排版…</span>
              </div>
            )}
            {status?.error && (
              <div className="render-overlay error">
                <AlertCircle />
                <span>{status.error}</span>
              </div>
            )}
          </div>
        </div>
        <div className="preview-caption">
          <span>
            <Image size={14} /> 1080 × {design.height} px{" "}
            <span className="caption-separator">/</span> 高清 PNG
          </span>
          <span>
            {design.kind === "schedule" && status && !status.error
              ? `正文 ${status.bodyFont} px · `
              : ""}
            预览即导出效果
          </span>
        </div>
        {status?.overflow && (
          <div role="alert" className="overflow-alert">
            <AlertCircle size={20} />
            <div>
              <strong>内容超出安全区域</strong>
              <p>
                {status.overflowReason ||
                  "请切换至 1080 × 1920、选择「雅序」布局，或精简内容。"}
                为保证文字完整，当前暂不可导出。
              </p>
            </div>
          </div>
        )}
        {!design.backgroundId && (
          <div className="original-note">
            当前使用雾白底。前往「品牌素材」导入你的湖面羽毛原图，保留原有艺术质感。
          </div>
        )}
        <details className="sr-only">
          <summary>预览文字内容</summary>
          <p>
            {design.title} {design.dateRange} {design.note}
          </p>
          {design.kind === "schedule" ? (
            design.courses.map((c) => (
              <p key={c.id}>
                {c.day} {c.time} {c.endTime} {c.name} {c.teacher} {c.room}
              </p>
            ))
          ) : design.kind === "pricing" ? (
            design.prices.map((p) => (
              <p key={p.id}>
                {p.category} {p.name} {p.single} {p.packagePrice} {p.sessions}{" "}
                {p.offer} {p.validity} {p.note}
              </p>
            ))
          ) : (
            <p>{Object.values(design.event).join(" ")}</p>
          )}
        </details>
      </section>
    );
  },
);
