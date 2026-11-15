export function downloadBlob(blob: Blob, name: string) {
  const link = document.createElement("a"),
    url = URL.createObjectURL(blob);
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export const safeFilename = (value: string) =>
  value.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 100) || "小鸿雁物料";
