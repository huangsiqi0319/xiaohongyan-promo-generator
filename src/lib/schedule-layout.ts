import type { Design, ScheduleStyle } from "../types";

export const singleLine = (value: string) => value.replace(/\s+/gu, " ").trim();
export function getScheduleStyle(d: Design): ScheduleStyle {
  return (
    d.scheduleStyle ?? {
      mode: "auto",
      fontSize: 28,
      courseWidth: 46,
      rowGap: d.layout === "airy" ? 32 : 24,
    }
  );
}
export function isScheduleStyle(v: unknown): v is ScheduleStyle | undefined {
  if (v === undefined) return true;
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const s = v as Record<string, unknown>;
  return (
    ["auto", "manual"].includes(String(s.mode)) &&
    !(s.mode === "auto" && Number(s.fontSize) < 18) &&
    (
      [
        ["fontSize", 16, 32],
        ["courseWidth", 40, 54],
        ["rowGap", 12, 44],
      ] as const
    ).every(
      ([k, min, max]) =>
        typeof s[k] === "number" &&
        Number.isFinite(s[k]) &&
        Number(s[k]) >= min &&
        Number(s[k]) <= max,
    )
  );
}

/** All cells share a baseline and a uniform font; nothing is wrapped or shortened. */
export function planSchedule(
  d: Design,
  measure: (text: string, size: number) => number,
  available: number,
) {
  const style = getScheduleStyle(d);
  const course = Math.round((904 * style.courseWidth) / 100);
  const remainder = 904 - 82 - 174 - course;
  const widths = [
    82,
    174,
    course,
    Math.floor(remainder * 0.46),
    remainder - Math.floor(remainder * 0.46),
  ];
  const xs = widths.map(
    (_, i) => 88 + widths.slice(0, i).reduce((a, b) => a + b, 0),
  );
  let lastDay = 0;
  const rows = [...d.courses]
    .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))
    .map((c) => {
      const day = lastDay === c.day ? "·" : `周${"一二三四五六日"[c.day - 1]}`;
      lastDay = c.day;
      return {
        id: c.id,
        values: [
          day,
          `${c.time}–${c.endTime}`,
          singleLine(c.name) || "未命名课程",
          singleLine(c.teacher) || "待定",
          singleLine(c.room) || "待定",
        ],
      };
    });
  let fontSize = style.fontSize;
  if (style.mode === "auto") {
    for (const row of rows)
      row.values.forEach((value, i) => {
        const width = measure(value, style.fontSize);
        if (width > 0)
          fontSize = Math.min(
            fontSize,
            (style.fontSize * (widths[i] - 12)) / width,
          );
      });
    if (rows.length)
      fontSize = Math.min(
        fontSize,
        (Math.floor((available - 48) / rows.length) - style.rowGap) / 1.45,
      );
    fontSize = Math.max(18, Math.floor(fontSize * 10) / 10);
  }
  const rowHeight = Math.ceil(fontSize * 1.45 + style.rowGap);
  const height = rows.length ? 48 + rowHeight * rows.length : 104;
  const horizontal = rows.some((r) =>
    r.values.some(
      (value, i) => measure(value, fontSize) > widths[i] - 12 + 0.01,
    ),
  );
  const vertical = height > available;
  const reason = horizontal
    ? "文字过长，无法在当前字号和栏宽内单行显示。请降低字号、调整课程栏宽度或精简文字。"
    : vertical
      ? "课程行数超出画面，请减小字号或行距，或改用更长的图片尺寸。"
      : undefined;
  return {
    widths,
    xs,
    rows,
    fontSize,
    rowHeight,
    height,
    overflow: horizontal || vertical,
    reason,
  };
}
