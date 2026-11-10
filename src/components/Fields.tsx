import type { InputHTMLAttributes, ReactNode } from "react";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function TextField({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      <input {...props} />
    </Field>
  );
}
export function SectionHeading({
  number,
  title,
  meta,
}: {
  number?: string;
  title: string;
  meta?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <h2>
        {number && <span>{number}</span>}
        {title}
      </h2>
      {meta}
    </div>
  );
}
