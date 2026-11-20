import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  Copy,
  Download,
  Feather,
  FolderOpen,
  Image,
  LayoutTemplate,
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { MaterialState, RenderResult, TemplateKind } from "./types";
import { duplicateDesign, TEMPLATE_NAMES, uid } from "./lib/model";
import { useDesigns } from "./hooks/useDesigns";
import { useAssets } from "./hooks/useAssets";
import { downloadBlob, safeFilename } from "./lib/download";
import { STORAGE_KEY } from "./lib/storage";
import { makeBackup, readBackup } from "./lib/backup";
import { Editor } from "./components/Editor";
import { AssetLibrary } from "./components/AssetLibrary";
import { PosterPreview, type PosterHandle } from "./components/PosterPreview";
import { SectionHeading } from "./components/Fields";
import { ImageSaveDialog } from "./components/ImageSaveDialog";
import { ContinueDialog } from "./components/ContinueDialog";
import { UtilityDialog } from "./components/UtilityDialog";
import { hasResumeLink, resumeFile } from "./lib/resume-link";

export default function App() {
  const store = useDesigns(),
    media = useAssets();
  const d = store.active;
  const [panel, setPanel] = useState<"editor" | "projects" | "assets">(
    "editor",
  );
  const [renderStatus, setRenderStatus] = useState<RenderResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [transferState, setTransferState] = useState<MaterialState | null>(
    null,
  );
  const [incoming, setIncoming] = useState<{ file: File; name: string } | null>(
    null,
  );
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [quickPreview, setQuickPreview] = useState(false);
  const mainPanel = useRef<HTMLElement>(null);
  const editorScroll = useRef(0);
  useEffect(() => setQuickPreview(false), [d.id, panel]);
  function toggleQuickPreview() {
    if (quickPreview) {
      window.scrollTo({ top: editorScroll.current, behavior: "auto" });
      setQuickPreview(false);
    } else {
      editorScroll.current = window.scrollY;
      mainPanel.current
        ?.querySelector(".preview-toolbar")
        ?.scrollIntoView({ block: "start", behavior: "auto" });
      setQuickPreview(true);
    }
  }
  const preview = useRef<PosterHandle>(null),
    importInput = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 6000);
  }, []);
  const onStatus = useCallback(
    (status: RenderResult | null) => setRenderStatus(status),
    [],
  );
  useEffect(() => {
    let live = true,
      version = 0;
    async function detect() {
      const v = ++version;
      if (!hasResumeLink(location.hash)) return;
      try {
        const file = await resumeFile(location.hash);
        const data = await readBackup(file);
        if (live && v === version)
          setIncoming({ file, name: data.state.projects[0].name });
      } catch (e) {
        if (live && v === version)
          notify(e instanceof Error ? e.message : "无法读取续编链接。");
      }
    }
    void detect();
    window.addEventListener("hashchange", detect);
    return () => {
      live = false;
      version++;
      window.removeEventListener("hashchange", detect);
    };
  }, [notify]);
  function clearResume() {
    setIncoming(null);
    const url = new URL(location.href);
    url.hash = "";
    history.replaceState(null, "", url);
  }
  const canExport = Boolean(
    renderStatus &&
    !renderStatus.overflow &&
    !renderStatus.error &&
    !media.loading,
  );

  async function exportPNG() {
    if (!canExport) return;
    setExporting(true);
    try {
      const blob = await preview.current!.exportPNG();
      const name = `${safeFilename(d.name)}_1080x${d.height}.png`;
      if (
        matchMedia("(max-width: 760px)").matches ||
        /iPhone|iPad|Android/i.test(navigator.userAgent)
      )
        setImageFile(new File([blob], name, { type: "image/png" }));
      else {
        downloadBlob(blob, name);
        notify(`已请求浏览器下载「${name}」。`);
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : "导出失败，请重试。");
    } finally {
      setExporting(false);
    }
  }
  async function backup() {
    setBackupBusy(true);
    try {
      downloadBlob(await makeBackup(store.state), "小鸿雁设计与素材备份.json");
      notify("已导出全部设计及原图素材。");
    } catch (e) {
      notify(e instanceof Error ? e.message : "备份失败。");
    } finally {
      setBackupBusy(false);
    }
  }
  async function importBackup(file?: File, resuming = false) {
    if (!file) return false;
    setBackupBusy(true);
    try {
      const imported = await readBackup(file);
      // Always remap imported assets, so an old backup cannot overwrite a newer local original.
      const mapping = new Map(imported.assets.map((a) => [a.id, uid()]));
      const assets = imported.assets.map((a) => ({
        ...a,
        id: mapping.get(a.id)!,
      }));
      await media.importMany(assets);
      const projects = imported.state.projects.map((p) => {
        const copy = duplicateDesign(p);
        copy.name = resuming ? p.name : `${p.name} · 已导入`;
        for (const key of [
          "backgroundId",
          "logoId",
          "photoId",
          "qrId",
        ] as const)
          copy[key] = copy[key] ? (mapping.get(copy[key]!) ?? copy[key]) : null;
        return copy;
      });
      const saved = store.mergeProjects(projects);
      if (!saved) {
        notify(
          "设计已读取，但尚未保存到此浏览器。请保留续编链接或项目文件，并使用“跨浏览器继续”备份。",
        );
        return "memory" as const;
      }
      notify(
        resuming
          ? "设计已恢复，后续编辑会自动保存到此浏览器。"
          : `已导入 ${projects.length} 个设计，保留了原有项目。`,
      );
      return true;
    } catch (e) {
      notify(e instanceof Error ? e.message : "备份读取失败。");
      if (resuming)
        setRecoveryMessage(
          e instanceof Error ? e.message : "恢复失败，请保留续编链接重试。",
        );
      return false;
    } finally {
      setBackupBusy(false);
      if (importInput.current) importInput.current.value = "";
    }
  }
  function rawBackup() {
    try {
      downloadBlob(
        new Blob([localStorage.getItem(STORAGE_KEY) ?? ""], {
          type: "application/json",
        }),
        "小鸿雁原始存储备份.json",
      );
      notify("原始数据已下载。确认备份后，可点击「恢复保存」。");
    } catch {
      notify("无法读取浏览器存储。请检查隐私设置。");
    }
  }
  const templateIcon = {
    schedule: CalendarDays,
    pricing: Tag,
    event: Sparkles,
  };

  return (
    <div
      className={`app-shell ${d.kind === "pricing" && panel === "editor" ? "pricing-edit-mode" : ""}`}
    >
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPanel("editor");
          }}
        >
          <span className="brand-symbol">
            <Feather size={29} strokeWidth={1.15} />
          </span>
          <span>
            <strong>小鸿雁</strong>
            <small>品牌宣传物料生成器</small>
          </span>
        </a>
        <div className="header-divider" />
        <div className="breadcrumb">
          <span>品牌工作室</span>
          <ChevronRight size={13} />
          <span>{TEMPLATE_NAMES[d.kind]}</span>
        </div>
        <div className="top-actions">
          <span
            className={`save-status ${store.saveError ? "failed" : ""}`}
            title={
              store.saveError ||
              "内容保存在当前浏览器，换浏览器请使用跨浏览器继续"
            }
          >
            {store.saveError ? (
              <AlertCircle size={14} />
            ) : (
              <CheckCheck size={15} />
            )}
            <span>
              {store.saveError
                ? "保存异常"
                : store.lastSavedAt
                  ? "所有更改已保存"
                  : "编辑后自动保存"}
            </span>
          </span>
          <button
            className="secondary-button save-button"
            onClick={() => {
              if (store.save()) notify("当前设计已保存到此浏览器。");
            }}
          >
            <Save size={15} />
            <span>保存</span>
          </button>
          <button
            className="secondary-button transfer-desktop"
            onClick={() => setTransferState(store.state)}
          >
            跨浏览器继续
          </button>
          <button
            className="primary-button"
            aria-label="导出高清 PNG"
            disabled={!canExport || exporting}
            onClick={() => void exportPNG()}
          >
            {exporting ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <Download size={17} />
            )}
            {exporting ? (
              <span>正在生成</span>
            ) : (
              <>
                <span className="desktop-export-label">导出高清 PNG</span>
                <span className="mobile-export-label">生成高清图片</span>
              </>
            )}
          </button>
        </div>
      </header>
      <div className={`mobile-persist-bar ${store.saveError ? "failed" : ""}`}>
        <span>
          {store.saveError
            ? "未保存，请查看下方提示"
            : store.lastSavedAt
              ? "已自动保存到此浏览器"
              : "编辑后自动保存到此浏览器"}
        </span>
        <button
          aria-label="立即保存当前设计"
          onClick={() => {
            if (store.save())
              notify("当前设计已保存到此浏览器。换浏览器请使用续编链接。");
          }}
        >
          立即保存
        </button>
        <button onClick={() => setTransferState(store.state)}>
          跨浏览器继续
        </button>
      </div>
      {(store.saveError || media.error) && (
        <div className="storage-alert" role="alert">
          <AlertCircle size={16} />
          <span>{store.saveError || media.error}</span>
          {store.saveError && (
            <>
              <button onClick={rawBackup}>下载原始数据</button>
              <button
                onClick={() => {
                  if (store.resumeSaving()) notify("本地保存已恢复。");
                }}
              >
                恢复保存
              </button>
            </>
          )}
        </div>
      )}
      <div className="workspace">
        <nav className="nav-rail" aria-label="工作区导航">
          <div>
            {(
              [
                { id: "editor", label: "编辑物料", Icon: LayoutTemplate },
                { id: "projects", label: "我的设计", Icon: FolderOpen },
                { id: "assets", label: "品牌素材", Icon: Image },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                className={panel === id ? "active" : ""}
                onClick={() => setPanel(id)}
              >
                <Icon size={21} strokeWidth={1.6} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <span className="rail-footer">
            小鸿雁
            <br />
            DANCE ART
          </span>
        </nav>
        <aside className="editor-panel" aria-label="编辑区域">
          {panel === "editor" ? (
            <>
              <div className="template-picker">
                <div className="panel-title">
                  <h2>开始一份美好表达</h2>
                  <span>选择物料类型</span>
                </div>
                <div className="template-options">
                  {(["schedule", "pricing", "event"] as TemplateKind[]).map(
                    (kind) => {
                      const Icon = templateIcon[kind];
                      return (
                        <button
                          aria-label={TEMPLATE_NAMES[kind]}
                          className={d.kind === kind ? "selected" : ""}
                          key={kind}
                          onClick={() => store.add(kind)}
                        >
                          <Icon size={21} strokeWidth={1.5} />
                          <span>
                            {kind === "schedule"
                              ? "课程表"
                              : kind === "pricing"
                                ? "价目表"
                                : "活动海报"}
                          </span>
                          {d.kind === kind && (
                            <span className="selected-corner">
                              <Check size={10} />
                            </span>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
              <Editor key={d.id} design={d} onChange={store.update} />
              <div className="editor-bottom">
                <span>下周，只需改动一点点。</span>
                <button
                  disabled={!store.hasPrevious}
                  onClick={store.restore}
                  aria-label="恢复上一次编辑内容"
                >
                  <RotateCcw size={14} />
                  恢复前次
                </button>
              </div>
            </>
          ) : panel === "assets" ? (
            <>
              <div className="panel-header">
                <span className="eyebrow">BRAND LIBRARY</span>
                <h2>让美感，一脉相承。</h2>
                <p>你的原图与标识，妥善珍藏。</p>
              </div>
              <AssetLibrary
                design={d}
                assets={media.assets}
                onChange={store.update}
                onAdd={media.add}
                notify={notify}
              />
            </>
          ) : (
            <>
              <div className="panel-header">
                <span className="eyebrow">MY COLLECTION</span>
                <h2>每一次表达，都留存。</h2>
                <p>从上一次出发，轻松开始新一周。</p>
              </div>
              <div className="project-content editor-content">
                <SectionHeading
                  title="我的设计"
                  meta={
                    <span className="count-label">
                      {store.state.projects.length} 份
                    </span>
                  }
                />
                <div className="new-projects">
                  {(["schedule", "pricing", "event"] as const).map((kind) => (
                    <button
                      className="secondary-button"
                      key={kind}
                      onClick={() => {
                        store.add(kind, true);
                        setPanel("editor");
                      }}
                    >
                      <Plus size={14} />
                      {TEMPLATE_NAMES[kind]
                        .replace("每周", "")
                        .replace("课程价", "价")}
                    </button>
                  ))}
                </div>
                <div className="project-list">
                  {store.state.projects.map((p) => {
                    const Icon = templateIcon[p.kind];
                    return (
                      <div
                        key={p.id}
                        className={`project-card ${p.id === d.id ? "selected" : ""}`}
                      >
                        <button
                          className="project-select"
                          onClick={() => {
                            store.select(p.id);
                            setPanel("editor");
                          }}
                        >
                          <span className="project-icon">
                            <Icon size={22} strokeWidth={1.4} />
                          </span>
                          <span>
                            <strong>{p.name || "未命名设计"}</strong>
                            <small>
                              {TEMPLATE_NAMES[p.kind]} ·{" "}
                              {new Date(p.updatedAt).toLocaleDateString(
                                "zh-CN",
                                { timeZone: "Asia/Shanghai" },
                              )}
                            </small>
                          </span>
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`删除设计 ${p.name}`}
                          onClick={() => setDeleteId(p.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  className="secondary-button full"
                  aria-label="复制当前设计"
                  onClick={() => {
                    store.duplicate();
                    setPanel("editor");
                    notify("已复制当前设计，可以开始修改。");
                  }}
                >
                  <Copy size={15} />
                  复制当前设计
                </button>
                <div className="backup-section">
                  <SectionHeading title="备份与迁移" />
                  <p className="section-help">
                    数据仅在当前浏览器中保存。清理浏览器或更换设备前，请下载含原图的完整备份。
                  </p>
                  <button
                    className="secondary-button full"
                    disabled={backupBusy}
                    onClick={() => void backup()}
                  >
                    <ArrowDownToLine size={15} />
                    下载全部设计与素材
                  </button>
                  <button
                    className="text-button"
                    disabled={backupBusy}
                    onClick={() => importInput.current?.click()}
                  >
                    <Upload size={14} />
                    导入备份，保留现有设计
                  </button>
                  <input
                    className="sr-only"
                    ref={importInput}
                    type="file"
                    accept=".json,application/json"
                    aria-label="导入设计备份"
                    onChange={(e) => void importBackup(e.target.files?.[0])}
                  />
                </div>
              </div>
            </>
          )}
        </aside>
        <main className="main-panel" ref={mainPanel} id="material-preview">
          <div className="main-controls">
            <span>
              <span className="project-dot" />
              {d.name || "未命名设计"}
              {d.demo && <span className="demo-badge">演示</span>}
            </span>
            <div>
              <button
                className="icon-button"
                aria-label="复制当前设计"
                title="复制当前设计"
                onClick={() => {
                  store.duplicate();
                  notify("已创建独立副本。");
                }}
              >
                <Copy size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="恢复前次编辑"
                title="恢复前次编辑"
                disabled={!store.hasPrevious}
                onClick={store.restore}
              >
                <RotateCcw size={16} />
              </button>
              <span className="control-divider" />
              <label className="size-select">
                <span>画布尺寸</span>
                <select
                  aria-label="导出尺寸"
                  value={d.height}
                  onChange={(e) =>
                    store.update({
                      height: Number(e.target.value) as 1080 | 1440 | 1920,
                    })
                  }
                >
                  <option value="1440">1080 × 1440 · 社交竖版</option>
                  <option value="1920">1080 × 1920 · 长竖版</option>
                  <option value="1080">1080 × 1080 · 方形</option>
                </select>
              </label>
            </div>
          </div>
          <PosterPreview
            ref={preview}
            design={d}
            assets={media.assets}
            assetsLoading={media.loading}
            onStatus={onStatus}
          />
        </main>
      </div>
      {d.kind === "pricing" && panel === "editor" && (
        <div className="pricing-preview-bar">
          <span>{quickPreview ? "回到刚才编辑的位置" : "修改后实时预览"}</span>
          <button
            className="primary-button"
            aria-controls={quickPreview ? undefined : "material-preview"}
            onClick={toggleQuickPreview}
          >
            <Image size={16} />
            {quickPreview ? "返回编辑" : "查看成图"}
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
          <button aria-label="关闭提示" onClick={() => setToast("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {imageFile && (
        <ImageSaveDialog file={imageFile} onClose={() => setImageFile(null)} />
      )}
      {transferState && (
        <ContinueDialog
          state={transferState}
          onClose={() => setTransferState(null)}
        />
      )}
      {incoming && (
        <UtilityDialog title="恢复续编设计" onClose={() => setIncoming(null)}>
          <p className="utility-help">
            发现设计「{incoming.name}
            」。将作为新设计打开，此浏览器已有项目会保留。
          </p>
          {recoveryMessage && (
            <p className="utility-message" role="alert">
              {recoveryMessage}
            </p>
          )}
          <div className="utility-actions">
            <button
              className="secondary-button"
              disabled={backupBusy}
              onClick={() => setIncoming(null)}
            >
              暂不打开
            </button>
            <button
              className="primary-button"
              disabled={backupBusy}
              onClick={async () => {
                const result = await importBackup(incoming.file, true);
                if (result === true) {
                  clearResume();
                  setPanel("editor");
                } else if (result === "memory") {
                  setIncoming(null);
                  setPanel("editor");
                }
              }}
            >
              打开这份设计
            </button>
          </div>
        </UtilityDialog>
      )}
      {deleteId && (
        <div className="modal-backdrop" onClick={() => setDeleteId(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="删除设计"
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 size={25} strokeWidth={1.4} />
            <h2>删除这份设计？</h2>
            <p>
              「{store.state.projects.find((p) => p.id === deleteId)?.name}
              」将从此浏览器中删除，已上传的原图素材会保留。此操作无法撤销。
            </p>
            <div>
              <button
                className="secondary-button"
                autoFocus
                onClick={() => setDeleteId(null)}
              >
                保留设计
              </button>
              <button
                className="danger-button"
                onClick={() => {
                  store.remove(deleteId);
                  setDeleteId(null);
                  notify("设计已删除。");
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
