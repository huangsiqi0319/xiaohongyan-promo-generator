import type { Course, Design, TemplateKind } from "../types";
import { DEFAULT_BACKGROUND_ID } from "./brand";

export const TEMPLATE_NAMES = {
  schedule: "每周课程表",
  pricing: "课程价目表",
  event: "活动海报",
};
export const DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
export const uid = () => crypto.randomUUID();

export function sortCourses(items: Course[]): Course[] {
  return [...items].sort(
    (a, b) => a.day - b.day || a.time.localeCompare(b.time),
  );
}

export function createDesign(kind: TemplateKind): Design {
  const id = uid();
  return {
    id,
    kind,
    name: `${TEMPLATE_NAMES[kind]} · 演示`,
    title: TEMPLATE_NAMES[kind],
    demo: true,
    dateRange: "2026.11.09 — 11.15",
    note: "请提前预约课程，如有调整将另行通知。",
    height: 1440,
    layout: "editorial",
    backgroundId: DEFAULT_BACKGROUND_ID,
    logoId: null,
    photoId: null,
    qrId: null,
    mist: 18,
    cropX: 50,
    cropY: 50,
    updatedAt: Date.now(),
    courses: [
      [1, "18:30", "20:00", "中国古典舞 · 身韵", "林老师", "一号教室"],
      [2, "19:00", "20:30", "民族民间舞 · 傣族", "陈老师", "二号教室"],
      [3, "18:30", "20:00", "古典舞 · 基础训练", "林老师", "一号教室"],
      [5, "19:00", "20:30", "中国舞 · 成品舞", "许老师", "一号教室"],
      [6, "10:00", "11:30", "民族民间舞 · 藏族", "陈老师", "二号教室"],
      [6, "14:00", "15:30", "古典舞 · 进阶身韵", "林老师", "一号教室"],
    ].map(([day, time, endTime, name, teacher, room]) => ({
      id: uid(),
      day: Number(day),
      time: String(time),
      endTime: String(endTime),
      name: String(name),
      teacher: String(teacher),
      room: String(room),
    })),
    prices: [
      {
        id: uid(),
        category: "常规课程",
        name: "中国古典舞",
        single: "180",
        packagePrice: "1,580",
        sessions: "10 次",
        offer: "基础训练 / 身韵",
        validity: "90 天",
        note: "适合零基础与初学者",
      },
      {
        id: uid(),
        category: "常规课程",
        name: "民族民间舞",
        single: "180",
        packagePrice: "1,580",
        sessions: "10 次",
        offer: "傣族 / 藏族 / 蒙古族",
        validity: "90 天",
        note: "按当期课程安排选课",
      },
      {
        id: uid(),
        category: "进阶课程",
        name: "古典舞进阶",
        single: "220",
        packagePrice: "1,980",
        sessions: "10 次",
        offer: "成品舞与舞蹈表现",
        validity: "120 天",
        note: "建议具有一定舞蹈基础",
      },
    ],
    event: {
      subtitle: "让身体，成为诗的一部分",
      description:
        "在呼吸与流动之间，感受中国古典舞的柔韧与力量。\n从一段身韵开始，走近属于自己的舞蹈表达。",
      date: "2026.11.21",
      time: "14:00 — 16:00",
      location: "小鸿雁艺术空间 · 一号教室",
      price: "体验价 ¥99（演示）",
      teacher: "林老师",
      registration: "请联系机构工作人员预约报名",
    },
  };
}

export function duplicateDesign(source: Design): Design {
  const d = structuredClone(source);
  return {
    ...d,
    id: uid(),
    name: `${d.name} · 副本`,
    updatedAt: Date.now(),
    courses: d.courses.map((c) => ({ ...c, id: uid() })),
    prices: d.prices.map((p) => ({ ...p, id: uid() })),
  };
}

const strings = (value: Record<string, unknown>, keys: string[]) =>
  keys.every((k) => typeof value[k] === "string");
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const assetId = (v: unknown) => v === null || typeof v === "string";

export function isDesign(value: unknown): value is Design {
  if (!object(value)) return false;
  const d = value;
  return (
    strings(d, ["id", "name", "title", "dateRange", "note"]) &&
    Boolean(d.id) &&
    ["schedule", "pricing", "event"].includes(String(d.kind)) &&
    ["editorial", "airy"].includes(String(d.layout)) &&
    [1080, 1440, 1920].includes(Number(d.height)) &&
    typeof d.height === "number" &&
    typeof d.demo === "boolean" &&
    ["mist", "cropX", "cropY"].every(
      (k) =>
        typeof d[k] === "number" &&
        Number.isFinite(d[k]) &&
        Number(d[k]) >= 0 &&
        Number(d[k]) <= 100,
    ) &&
    typeof d.updatedAt === "number" &&
    Number.isFinite(d.updatedAt) &&
    ["backgroundId", "logoId", "photoId", "qrId"].every((k) => assetId(d[k])) &&
    Array.isArray(d.courses) &&
    d.courses.every(
      (c) =>
        object(c) &&
        strings(c, ["id", "time", "endTime", "name", "teacher", "room"]) &&
        Number.isInteger(c.day) &&
        Number(c.day) >= 1 &&
        Number(c.day) <= 7 &&
        /^\d{2}:\d{2}$/.test(String(c.time)) &&
        /^\d{2}:\d{2}$/.test(String(c.endTime)),
    ) &&
    Array.isArray(d.prices) &&
    d.prices.every(
      (p) =>
        object(p) &&
        strings(p, [
          "id",
          "category",
          "name",
          "single",
          "packagePrice",
          "sessions",
          "offer",
          "validity",
          "note",
        ]),
    ) &&
    object(d.event) &&
    strings(d.event, [
      "subtitle",
      "description",
      "date",
      "time",
      "location",
      "price",
      "teacher",
      "registration",
    ])
  );
}
