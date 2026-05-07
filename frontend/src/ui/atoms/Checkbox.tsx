import type { InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function Checkbox(props: Props) {
  return <input {...props} type="checkbox" />;
}

