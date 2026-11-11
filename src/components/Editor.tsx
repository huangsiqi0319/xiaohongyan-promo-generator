import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import type { Design, Price } from "../types";
import { DAYS, uid } from "../lib/model";
import { Field, SectionHeading, TextField } from "./Fields";
import { useState } from "react";
import { getScheduleStyle } from "../lib/schedule-layout";

export function Editor({
  design: d,
  onChange,
}: {
  design: Design;
  onChange: (patch: Partial<Design>) => void;
}) {
  const [openIds, setOpenIds] = useState(
    new Set<string>([d.courses[0]?.id, d.prices[0]?.id].filter(Boolean)),
  );
  const [tab, setTab] = useState<"content" | "style">("content");
  const scheduleStyle = getScheduleStyle(d);
  const patchCourse = (id: string, patch: object) =>
    onChange({
      courses: d.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  const patchPrice = (id: string, patch: Partial<Price>) =>
    onChange({
      prices: d.prices.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  const movePrice = (index: number, delta: number) => {
    const rows = [...d.prices];
    [rows[index], rows[index + delta]] = [rows[index + delta], rows[index]];
    onChange({ prices: rows });
  };

  return (
    <>
      <div className="editor-tabs">
        <button
          className={tab === "content" ? "active" : ""}
          onClick={() => setTab("content")}
        >
          编辑内容
        </button>
        <button
          className={tab === "style" ? "active" : ""}
          onClick={() => setTab("style")}
        >
          版式与风格
        </button>
      </div>
      {tab === "content" ? (
        <div className="editor-content">
          <section className="form-section">
            <SectionHeading number="01" title="基本信息" />
            <TextField
              label="项目名称"
              value={d.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
            <TextField
              label="物料标题"
              value={d.title}
              onChange={(e) => onChange({ title: e.target.value })}
            />
            <TextField
              label={d.kind === "event" ? "主题 / 日期范围" : "日期范围"}
              value={d.dateRange}
              onChange={(e) => onChange({ dateRange: e.target.value })}
            />
          </section>
          <section className="form-section">
            <SectionHeading
              number="02"
              title={
                d.kind === "schedule"
                  ? "课程安排"
                  : d.kind === "pricing"
                    ? "价格项目"
                    : "活动内容"
              }
              meta={
                d.kind !== "event" && (
                  <span className="count-label">
                    {d.kind === "schedule" ? d.courses.length : d.prices.length}{" "}
                    项
                  </span>
                )
              }
            />
            {d.kind === "schedule" && (
              <>
                <p className="section-help">预览自动按星期和时间排列。</p>
                <div className="item-list">
                  {d.courses.map((c, i) => (
                    <details
                      className="edit-item"
                      key={c.id}
                      open={openIds.has(c.id)}
                      onToggle={(e) => {
                        const open = e.currentTarget.open;
                        setOpenIds((ids) => {
                          const next = new Set(ids);
                          if (open) next.add(c.id);
                          else next.delete(c.id);
                          return next;
                        });
                      }}
                    >
                      <summary>
                        <span className="row-number">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="item-summary">
                          <strong>{c.name || "新课程"}</strong>
                          <small>
                            {DAYS[c.day - 1]} · {c.time}–{c.endTime}
                          </small>
                        </span>
                        <button
                          className="icon-button"
                          aria-label={`删除课程 ${i + 1}`}
                          onClick={(e) => {
                            e.preventDefault();
                            onChange({
                              courses: d.courses.filter((x) => x.id !== c.id),
                            });
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                        <ChevronDown className="details-chevron" size={15} />
                      </summary>
                      <div className="item-fields">
                        <TextField
                          label={`课程 ${i + 1} 名称`}
                          value={c.name}
                          onChange={(e) =>
                            patchCourse(c.id, { name: e.target.value })
                          }
                        />
                        <div className="form-grid three">
                          <Field label="星期">
                            <select
                              aria-label={`课程 ${i + 1} 星期`}
                              value={c.day}
                              onChange={(e) =>
                                patchCourse(c.id, {
                                  day: Number(e.target.value),
                                })
                              }
                            >
                              {DAYS.map((day, index) => (
                                <option value={index + 1} key={day}>
                                  {day}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <TextField
                            label="开始时间"
                            aria-label={`课程 ${i + 1} 开始时间`}
                            type="time"
                            value={c.time}
                            onChange={(e) => {
                              if (e.target.value)
                                patchCourse(c.id, { time: e.target.value });
                            }}
                          />
                          <TextField
                            label="结束时间"
                            aria-label={`课程 ${i + 1} 结束时间`}
                            type="time"
                            value={c.endTime}
                            onChange={(e) => {
                              if (e.target.value)
                                patchCourse(c.id, { endTime: e.target.value });
                            }}
                          />
                        </div>
                        <div className="form-grid">
                          <TextField
                            label="授课教师"
                            aria-label={`课程 ${i + 1} 教师`}
                            value={c.teacher}
                            onChange={(e) =>
                              patchCourse(c.id, { teacher: e.target.value })
                            }
                          />
                          <TextField
                            label="教室"
                            aria-label={`课程 ${i + 1} 教室`}
                            value={c.room}
                            onChange={(e) =>
                              patchCourse(c.id, { room: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
                <button
                  className="add-row"
                  onClick={() => {
                    const id = uid();
                    setOpenIds((ids) => new Set([...ids, id]));
                    onChange({
                      courses: [
                        ...d.courses,
                        {
                          id,
                          day: 1,
                          time: "18:30",
                          endTime: "20:00",
                          name: "新课程",
                          teacher: "",
                          room: "",
                        },
                      ],
                    });
                  }}
                >
                  <Plus size={16} />
                  添加课程
                </button>
              </>
            )}
            {d.kind === "pricing" && (
              <>
                <p className="section-help">
                  用上下箭头调整顺序，价格可填写数字或文字。
                </p>
                <div className="item-list">
                  {d.prices.map((p, i) => (
                    <details
                      className="edit-item"
                      key={p.id}
                      open={openIds.has(p.id)}
                      onToggle={(e) => {
                        const open = e.currentTarget.open;
                        setOpenIds((ids) => {
                          const next = new Set(ids);
                          if (open) next.add(p.id);
                          else next.delete(p.id);
                          return next;
                        });
                      }}
                    >
                      <summary>
                        <span className="row-number">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="item-summary">
                          <strong>{p.name || "新价格项目"}</strong>
                          <small>
                            {p.category} · 套餐 {p.packagePrice || "待填写"}
                          </small>
                        </span>
                        <button
                          className="icon-button"
                          disabled={i === 0}
                          aria-label={`上移价格 ${i + 1}`}
                          onClick={(e) => {
                            e.preventDefault();
                            movePrice(i, -1);
                          }}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          className="icon-button"
                          disabled={i === d.prices.length - 1}
                          aria-label={`下移价格 ${i + 1}`}
                          onClick={(e) => {
                            e.preventDefault();
                            movePrice(i, 1);
                          }}
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`删除价格 ${i + 1}`}
                          onClick={(e) => {
                            e.preventDefault();
                            onChange({
                              prices: d.prices.filter((x) => x.id !== p.id),
                            });
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                        <ChevronDown className="details-chevron" size={15} />
                      </summary>
                      <div className="item-fields">
                        <div className="form-grid">
                          <TextField
                            label="价格类别"
                            aria-label={`价格 ${i + 1} 类别`}
                            value={p.category}
                            onChange={(e) =>
                              patchPrice(p.id, { category: e.target.value })
                            }
                          />
                          <TextField
                            label={`课程 ${i + 1} 名称`}
                            value={p.name}
                            onChange={(e) =>
                              patchPrice(p.id, { name: e.target.value })
                            }
                          />
                        </div>
                        <div className="form-grid">
                          <TextField
                            label="单次价格"
                            aria-label={`价格 ${i + 1} 单次`}
                            value={p.single}
                            onChange={(e) =>
                              patchPrice(p.id, { single: e.target.value })
                            }
                          />
                          <TextField
                            label="套餐价格"
                            aria-label={`价格 ${i + 1} 套餐`}
                            value={p.packagePrice}
                            onChange={(e) =>
                              patchPrice(p.id, { packagePrice: e.target.value })
                            }
                          />
                        </div>
                        <div className="form-grid">
                          <TextField
                            label="课时数量"
                            aria-label={`价格 ${i + 1} 课时`}
                            value={p.sessions}
                            onChange={(e) =>
                              patchPrice(p.id, { sessions: e.target.value })
                            }
                          />
                          <TextField
                            label="有效期限"
                            aria-label={`价格 ${i + 1} 有效期`}
                            value={p.validity}
                            onChange={(e) =>
                              patchPrice(p.id, { validity: e.target.value })
                            }
                          />
                        </div>
                        <TextField
                          label="优惠 / 套餐说明"
                          aria-label={`价格 ${i + 1} 优惠说明`}
                          value={p.offer}
                          onChange={(e) =>
                            patchPrice(p.id, { offer: e.target.value })
                          }
                        />
                        <TextField
                          label="项目备注"
                          aria-label={`价格 ${i + 1} 备注`}
                          value={p.note}
                          onChange={(e) =>
                            patchPrice(p.id, { note: e.target.value })
                          }
                        />
                      </div>
                    </details>
                  ))}
                </div>
                <button
                  className="add-row"
                  onClick={() => {
                    const id = uid();
                    setOpenIds((ids) => new Set([...ids, id]));
                    onChange({
                      prices: [
                        ...d.prices,
                        {
                          id,
                          category: "",
                          name: "新价格项目",
                          single: "",
                          packagePrice: "",
                          sessions: "",
                          offer: "",
                          validity: "",
                          note: "",
                        },
                      ],
                    });
                  }}
                >
                  <Plus size={16} />
                  添加价格项目
                </button>
              </>
            )}
            {d.kind === "event" && (
              <div className="event-fields">
                <TextField
                  label="副标题"
                  value={d.event.subtitle}
                  onChange={(e) =>
                    onChange({
                      event: { ...d.event, subtitle: e.target.value },
                    })
                  }
                />
                <Field label="活动介绍">
                  <textarea
                    rows={4}
                    value={d.event.description}
                    onChange={(e) =>
                      onChange({
                        event: { ...d.event, description: e.target.value },
                      })
                    }
                  />
                </Field>
                {(
                  [
                    ["date", "活动日期"],
                    ["time", "活动时间"],
                    ["location", "活动地点"],
                    ["price", "活动价格"],
                    ["teacher", "授课教师"],
                    ["registration", "报名方式"],
                  ] as const
                ).map(([key, label]) => (
                  <TextField
                    key={key}
                    label={label}
                    value={d.event[key]}
                    onChange={(e) =>
                      onChange({ event: { ...d.event, [key]: e.target.value } })
                    }
                  />
                ))}
                <p className="section-help">
                  人物照片和报名二维码可在「品牌素材」中上传，均为可选。
                </p>
              </div>
            )}
          </section>
          <section className="form-section">
            <SectionHeading number="03" title="补充说明" />
            <Field label="底部备注">
              <textarea
                value={d.note}
                rows={3}
                onChange={(e) => onChange({ note: e.target.value })}
              />
            </Field>
            <label className="check-field">
              <input
                type="checkbox"
                checked={d.demo}
                onChange={(e) => onChange({ demo: e.target.checked })}
              />
              <span>在图片中保留「演示数据」标识</span>
            </label>
            <p className="section-help">
              示例课程与价格不代表机构实际安排及收费。
            </p>
          </section>
        </div>
      ) : (
        <div className="editor-content">
          {d.kind === "schedule" && (
            <section className="form-section">
              <SectionHeading title="单行排版与字号" />
              <Field label="字号模式">
                <select
                  aria-label="字号模式"
                  value={scheduleStyle.mode}
                  onChange={(e) =>
                    onChange({
                      scheduleStyle: {
                        ...scheduleStyle,
                        mode: e.target.value as "auto" | "manual",
                        fontSize:
                          e.target.value === "auto"
                            ? Math.max(18, scheduleStyle.fontSize)
                            : scheduleStyle.fontSize,
                      },
                    })
                  }
                >
                  <option value="auto">自动适配单行</option>
                  <option value="manual">手动字号</option>
                </select>
              </Field>
              <Field
                label={`${scheduleStyle.mode === "auto" ? "字号上限" : "手动字号"} · ${scheduleStyle.fontSize} px`}
                hint={
                  scheduleStyle.mode === "auto"
                    ? "按最长字段统一缩小，最低18px；整节课保持一行。"
                    : "使用你指定的字号。放不下时会提示，不会省略文字。"
                }
              >
                <input
                  aria-label="课表字号"
                  type="range"
                  min={scheduleStyle.mode === "auto" ? 18 : 16}
                  max="32"
                  step="1"
                  value={scheduleStyle.fontSize}
                  onChange={(e) =>
                    onChange({
                      scheduleStyle: {
                        ...scheduleStyle,
                        fontSize: Number(e.target.value),
                      },
                    })
                  }
                />
              </Field>
              <Field
                label={`课程栏宽度 · ${scheduleStyle.courseWidth}%`}
                hint="课程栏加宽后，教师与教室栏会相应变窄。"
              >
                <input
                  aria-label="课程栏宽度"
                  type="range"
                  min="40"
                  max="54"
                  step="1"
                  value={scheduleStyle.courseWidth}
                  onChange={(e) =>
                    onChange({
                      scheduleStyle: {
                        ...scheduleStyle,
                        courseWidth: Number(e.target.value),
                      },
                    })
                  }
                />
              </Field>
              <Field label={`行间距 · ${scheduleStyle.rowGap} px`}>
                <input
                  aria-label="课表行间距"
                  type="range"
                  min="12"
                  max="44"
                  step="1"
                  value={scheduleStyle.rowGap}
                  onChange={(e) =>
                    onChange({
                      scheduleStyle: {
                        ...scheduleStyle,
                        rowGap: Number(e.target.value),
                      },
                    })
                  }
                />
              </Field>
              <button
                className="secondary-button full"
                onClick={() =>
                  onChange({
                    scheduleStyle: {
                      mode: "auto",
                      fontSize: 28,
                      courseWidth: 46,
                      rowGap: d.layout === "airy" ? 32 : 24,
                    },
                  })
                }
              >
                恢复自动排版
              </button>
              <p className="section-help" style={{ marginTop: 12 }}>
                以上字号为1080px导出图片中的实际大小。星期、时间、课名、教师、教室各占一列，不换行。
              </p>
            </section>
          )}
          <section className="form-section">
            <SectionHeading number="01" title="品牌版式" />
            <p className="section-help">两种排版，同一种小鸿雁的气质。</p>
            <div className="layout-options">
              {(["editorial", "airy"] as const).map((layout) => (
                <button
                  key={layout}
                  className={`layout-option ${d.layout === layout ? "selected" : ""}`}
                  onClick={() => onChange({ layout })}
                >
                  <div className={`mini-layout ${layout}`}>
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <strong>{layout === "editorial" ? "雅序" : "留白"}</strong>
                  <span>
                    {layout === "editorial"
                      ? "清晰有序 · 信息丰富"
                      : "轻盈舒展 · 从容表达"}
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section className="form-section">
            <SectionHeading number="02" title="背景融合" />
            <Field
              label={`雾白遮罩 · ${d.mist}%`}
              hint="增加遮罩可提高文字清晰度，原图不会被修改。"
            >
              <input
                aria-label="雾白遮罩"
                type="range"
                min="0"
                max="100"
                value={d.mist}
                onChange={(e) => onChange({ mist: Number(e.target.value) })}
              />
            </Field>
            <Field label="水平裁切位置">
              <input
                aria-label="水平裁切位置"
                type="range"
                min="0"
                max="100"
                value={d.cropX}
                onChange={(e) => onChange({ cropX: Number(e.target.value) })}
              />
            </Field>
            <Field label="垂直裁切位置">
              <input
                aria-label="垂直裁切位置"
                type="range"
                min="0"
                max="100"
                value={d.cropY}
                onChange={(e) => onChange({ cropY: Number(e.target.value) })}
              />
            </Field>
            <p className="section-help">
              前往左侧「品牌素材」选择背景、上传
              Logo。课程表和价目表不使用人物照片。
            </p>
          </section>
          <section className="form-section">
            <SectionHeading number="03" title="品牌规范" />
            <div className="palette">
              <span style={{ background: "#f4f1eb" }} />
              <span style={{ background: "#e7d9d6" }} />
              <span style={{ background: "#a6b7bb" }} />
              <span style={{ background: "#8f8074" }} />
            </div>
            <p className="section-help">雾白 · 柔粉 · 灰蓝 · 暖灰褐</p>
            <div className="font-sample">
              <strong>以舞为诗，向美而生。</strong>
              <small>Noto Serif SC 标题 / Noto Sans SC 正文</small>
            </div>
            <p className="section-help">字体与品牌色自动沿用，无需反复设置。</p>
          </section>
        </div>
      )}
    </>
  );
}
