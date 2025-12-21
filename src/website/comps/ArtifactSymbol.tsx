import { Step } from "@/models/Step";
import clsx from "clsx";

type Props = {
  variant: Step.Category;
};
export function ArtifactSymbol({ variant }: Props) {
  const hasInput = variant === Step.Category.consumer || variant === Step.Category.transformer;
  const hasOutput = variant === Step.Category.producer || variant === Step.Category.transformer;
  return (
    <div className="flex items-center gap-0.5">
      <div
        className={clsx("size-4 border-2 rounded-md", {
          "bg-c-canvasblock-default-inner border-c-canvasblock-default-outer": hasInput,
          "bg-c-dim/30 border-c-dim": !hasInput,
        })}
      />
      <div className="w-10 h-8 bg-c-canvasblock-default-inner border-2 border-c-canvasblock-default-outer rounded-lg" />
      <div
        className={clsx("size-4 border-2 rounded-md", {
          "bg-c-canvasblock-default-inner border-c-canvasblock-default-outer": hasOutput,
          "bg-c-dim/30 border-c-dim": !hasOutput,
        })}
      />
    </div>
  );
}
