import clsx from "clsx";
import { Icon } from "./Icon";

type Props = ExecutionIcon.Props;
export function ExecutionIcon({ variant, className }: Props) {
  return (
    <div className="p-2">
      {variant === "no_data" ? (
        <Icon.NoData className={clsx("w-8", className)} />
      ) : (
        <Icon variant={variant} className={clsx("size-8", className)} />
      )}
    </div>
  );
}
export namespace ExecutionIcon {
  export type Props = {
    variant: Extract<Icon.Props["variant"], "new" | "success" | "error" | "loading"> | "no_data";
    className?: string;
  };
}
