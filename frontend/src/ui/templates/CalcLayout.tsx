import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function CalcLayout({ children }: Props) {
  return <div className="calc-layout">{children}</div>;
}

