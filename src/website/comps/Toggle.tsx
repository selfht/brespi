import clsx from "clsx";
import { useState } from "react";

type Props = {
  // value: boolean;
  // onChange(value: boolean): unknown;
  disabled?: boolean;
};
export function Toggle({ disabled }: Props) {
  const [value, onChange] = useState(false);
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={clsx(
        "group size-8 rounded-full flex justify-center cursor-pointer disabled:cursor-not-allowed bg-black border-2 border-black",
      )}
    >
      <div
        className={clsx("size-7 rounded-full relative -top-0.5 not-group-disabled:group-active:top-0", {
          "top-0 bg-c-success": value && !disabled,
          "bg-c-error": !value && !disabled,
          "bg-c-dim": disabled,
        })}
      />
    </button>
  );
}
