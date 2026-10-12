"use client";
import {
  cloneElement,
  isValidElement,
  useId,
  type ReactNode,
  type ReactElement,
} from "react";
import "./experience.css";
export type FeedbackTone = "neutral" | "success" | "warning" | "danger";
export function ExperienceIcon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  return (
    <img
      src={`/brand/icons/${name}.svg`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  );
}
export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: FeedbackTone;
}) {
  return <span className={`experience-pill ${tone}`}>{children}</span>;
}
export function StatusNotice({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children?: ReactNode;
  tone?: FeedbackTone;
}) {
  return (
    <div
      className={`experience-notice ${tone}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      <ExperienceIcon
        name={
          tone === "danger" || tone === "warning"
            ? "warning"
            : tone === "success"
              ? "check"
              : "quest"
        }
      />
      <div>
        <strong>{title}</strong>
        {children && <p>{children}</p>}
      </div>
    </div>
  );
}
export function LabeledField({
  label,
  children,
  help,
  error,
}: {
  label: string;
  children: ReactNode;
  help?: string;
  error?: string;
}) {
  const generated = useId();
  const child = isValidElement(children)
    ? (children as ReactElement<{
        id?: string;
        "aria-describedby"?: string;
        "aria-invalid"?: boolean;
      }>)
    : null;
  const id = child?.props.id || generated;
  const note = help || error;
  const noteId = `${id}-description`;
  return (
    <div className={`experience-field ${error ? "invalid" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {child
        ? cloneElement(child, {
            id,
            "aria-describedby":
              [child.props["aria-describedby"], note ? noteId : undefined]
                .filter(Boolean)
                .join(" ") || undefined,
            "aria-invalid": error ? true : child.props["aria-invalid"],
          })
        : children}
      {note && <small id={noteId}>{error || help}</small>}
    </div>
  );
}
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: ReactNode;
}) {
  return (
    <div className="experience-empty">
      <ExperienceIcon name="quest" size={40} />
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}
