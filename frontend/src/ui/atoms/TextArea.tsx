import type { TextareaHTMLAttributes } from "react";

type Variant = "base" | "fw";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  variant?: Variant;
};

const VARIANT_CLASS: Record<Variant, string> = {
  base: "",
  fw: "fw-base-input",
};

export function TextArea({ variant = "base", className, ...props }: Props) {
  const cls = [VARIANT_CLASS[variant], className].filter(Boolean).join(" ");
  return <textarea {...props} className={cls} />;
}

