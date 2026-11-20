import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { PricingRow, PricingSection } from "../types";
import { Actions, moved, Toggle } from "./PricingControls";
import { Field, TextField } from "./Fields";
import { UtilityDialog } from "./UtilityDialog";

export function PricingRowsEditor({
  section: s,
  prefix,
  onChange,
}: {
  section: PricingSection;
  prefix: string;
  onChange: (patch: Partial<PricingSection>) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (editingId !== null || !returnFocus.current) return;
    const trigger = returnFocus.current;
    returnFocus.current = null;
    if (trigger.isConnected) trigger.focus({ preventScroll: true });
  }, [editingId]);
  const change = (id: string, patch: Partial<PricingRow>) =>
    onChange({
      rows: s.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  const row = s.rows.find((r) => r.id === editingId),
    index = s.rows.findIndex((r) => r.id === editingId);
  return (
    <>
      <p className="pricing-scroll-hint section-help">
        左右滑动查看全部列，点「…」编辑赠品与备注。
      </p>
      <div
        className="pricing-grid-scroll"
        role="region"
        aria-label={`${prefix} 价格内容`}
        tabIndex={0}
      >
        <table
          className="pricing-data-table"
          style={
            {
              "--pricing-value-columns": Math.max(0, s.columns.length - 1),
            } as CSSProperties
          }
        >
          <thead>
            <tr>
              <th scope="col" className="field-label">
                显示
              </th>
              {s.columns.map((c, i) => (
                <th key={c.id} scope="col" className="field-label">
                  {c.label || `第${i + 1}列`}
                  {!c.enabled && <small>（已隐藏）</small>}
                </th>
              ))}
              <th scope="col" className="field-label">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {s.rows.map((r, j) => (
              <tr className="pricing-row" key={r.id}>
                <td>
                  <label className="pricing-summary-check">
                    <input
                      type="checkbox"
                      aria-label={`显示${prefix} 项目 ${j + 1}`}
                      checked={r.enabled !== false}
                      onChange={(e) =>
                        change(r.id, { enabled: e.target.checked })
                      }
                    />
                  </label>
                </td>
                {s.columns.map((c, k) => (
                  <td key={c.id}>
                    <div className="pricing-cell-fields">
                      <label className="field pricing-grid-field">
                        <span className="sr-only">
                          {c.label || `第${k + 1}列`}
                        </span>
                        <input
                          aria-label={`${prefix} 项目 ${j + 1} 第 ${k + 1} 列`}
                          value={r.cells[c.id] ?? ""}
                          onChange={(e) =>
                            change(r.id, {
                              cells: { ...r.cells, [c.id]: e.target.value },
                            })
                          }
                        />
                      </label>
                    </div>
                  </td>
                ))}
                <td>
                  <Actions
                    label={`${prefix} 项目 ${j + 1}`}
                    index={j}
                    total={s.rows.length}
                    move={(delta) =>
                      onChange({ rows: moved(s.rows, j, delta) })
                    }
                    remove={() =>
                      onChange({ rows: s.rows.filter((x) => x.id !== r.id) })
                    }
                    onDetails={(trigger) => {
                      returnFocus.current = trigger;
                      setEditingId(r.id);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {row && (
        <UtilityDialog
          title={`${prefix} 项目 ${index + 1} 赠品与备注`}
          onClose={() => setEditingId(null)}
          className="pricing-extra-dialog"
        >
          <div className="item-fields">
            <p className="section-help">
              {row.cells[s.columns[0]?.id] || `项目 ${index + 1}`}
            </p>
            <Toggle
              label={`${prefix} 项目 ${index + 1} 显示赠品`}
              checked={row.showGift}
              onChange={(showGift) => change(row.id, { showGift })}
            />
            <TextField
              label="赠品内容"
              aria-label={`${prefix} 项目 ${index + 1} 赠品`}
              value={row.gift}
              onChange={(e) => change(row.id, { gift: e.target.value })}
            />
            <Toggle
              label={`${prefix} 项目 ${index + 1} 显示备注`}
              checked={row.showNote}
              onChange={(showNote) => change(row.id, { showNote })}
            />
            <Field label="项目备注">
              <textarea
                aria-label={`${prefix} 项目 ${index + 1} 备注`}
                rows={3}
                value={row.note}
                onChange={(e) => change(row.id, { note: e.target.value })}
              />
            </Field>
            <p className="section-help">
              分区的赠品、项目备注总开关也需开启，才会显示在成图中。
            </p>
            <button
              className="primary-button full"
              onClick={() => setEditingId(null)}
            >
              完成
            </button>
          </div>
        </UtilityDialog>
      )}
    </>
  );
}
