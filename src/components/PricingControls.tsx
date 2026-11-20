import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { UtilityDialog } from "./UtilityDialog";

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="check-field" onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label.replace(/^分区 \d+(?: 项目 \d+)? /, "")}</span>
    </label>
  );
}

export function Actions({
  label,
  index,
  total,
  move,
  remove,
  onDetails,
}: {
  label: string;
  index: number;
  total: number;
  move: (delta: number) => void;
  remove: () => void;
  onDetails?: (trigger: HTMLButtonElement | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const run = (action: () => void) => {
    setOpen(false);
    action();
  };
  return (
    <span className="pricing-actions" onClick={(e) => e.stopPropagation()}>
      <button
        ref={trigger}
        className="icon-button"
        aria-label={`${label}更多操作`}
        title="更多操作"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <MoreHorizontal size={17} />
      </button>
      {open &&
        createPortal(
          <UtilityDialog title={`${label}操作`} onClose={() => setOpen(false)}>
            <div className="pricing-menu-actions">
              {onDetails && (
                <button
                  className="secondary-button full"
                  onClick={() => run(() => onDetails?.(trigger.current))}
                >
                  编辑赠品与备注
                </button>
              )}
              <button
                className="secondary-button full"
                aria-label={`上移${label}`}
                disabled={index === 0}
                onClick={() => run(() => move(-1))}
              >
                <ArrowUp size={15} />
                上移
              </button>
              <button
                className="secondary-button full"
                aria-label={`下移${label}`}
                disabled={index === total - 1}
                onClick={() => run(() => move(1))}
              >
                <ArrowDown size={15} />
                下移
              </button>
              <button
                className="secondary-button full"
                aria-label={`删除${label}`}
                onClick={() => run(remove)}
              >
                <Trash2 size={15} />
                删除（可恢复前次编辑）
              </button>
            </div>
          </UtilityDialog>,
          document.body,
        )}
    </span>
  );
}

export function Fold({
  children,
  summary,
  initiallyOpen = false,
  className = "",
}: {
  children: ReactNode;
  summary: ReactNode;
  initiallyOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <details
      className={`edit-item ${className}`}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        {summary}
        <ChevronDown className="details-chevron" size={15} />
      </summary>
      <div className="item-fields">{children}</div>
    </details>
  );
}

export function moved<T>(items: T[], index: number, delta: number) {
  const next = [...items];
  if (index + delta < 0 || index + delta >= next.length) return next;
  [next[index], next[index + delta]] = [next[index + delta], next[index]];
  return next;
}
