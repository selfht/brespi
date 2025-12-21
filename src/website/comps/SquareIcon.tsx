import clsx from "clsx";
import { Icon } from "./Icon";

export function SquareIcon({ variant, className }: SquareIcon.Props) {
  return (
    <div className={clsx("size-14 border-2 border-c-dim text-c-dim rounded-lg grid place-items-center", className)}>
      {variant === "no_data" ? (
        <span className="text-center leading-4 text-sm font-semibold">NO DATA</span>
      ) : (
        <Icon variant={variant} className="size-6" />
      )}
    </div>
  );
}

export namespace SquareIcon {
  export type Props = {
    variant: "no_data" | Icon.Props["variant"];
    className?: string;
  };
}
