import clsx from "clsx";
import { ComponentProps } from "react";
import { Icon } from "./Icon";

type Props = ComponentProps<"button"> & {
  icon?: Icon.Props["variant"];
  theme?: Button.Theme;
};
export function Button({ icon, theme, className, children, ...props }: Props) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex gap-2 items-center p-2 border-2 font-bold focus:outline-none",
        "text-white border-c-primary rounded-lg",
        "hover:cursor-pointer hover:bg-c-dim/30 focus:bg-c-dim/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        {
          "border-c-success/80! hover:bg-c-success/30": theme === "success",
          "border-c-error! hover:bg-c-error/30": theme === "error",
          "border-c-accent! hover:bg-c-accent/30": theme === "accent",
        },
        className,
      )}
    >
      {icon && <Icon variant={icon} className="size-4" />}
      {children}
    </button>
  );
}
export namespace Button {
  export type Theme = "success" | "error" | "accent";
}
