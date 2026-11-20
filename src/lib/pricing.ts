import type {
  Design,
  PricingRow,
  PricingSection,
  PricingTable,
} from "../types";

const id = () => crypto.randomUUID();
export function createPricingRow(
  columns: PricingSection["columns"],
  values: string[] = [],
): PricingRow {
  return {
    id: id(),
    enabled: true,
    cells: Object.fromEntries(columns.map((c, i) => [c.id, values[i] ?? ""])),
    gift: "",
    note: "",
    showGift: true,
    showNote: true,
  };
}

export function createPricingSection(
  kind: "regular" | "private" | "custom" = "custom",
): PricingSection {
  const labels =
    kind === "regular"
      ? ["常规课", "价格", "课时", "有效期"]
      : kind === "private"
        ? ["私教", "1次", "10次"]
        : ["自定义项目", "价格", "说明"];
  const columns = labels.map((label, i) => ({
    id: id(),
    label,
    enabled: true,
    weight: i === 0 ? 1.25 : 1,
  }));
  return {
    id: id(),
    enabled: true,
    columns,
    rows: [createPricingRow(columns)],
    showGifts: true,
    showRowNotes: true,
    showNote: false,
    noteTitle: "注意事项",
    note: "",
  };
}

export function createDemoPricing(): PricingTable {
  const regular = createPricingSection("regular");
  regular.rows = [
    ["体验课", "1,500", "1", "当日"],
    ["次卡", "3,500", "1", "当日"],
    ["季卡", "36,000", "12", "4个月"],
    ["半年卡", "65,000", "24", "7个月"],
    ["年卡", "118,000", "48", "13个月"],
  ].map((values) => createPricingRow(regular.columns, values));
  regular.rows[3].gift = "舞蹈袜一双";
  regular.rows[4].gift = "舞蹈练功服一身";
  regular.showNote = true;
  regular.note = "请提前预约课程；有效期及补课安排请以校方说明为准。";
  const one = createPricingSection("private"),
    two = createPricingSection("private");
  one.columns[0].label = "一对一私教";
  one.rows = [
    ["60分钟", "10,000", "90,000"],
    ["90分钟", "14,000", "130,000"],
  ].map((values) => createPricingRow(one.columns, values));
  two.columns[0].label = "一对二私教";
  two.columns[1].label = "1次（合计）";
  two.columns[2].label = "10次（合计）";
  two.rows = [
    ["60分钟", "14,000", "130,000"],
    ["90分钟", "19,000", "180,000"],
  ].map((values) => createPricingRow(two.columns, values));
  two.showNote = true;
  two.noteTitle = "";
  two.note = "上表一对二价格为两人合计。";
  return {
    currencyLabel: "价格单位：日元 JPY",
    showCurrency: true,
    showDate: false,
    showFooterNote: false,
    sections: [regular, one, two],
    remarks: [
      {
        id: id(),
        enabled: true,
        title: "入会说明",
        text: "入会费 10,000 · 体验当日入会 5,000\n体验当日办理年卡，可免入会费。",
      },
    ],
  };
}

// Stable IDs make this a pure, repeatable view of legacy data, not a destructive migration.
export function getPricingTable(design: Design): PricingTable {
  if (design.pricingTable) return design.pricingTable;
  const sections: PricingSection[] = [];
  const groups = new Map<string, PricingSection>();
  for (const [i, price] of design.prices.entries()) {
    const category = price.category;
    let section = groups.get(category);
    if (!section) {
      const prefix = `legacy-${design.id}-${sections.length}`;
      const keys = [
        "name",
        "single",
        "packagePrice",
        "sessions",
        "validity",
      ] as const;
      section = {
        id: prefix,
        enabled: true,
        columns: keys.map((key, col) => ({
          id: `${prefix}-${key}`,
          label: [category, "单次价格", "套餐价格", "课时", "有效期"][col],
          enabled: true,
          weight: col === 0 ? 1.5 : 1,
        })),
        rows: [],
        showGifts: true,
        showRowNotes: true,
        showNote: false,
        noteTitle: "注意事项",
        note: "",
      };
      groups.set(category, section);
      sections.push(section);
    }
    const values = [
      price.name,
      price.single,
      price.packagePrice,
      price.sessions,
      price.validity,
    ];
    section.rows.push({
      id: `legacy-${design.id}-row-${i}`,
      enabled: true,
      cells: Object.fromEntries(
        section.columns.map((c, j) => [c.id, values[j]]),
      ),
      gift: "",
      note: [price.offer, price.note].filter(Boolean).join(" · "),
      showGift: true,
      showNote: true,
    });
  }
  return {
    currencyLabel: "",
    showCurrency: false,
    showDate: true,
    showFooterNote: true,
    sections,
    remarks: [],
  };
}

