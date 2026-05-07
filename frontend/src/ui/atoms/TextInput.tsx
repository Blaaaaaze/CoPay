import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  variant?: "fw" | "default";
};

export function TextInput({ variant = "default", className, ...props }: Props) {
  const base = variant === "fw" ? "fw-base-input" : "";
  const cls = [base, className].filter(Boolean).join(" ");
  return <input {...props} className={cls} />;
}

