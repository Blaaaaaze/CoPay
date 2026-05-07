import type { ButtonHTMLAttributes } from "react";

type Variant = "bare" | "primary" | "ghost" | "fw" | "fwAdd" | "fwDel" | "fwEdit" | "fwDownload";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const VARIANT_CLASS: Record<Variant, string> = {
  bare: "",
  primary: "btn-primary",
  ghost: "btn-ghost",
  fw: "fw-btn",
  fwAdd: "fw-btn fw-btn-add",
  fwDel: "fw-btn fw-btn-del",
  fwEdit: "fw-btn fw-btn-edit",
  fwDownload: "fw-btn fw-btn-download",
};

export function Button({ variant = "ghost", className, ...props }: Props) {
  const cls = [VARIANT_CLASS[variant], className].filter(Boolean).join(" ");
  return <button {...props} className={cls} />;
}

