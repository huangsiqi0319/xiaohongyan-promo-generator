import { describe, expect, it } from "vitest";
import { createDesign, duplicateDesign, sortCourses } from "./model";
import { loadState, parseState, saveState, STORAGE_KEY } from "./storage";

describe("课程与多项目模型", () => {
  it("按星期和起始时间排序，不修改编辑顺序", () => {
    const d = createDesign("schedule");
    const rows = [
      { ...d.courses[0], id: "a", day: 7, time: "09:00" },
      { ...d.courses[0], id: "b", day: 1, time: "19:00" },
      { ...d.courses[0], id: "c", day: 1, time: "09:30" },
    ];
    expect(sortCourses(rows).map((x) => x.id)).toEqual(["c", "b", "a"]);
    expect(rows.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
  it("复制后的项目和课程 ID 独立，修改不会影响原项目", () => {
    const original = createDesign("schedule");
    const copy = duplicateDesign(original);
    expect(copy.id).not.toBe(original.id);
    expect(copy.courses[0].id).not.toBe(original.courses[0].id);
    copy.courses[0].name = "另一课程";
    expect(original.courses[0].name).not.toBe("另一课程");
    expect(copy.name).toContain("副本");
  });
  it("三类默认内容明确标记为演示", () => {
    for (const kind of ["schedule", "pricing", "event"] as const) {
      expect(createDesign(kind).demo).toBe(true);
    }
  });
});

function memoryStorage(initial?: string) {
  const map = new Map<string, string>(initial ? [[STORAGE_KEY, initial]] : []);
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, v: string) => {
      map.set(key, v);
    },
  };
}

describe("持久化", () => {
  it("保存和恢复所有项目、当前选择与前次版本", () => {
    const first = createDesign("schedule");
    const second = createDesign("pricing");
    const state = {
      version: 1 as const,
      projects: [first, second],
      activeId: second.id,
      previous: { [first.id]: first },
    };
    const storage = memoryStorage();
    saveState(storage, state);
    expect(loadState(storage).state).toEqual(state);
  });
  it("损坏的数据返回明确错误，不悄悄覆盖原内容", () => {
    const storage = memoryStorage("{broken");
    expect(loadState(storage).error).toBeTruthy();
    expect(storage.getItem(STORAGE_KEY)).toBe("{broken");
  });
  it("无效字段及空项目列表不能导致编辑器崩溃", () => {
    const storage = memoryStorage(
      JSON.stringify({ version: 1, projects: [{}], activeId: "x" }),
    );
    expect(loadState(storage).error).toBeTruthy();
    expect(loadState(memoryStorage()).state.projects.length).toBe(1);
  });
  it("写入失败必须抛出，不能假报已保存", () => {
    const state = loadState(memoryStorage()).state;
    expect(() =>
      saveState(
        {
          setItem: () => {
            throw new Error("quota");
          },
        },
        state,
      ),
    ).toThrow("quota");
  });
  it("拒绝快照属于另一项目的损坏数据，避免恢复后丢失当前项目", () => {
    const project = createDesign("schedule");
    const snapshot = duplicateDesign(project);
    const state = {
      version: 1,
      projects: [project],
      activeId: project.id,
      previous: { [project.id]: snapshot },
    };
    expect(() => parseState(JSON.stringify(state))).toThrow();
  });
});
