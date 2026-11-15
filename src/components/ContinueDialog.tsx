import { useEffect, useState } from "react";
import { Copy, Download, Share2 } from "lucide-react";
import type { MaterialState } from "../types";
import { makeProjectBackup } from "../lib/backup";
import { makeResumeURL } from "../lib/resume-link";
import { safeFilename, downloadBlob } from "../lib/download";
import { UtilityDialog } from "./UtilityDialog";
import { canShareFile } from "./ImageSaveDialog";

export function ContinueDialog({
  state,
  onClose,
}: {
  state: MaterialState;
  onClose: () => void;
}) {
  const [link, setLink] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    let live = true;
    async function build() {
      try {
        const blob = await makeProjectBackup(state, state.activeId);
        const name = state.projects.find((p) => p.id === state.activeId)!.name;
        if (!live) return;
        setFile(
          new File([blob], `${safeFilename(name)}.xiaohongyan.json`, {
            type: "application/json",
          }),
        );
        const value = await makeResumeURL(blob, location.href);
        if (live) setLink(value);
      } catch (e) {
        if (live)
          setError(e instanceof Error ? e.message : "无法生成续编内容。");
      }
    }
    void build();
    return () => {
      live = false;
    };
  }, [state]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setMessage(
        "续编链接已复制。切换到 Safari，把完整链接粘贴到地址栏打开，再选择“打开这份设计”。",
      );
    } catch {
      setMessage(
        "浏览器未允许自动复制。请长按下面的链接文字，全选并复制，再到 Safari 打开。",
      );
    }
  }
  async function share() {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: "小鸿雁设计项目" });
      setMessage(
        "已交给系统处理。保存项目文件后，在另一浏览器打开网站，进入“我的设计”导入备份。",
      );
    } catch (e) {
      setMessage(
        e instanceof DOMException && e.name === "AbortError"
          ? "已取消分享，当前设计仍保留。"
          : "系统分享不可用，请尝试下载项目文件。",
      );
    }
  }
  return (
    <UtilityDialog title="跨浏览器继续编辑" onClose={onClose}>
      <p className="utility-help">
        Chrome 和 Safari 的本地记录互不相通。把<strong>当前设计</strong>
        的续编链接复制到另一浏览器，即可接着编辑。
      </p>
      {!file && !error && <p>正在准备当前设计…</p>}
      {link && (
        <>
          <button className="primary-button full" onClick={() => void copy()}>
            <Copy size={16} />
            复制续编链接
          </button>
          <label className="field resume-link-field">
            <span className="field-label">也可长按全选复制完整链接</span>
            <textarea
              aria-label="续编链接"
              readOnly
              value={link}
              rows={3}
              onFocus={(e) => e.target.select()}
            />
          </label>
        </>
      )}
      {error && (
        <p className="utility-message" role="alert">
          {error}
        </p>
      )}
      <p className="utility-help">
        链接包含本次设计及所用素材，请只发给自己。它是本次快照，后续修改需要重新生成链接；不是云端自动同步。
      </p>
      {file && (
        <div className="project-file-transfer">
          <h3>也可以用项目文件转移</h3>
          <p className="utility-help">
            含当前设计和上传的图片。到另一浏览器后，在“我的设计”中导入备份，已有项目会保留。
          </p>
          <div className="utility-actions">
            {canShareFile(file) && (
              <button className="secondary-button" onClick={() => void share()}>
                <Share2 size={15} />
                分享项目文件
              </button>
            )}
            <button
              className="secondary-button"
              onClick={() => {
                downloadBlob(file, file.name);
                setMessage(
                  `已请求浏览器下载「${file.name}」，请确认下载完成后再切换浏览器。`,
                );
              }}
            >
              <Download size={15} />
              下载项目文件
            </button>
          </div>
        </div>
      )}
      {message && (
        <p className="utility-message" role="status">
          {message}
        </p>
      )}
    </UtilityDialog>
  );
}
