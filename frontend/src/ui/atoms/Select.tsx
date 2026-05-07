import type { SelectHTMLAttributes } from "react";

type Variant = "base" | "fw";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  variant?: Variant;
};

const VARIANT_CLASS: Record<Variant, string> = {
  base: "",
  fw: "fw-base-input",
};

export function Select({ variant = "base", className, ...props }: Props) {
  const cls = [VARIANT_CLASS[variant], className].filter(Boolean).join(" ");
  return <select {...props} className={cls} />;
}

