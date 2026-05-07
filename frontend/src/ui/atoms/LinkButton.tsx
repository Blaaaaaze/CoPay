import type { AnchorHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";

type Variant = "primary" | "ghost";

type Props = Omit<LinkProps, "className"> & {
  variant?: Variant;
  className?: string;
};

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
};

export function LinkButton({ variant = "ghost", className, ...props }: Props) {
  const cls = [VARIANT_CLASS[variant], className].filter(Boolean).join(" ");
  return <Link {...props} className={cls} />;
}

type ExternalProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
};

export function ExternalLinkButton({ variant = "ghost", className, ...props }: ExternalProps) {
  const cls = [VARIANT_CLASS[variant], className].filter(Boolean).join(" ");
  return <a {...props} className={cls} />;
}

