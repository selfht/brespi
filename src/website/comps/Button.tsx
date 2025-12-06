import clsx from "clsx";
import { JSX } from "react";
import { Icon } from "./Icon";

type Props = JSX.IntrinsicElements["button"] & {
  icon?: Icon.Props["variant"];
};
export function Button({ icon, className, children, ...props }: Props) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex gap-2 items-center p-2 border-2 font-bold border-c-primary rounded-lg",
        "hover:cursor-pointer hover:bg-c-dim/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {icon && <Icon variant={icon} className="size-4" />}
      {children}
    </button>
  );
}
