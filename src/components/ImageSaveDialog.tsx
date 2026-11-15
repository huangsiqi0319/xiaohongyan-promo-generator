import { useEffect, useMemo, useState } from "react";
import { Download, Share2, ExternalLink } from "lucide-react";
import { UtilityDialog } from "./UtilityDialog";
import { downloadBlob } from "../lib/download";

export function canShareFile(file: File) {
  try {
    return (
      typeof navigator.share === "function" &&
      Boolean(navigator.canShare?.({ files: [file] }))
    );
  } catch {
    return false;
  }
}
export function ImageSaveDialog({
  file,
  onClose,
}: {
  file: File;
  onClose: () => void;
}) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const [message, setMessage] = useState(""),
    [sharing, setSharing] = useState(false);
  async function share() {
    setSharing(true);
    try {
      await navigator.share({ files: [file], title: "小鸿雁宣传物料" });
      setMessage("已交给系统处理，请在你选择的相册、文件或应用中查看。");
    } catch (e) {
      setMessage(
        e instanceof DOMException && e.name === "AbortError"
          ? "已取消分享，图片仍在这里，可以长按保存。"
          : "此浏览器暂时无法分享文件，请长按下方图片保存，或打开原图后保存。",
      );
    } finally {
      setSharing(false);
    }
  }
  return (
    <UtilityDialog
      title="保存高清图片"
      onClose={onClose}
      className="image-save-dialog"
    >
      <p className="utility-help">
        图片已生成。<strong>长按下方图片</strong>
        ，选择“存储图像”或“添加到照片”；也可以使用系统分享。
      </p>
      <div className="image-save-preview">
        <img src={url} alt="可长按保存的高清物料" />
      </div>
      <div className="utility-actions">
        {canShareFile(file) && (
          <button
            className="primary-button"
            disabled={sharing}
            onClick={() => void share()}
          >
            <Share2 size={16} />
            保存／分享图片
          </button>
        )}
        <a
          className="secondary-button"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={16} />
          打开原图
        </a>
      </div>
      <button
        className="text-button"
        onClick={() => {
          downloadBlob(file, file.name);
          setMessage(
            `已请求浏览器下载「${file.name}」。可查看浏览器“下载内容”或系统“文件”App；若没有记录，请使用长按保存或分享。`,
          );
        }}
      >
        <Download size={15} />
        下载 PNG 文件
      </button>
      <p className="utility-help">
        文件名：{file.name}
        <br />
        生成图片不等于已保存到相册，请完成上方保存操作后再关闭。
      </p>
      {message && (
        <p className="utility-message" role="status">
          {message}
        </p>
      )}
    </UtilityDialog>
  );
}
