import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function PageHero({ children }: Props) {
  return <div className="container page-hero">{children}</div>;
}

