import clsx from "clsx";
import { ComponentProps } from "react";

type Props = ComponentProps<"div"> & {
  borderClassName?: string;
};
export function Paper({ className, borderClassName, children, ...props }: Props) {
  return (
    <div className={clsx("bg-c-dark rounded-2xl relative", className)} {...props}>
      {children}
      <div className={clsx("absolute size-full border-2 rounded-2xl left-2 top-2 border-c-dark -z-10", borderClassName)} />
    </div>
  );
}
