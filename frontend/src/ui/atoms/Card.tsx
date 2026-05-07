import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ className, children, ...props }: Props) {
  const cls = ["card", className].filter(Boolean).join(" ");
  return (
    <div {...props} className={cls}>
      {children}
    </div>
  );
}

