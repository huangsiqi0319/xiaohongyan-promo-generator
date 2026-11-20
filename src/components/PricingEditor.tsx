import { useState } from "react";
import { Plus } from "lucide-react";
import type { Design, PricingSection, PricingTable } from "../types";
import {
  createPricingRow,
  createPricingSection,
  getPricingTable,
} from "../lib/pricing";
import { Field, TextField } from "./Fields";
import { Actions, Fold, moved, Toggle } from "./PricingControls";
import { PricingRowsEditor } from "./PricingRowsEditor";

export function PricingEditor({
  design: d,
  onChange,
}: {
  design: Design;
  onChange: (patch: Partial<Design>) => void;
}) {
  const table = getPricingTable(d);
  const [newSections, setNewSections] = useState(new Set<string>());
  const [newRemarks, setNewRemarks] = useState(new Set<string>());
  const save = (patch: Partial<PricingTable>) =>
    onChange({ pricingTable: { ...table, ...patch } });
  const change = (id: string, patch: Partial<PricingSection>) =>
    save({
      sections: table.sections.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    });
  const addSection = (kind: "regular" | "private" | "custom") => {
    const s = createPricingSection(kind);
    setNewSections((ids) => new Set([...ids, s.id]));
    save({ sections: [...table.sections, s] });
  };
  return (
    <div className="pricing-editor">
      <p className="section-help">
        表头、行列和说明都可修改。取消勾选仅隐藏，重新勾选会恢复原内容。
      </p>
      {!d.pricingTable && (
        <p className="pricing-migration-note">
          已按原类别整理旧价目，原有价格和备注均保留。编辑后自动保存为新表格。
        </p>
      )}
      <Fold
        className="pricing-meta"
        summary={
          <span className="item-summary">
            <strong>货币与日期</strong>
            <small>按需设置显示内容</small>
          </span>
        }
      >
        <Toggle
          label="显示货币说明"
          checked={table.showCurrency}
          onChange={(showCurrency) => save({ showCurrency })}
        />
        <TextField
          label="货币说明"
          placeholder="例如：价格单位：日元 JPY"
          value={table.currencyLabel}
          onChange={(e) => save({ currencyLabel: e.target.value })}
        />
        <Toggle
          label="显示日期范围"
          checked={table.showDate}
          onChange={(showDate) => save({ showDate })}
        />
      </Fold>
      <div className="item-list">
        {table.sections.map((s, i) => {
          const prefix = `分区 ${i + 1}`;
          return (
            <Fold
              key={s.id}
              className="pricing-section"
              initiallyOpen={i === 0 || newSections.has(s.id)}
              summary={
                <>
                  <label
                    className="pricing-summary-check"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      aria-label={`显示${prefix}`}
                      checked={s.enabled}
                      onChange={(e) =>
                        change(s.id, { enabled: e.target.checked })
                      }
                    />
                  </label>
                  <span className="item-summary">
                    <strong>{s.columns[0]?.label || "未命名分区"}</strong>
                    <small>
                      {s.enabled
                        ? `${s.rows.length} 项 · ${s.columns.filter((c) => c.enabled).length} 列显示`
                        : "已隐藏 · 内容保留"}
                    </small>
                  </span>
                  <Actions
                    label={prefix}
                    index={i}
                    total={table.sections.length}
                    move={(delta) =>
                      save({ sections: moved(table.sections, i, delta) })
                    }
                    remove={() =>
                      save({
                        sections: table.sections.filter((x) => x.id !== s.id),
                      })
                    }
                  />
                </>
              }
            >
              <h3 className="pricing-subheading">表头与列</h3>
              <p className="section-help">
                首列表头也是分区名称。列宽按比例分配，隐藏后自动补齐。
              </p>
              <div className="pricing-column-head field-label">
                <span>显示</span>
                <span>栏目名称</span>
                <span>列宽</span>
                <span />
              </div>
              <div className="pricing-columns">
                {s.columns.map((c, j) => (
                  <div className="pricing-column" key={c.id}>
                    <div className="pricing-column-top">
                      <input
                        type="checkbox"
                        aria-label={`显示${prefix} 第 ${j + 1} 列`}
                        title="显示此列"
                        checked={c.enabled}
                        onChange={(e) =>
                          change(s.id, {
                            columns: s.columns.map((x) =>
                              x.id === c.id
                                ? { ...x, enabled: e.target.checked }
                                : x,
                            ),
                          })
                        }
                      />
                      <input
                        aria-label={`${prefix} 第 ${j + 1} 列表头`}
                        placeholder="表头名称"
                        value={c.label}
                        onChange={(e) =>
                          change(s.id, {
                            columns: s.columns.map((x) =>
                              x.id === c.id
                                ? { ...x, label: e.target.value }
                                : x,
                            ),
                          })
                        }
                      />
                      <label className="pricing-column-width">
                        <span className="sr-only">宽度比例</span>
                        <input
                          type="number"
                          min="0.5"
                          max="4"
                          step="0.25"
                          aria-label={`${prefix} 第 ${j + 1} 列宽度`}
                          value={c.weight}
                          onChange={(e) => {
                            const weight = Number(e.target.value);
                            if (
                              Number.isFinite(weight) &&
                              weight >= 0.5 &&
                              weight <= 4
                            )
                              change(s.id, {
                                columns: s.columns.map((x) =>
                                  x.id === c.id ? { ...x, weight } : x,
                                ),
                              });
                          }}
                        />
                      </label>
                      <Actions
                        label={`${prefix} 第 ${j + 1} 列`}
                        index={j}
                        total={s.columns.length}
                        move={(delta) =>
                          change(s.id, { columns: moved(s.columns, j, delta) })
                        }
                        remove={() =>
                          change(s.id, {
                            columns: s.columns.filter((x) => x.id !== c.id),
                            rows: s.rows.map((r) => ({
                              ...r,
                              cells: Object.fromEntries(
                                Object.entries(r.cells).filter(
                                  ([k]) => k !== c.id,
                                ),
                              ),
                            })),
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="add-row"
                aria-label={`${prefix} 添加列`}
                onClick={() => {
                  const id = crypto.randomUUID();
                  change(s.id, {
                    columns: [
                      ...s.columns,
                      { id, label: "新栏目", enabled: true, weight: 1 },
                    ],
                    rows: s.rows.map((r) => ({
                      ...r,
                      cells: { ...r.cells, [id]: "" },
                    })),
                  });
                }}
              >
                <Plus size={15} />
                添加列
              </button>
              {!s.columns.some((c) => c.enabled) && (
                <p className="pricing-migration-note">
                  所有列已隐藏，此分区不会出现在图片中。
                </p>
              )}
              <div className="pricing-row-heading">
                <h3 className="pricing-subheading">价格内容</h3>
                <span>{s.rows.length} 项</span>
              </div>
              <PricingRowsEditor
                section={s}
                prefix={prefix}
                onChange={(patch) => change(s.id, patch)}
              />
              <button
                className="add-row"
                aria-label={`${prefix} 添加项目`}
                onClick={() => {
                  const row = createPricingRow(s.columns);
                  change(s.id, { rows: [...s.rows, row] });
                }}
              >
                <Plus size={15} />
                添加价格项目
              </button>
              <Fold
                className="pricing-section-options"
                summary={
                  <span className="item-summary">
                    <strong>赠品与说明</strong>
                    <small>显示开关及分区附注</small>
                  </span>
                }
              >
                <Toggle
                  label={`${prefix} 显示赠品`}
                  checked={s.showGifts}
                  onChange={(showGifts) => change(s.id, { showGifts })}
                />
                <Toggle
                  label={`${prefix} 显示项目备注`}
                  checked={s.showRowNotes}
                  onChange={(showRowNotes) => change(s.id, { showRowNotes })}
                />
                <p className="section-help">
                  以上是本分区总开关，每个项目还可单独设置。
                </p>
                <Toggle
                  label={`${prefix} 显示附注`}
                  checked={s.showNote}
                  onChange={(showNote) => change(s.id, { showNote })}
                />
                {s.showNote && (
                  <>
                    <TextField
                      label="附注标题"
                      aria-label={`${prefix} 附注标题`}
                      value={s.noteTitle}
                      onChange={(e) =>
                        change(s.id, { noteTitle: e.target.value })
                      }
                    />
                    <Field label="附注内容">
                      <textarea
                        aria-label={`${prefix} 附注内容`}
                        rows={3}
                        value={s.note}
                        onChange={(e) => change(s.id, { note: e.target.value })}
                      />
                    </Field>
                  </>
                )}
              </Fold>
            </Fold>
          );
        })}
      </div>
      <div className="pricing-add-sections">
        <button
          className="secondary-button"
          onClick={() => addSection("regular")}
        >
          <Plus size={14} />
          添加常规课分区
        </button>
        <button
          className="secondary-button"
          onClick={() => addSection("private")}
        >
          <Plus size={14} />
          添加私教分区
        </button>
        <button
          className="secondary-button"
          onClick={() => addSection("custom")}
        >
          <Plus size={14} />
          添加自定义分区
        </button>
      </div>
      <div className="pricing-row-heading">
        <h3 className="pricing-subheading">自由补充说明</h3>
      </div>
      <p className="section-help">
        入会费、体验费及其他备注均可新增、改名或隐藏。
      </p>
      <div className="item-list">
        {table.remarks.map((r, i) => (
          <Fold
            key={r.id}
            initiallyOpen={newRemarks.has(r.id)}
            summary={
              <>
                <label
                  className="pricing-summary-check"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    aria-label={`显示说明 ${i + 1}`}
                    checked={r.enabled}
                    onChange={(e) =>
                      save({
                        remarks: table.remarks.map((x) =>
                          x.id === r.id
                            ? { ...x, enabled: e.target.checked }
                            : x,
                        ),
                      })
                    }
                  />
                </label>
                <span className="item-summary">
                  <strong>{r.title || "未命名说明"}</strong>
                  <small>
                    {r.enabled ? "显示在价目表底部" : "已隐藏 · 内容保留"}
                  </small>
                </span>
                <Actions
                  label={`说明 ${i + 1}`}
                  index={i}
                  total={table.remarks.length}
                  move={(delta) =>
                    save({ remarks: moved(table.remarks, i, delta) })
                  }
                  remove={() =>
                    save({
                      remarks: table.remarks.filter((x) => x.id !== r.id),
                    })
                  }
                />
              </>
            }
          >
            <TextField
              label="说明标题"
              aria-label={`说明 ${i + 1} 标题`}
              value={r.title}
              onChange={(e) =>
                save({
                  remarks: table.remarks.map((x) =>
                    x.id === r.id ? { ...x, title: e.target.value } : x,
                  ),
                })
              }
            />
            <Field label="说明内容">
              <textarea
                rows={4}
                aria-label={`说明 ${i + 1} 内容`}
                value={r.text}
                onChange={(e) =>
                  save({
                    remarks: table.remarks.map((x) =>
                      x.id === r.id ? { ...x, text: e.target.value } : x,
                    ),
                  })
                }
              />
            </Field>
          </Fold>
        ))}
      </div>
      <button
        className="add-row"
        onClick={() => {
          const id = crypto.randomUUID();
          setNewRemarks((ids) => new Set([...ids, id]));
          save({
            remarks: [
              ...table.remarks,
              { id, enabled: true, title: "补充说明", text: "" },
            ],
          });
        }}
      >
        <Plus size={15} />
        添加补充说明
      </button>
    </div>
  );
}
