import { useRef, useState } from "react";
import type { Design, MaterialState, TemplateKind } from "../types";
import { createDesign, duplicateDesign } from "../lib/model";
import { initialState, loadState, saveState } from "../lib/storage";

function read() {
  try {
    return loadState(window.localStorage);
  } catch {
    return {
      state: initialState(),
      error: "本地存储不可用，请允许此网站保存数据。",
    };
  }
}

export function useDesigns() {
  const [loaded] = useState(read);
  const [state, setState] = useState(loaded.state);
  const current = useRef(state);
  const [saveError, setSaveError] = useState(loaded.error ?? "");
  const blocked = useRef(Boolean(loaded.error));
  const edit = useRef({ id: "", time: 0 });
  const active = state.projects.find((p) => p.id === state.activeId)!;

  function commit(next: MaterialState) {
    current.current = next;
    setState(next);
    if (blocked.current) return;
    try {
      saveState(localStorage, next);
      setSaveError("");
    } catch {
      setSaveError("保存失败：浏览器空间不足或存储被禁用。请下载备份后重试。");
    }
  }
  function update(patch: Partial<Design>, projectId?: string) {
    const s = current.current,
      old = s.projects.find((p) => p.id === (projectId ?? s.activeId));
    // An asynchronous image upload may finish after its originating project was deleted.
    if (!old) return;
    const now = Date.now();
    const snapshot =
      edit.current.id !== old.id || now - edit.current.time > 1600;
    edit.current = { id: old.id, time: now };
    commit({
      ...s,
      previous: snapshot
        ? { ...s.previous, [old.id]: structuredClone(old) }
        : s.previous,
      projects: s.projects.map((p) =>
        p.id === old.id ? { ...p, ...patch, updatedAt: now } : p,
      ),
    });
  }
  function select(id: string) {
    commit({ ...current.current, activeId: id });
    edit.current = { id: "", time: 0 };
  }
  function add(kind: TemplateKind, force = false) {
    const s = current.current;
    const existing = !force && s.projects.find((p) => p.kind === kind);
    if (existing) {
      select(existing.id);
      return;
    }
    const p = createDesign(kind),
      source = s.projects.find((p) => p.id === s.activeId);
    if (source) {
      p.backgroundId = source.backgroundId;
      p.logoId = source.logoId;
      p.mist = source.mist;
      p.height = source.height;
      p.layout = source.layout;
    }
    commit({ ...s, projects: [...s.projects, p], activeId: p.id });
    edit.current = { id: "", time: 0 };
  }
  function duplicate() {
    const s = current.current,
      copy = duplicateDesign(s.projects.find((p) => p.id === s.activeId)!);
    commit({ ...s, projects: [...s.projects, copy], activeId: copy.id });
    edit.current = { id: "", time: 0 };
  }
  function remove(id: string) {
    const s = current.current,
      projects = s.projects.filter((p) => p.id !== id),
      previous = { ...s.previous };
    delete previous[id];
    if (!projects.length) projects.push(createDesign("schedule"));
    commit({
      ...s,
      projects,
      previous,
      activeId: s.activeId === id ? projects[0].id : s.activeId,
    });
  }
  function restore() {
    const s = current.current,
      old = s.projects.find((p) => p.id === s.activeId)!,
      previous = Object.hasOwn(s.previous, s.activeId)
        ? s.previous[s.activeId]
        : undefined;
    if (!previous) return;
    if (previous.id !== old.id || previous.kind !== old.kind) {
      setSaveError("恢复快照异常，当前项目未被修改。请先下载备份。");
      return;
    }
    commit({
      ...s,
      projects: s.projects.map((p) => (p.id === old.id ? previous : p)),
      previous: { ...s.previous, [old.id]: old },
    });
    edit.current = { id: "", time: 0 };
  }
  function save() {
    if (blocked.current) return false;
    try {
      saveState(localStorage, current.current);
      setSaveError("");
      return true;
    } catch {
      setSaveError("保存失败，请下载备份。");
      return false;
    }
  }
  function replace(next: MaterialState) {
    blocked.current = false;
    commit(next);
    edit.current = { id: "", time: 0 };
  }
  function mergeProjects(projects: Design[]) {
    const s = current.current;
    commit({
      ...s,
      projects: [...s.projects, ...projects],
      activeId: projects[0].id,
    });
    edit.current = { id: "", time: 0 };
  }
  function resumeSaving() {
    blocked.current = false;
    return save();
  }
  return {
    state,
    active,
    saveError,
    hasPrevious: Object.hasOwn(state.previous, state.activeId),
    update,
    select,
    add,
    duplicate,
    remove,
    restore,
    save,
    replace,
    mergeProjects,
    resumeSaving,
  };
}
