import clsx from "clsx";

type Props = {
  className?: string;
};
export function Spinner({ className }: Props) {
  return (
    <div className={clsx("inline-block size-6 border-2 border-c-primary border-t-c-primary/0 rounded-full animate-spin", className)} />
  );
}