export function duplicatePricing(table: PricingTable): PricingTable {
  const copy = structuredClone(table);
  for (const section of copy.sections) {
    section.id = id();
    const keys = new Map(section.columns.map((c) => [c.id, id()]));
    section.columns = section.columns.map((c) => ({
      ...c,
      id: keys.get(c.id)!,
    }));
    section.rows = section.rows.map((r) => ({
      ...r,
      id: id(),
      cells: Object.fromEntries(
        Object.entries(r.cells).map(([k, v]) => [keys.get(k)!, v]),
      ),
    }));
  }
  copy.remarks = copy.remarks.map((r) => ({ ...r, id: id() }));
  return copy;
}

const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const strings = (v: Record<string, unknown>, keys: string[]) =>
  keys.every((k) => typeof v[k] === "string");
const bools = (v: Record<string, unknown>, keys: string[]) =>
  keys.every((k) => typeof v[k] === "boolean");
const identified = (v: unknown): v is Record<string, unknown> =>
  object(v) && typeof v.id === "string" && v.id.length > 0;
const unique = (items: Record<string, unknown>[]) =>
  new Set(items.map((x) => x.id)).size === items.length;
export function isPricingTable(v: unknown): v is PricingTable {
  if (
    !object(v) ||
    !strings(v, ["currencyLabel"]) ||
    !bools(v, ["showCurrency", "showDate", "showFooterNote"]) ||
    !Array.isArray(v.sections) ||
    !Array.isArray(v.remarks)
  )
    return false;
  if (
    !v.sections.every((s) => {
      if (
        !identified(s) ||
        !strings(s, ["noteTitle", "note"]) ||
        !bools(s, ["enabled", "showGifts", "showRowNotes", "showNote"]) ||
        !Array.isArray(s.columns) ||
        !Array.isArray(s.rows)
      )
        return false;
      if (
        !s.columns.every(
          (c) =>
            identified(c) &&
            strings(c, ["label"]) &&
            bools(c, ["enabled"]) &&
            typeof c.weight === "number" &&
            Number.isFinite(c.weight) &&
            c.weight >= 0.5 &&
            c.weight <= 4,
        ) ||
        !unique(s.columns)
      )
        return false;
      const keys = new Set(s.columns.map((c) => c.id));
      return (
        s.rows.every(
          (r) =>
            identified(r) &&
            strings(r, ["gift", "note"]) &&
            bools(r, ["showGift", "showNote"]) &&
            (r.enabled === undefined || typeof r.enabled === "boolean") &&
            object(r.cells) &&
            Object.keys(r.cells).length === keys.size &&
            [...keys].every((key) => Object.hasOwn(r.cells as object, key)) &&
            Object.entries(r.cells).every(
              ([k, value]) => keys.has(k) && typeof value === "string",
            ),
        ) && unique(s.rows)
      );
    }) ||
    !unique(v.sections)
  )
    return false;
  return (
    v.remarks.every(
      (r) =>
        identified(r) && strings(r, ["title", "text"]) && bools(r, ["enabled"]),
    ) && unique(v.remarks)
  );
}
