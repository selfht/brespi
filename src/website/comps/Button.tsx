import clsx from "clsx";
import { JSX } from "react";
import { Icon } from "./Icon";

type Props = JSX.IntrinsicElements["button"] & {
  icon?: Icon.Props["variant"];
  theme?: "success" | "error" | "info";
};
export function Button({ icon, theme, className, children, ...props }: Props) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex gap-2 items-center p-2 border-2 font-bold border-c-primary rounded-lg",
        "hover:cursor-pointer hover:bg-c-dim/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        {
          "border-c-success/80! text-c-success hover:bg-c-success/30": theme === "success",
          "border-c-error! text-c-error hover:bg-c-error/30": theme === "error",
          "border-c-info! text-white hover:bg-c-info/30": theme === "info",
        },
        className,
      )}
    >
      {icon && <Icon variant={icon} className="size-4" />}
      {children}
    </button>
  );
}
