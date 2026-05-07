import { forwardRef, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  hidden?: boolean;
};

export const FileInput = forwardRef<HTMLInputElement, Props>(function FileInput(
  { className, hidden, ...props },
  ref
) {
  const cls = className;
  return <input {...props} ref={ref} type="file" hidden={hidden} className={cls} />;
});

