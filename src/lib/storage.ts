import type { MaterialState } from "../types";
import { createDesign, isDesign } from "./model";

export const STORAGE_KEY = "xiaohongyan-studio:v1";
type Reader = { getItem: (key: string) => string | null };
type Writer = { setItem: (key: string, value: string) => void };

export function initialState(): MaterialState {
  const first = createDesign("schedule");
  return { version: 1, projects: [first], activeId: first.id, previous: {} };
}

export function parseState(raw: string): MaterialState {
  const data = JSON.parse(raw);
  if (
    !data ||
    data.version !== 1 ||
    !Array.isArray(data.projects) ||
    !data.projects.length ||
    !data.projects.every(isDesign) ||
    new Set(data.projects.map((p: { id: string }) => p.id)).size !==
      data.projects.length ||
    !data.projects.some((p: { id: string }) => p.id === data.activeId) ||
    !data.previous ||
    typeof data.previous !== "object" ||
    Array.isArray(data.previous) ||
    !Object.entries(data.previous).every(
      ([id, snapshot]) =>
        isDesign(snapshot) &&
        snapshot.id === id &&
        data.projects.some(
          (p: { id: string; kind: string }) =>
            p.id === id && p.kind === snapshot.kind,
        ),
    )
  ) {
    throw new Error("备份或本地项目数据格式不正确，原数据未被覆盖。");
  }
  return data as MaterialState;
}

export function loadState(storage: Reader): {
  state: MaterialState;
  error?: string;
} {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return { state: raw ? parseState(raw) : initialState() };
  } catch {
    return {
      state: initialState(),
      error:
        "无法读取已保存的项目，原数据已保留。请先下载原始数据备份，再恢复保存。",
    };
  }
}

export function saveState(storage: Writer, state: MaterialState): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}
