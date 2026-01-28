import clsx from "clsx";
import { ComponentProps } from "react";

type Props = Omit<ComponentProps<"input">, "type">;
export function Toggle({ className, ...props }: Props) {
  return (
    <label
      className={clsx(
        "size-8 rounded-full flex justify-center cursor-pointer has-disabled:cursor-not-allowed",
        "bg-black border-2 border-black",
        className,
      )}
    >
      <input type="checkbox" className="sr-only peer" {...props} />
      <div
        className={clsx(
          "size-7 rounded-full relative -top-0.5",
          "peer-active:not-peer-disabled:top-0",
          "peer-disabled:bg-c-dim",
          "not-peer-checked:not-peer-disabled:bg-c-error",
          "peer-checked:not-peer-disabled:bg-c-success",
        )}
      />
    </label>
  );
}
