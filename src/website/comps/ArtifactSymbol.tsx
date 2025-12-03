import { Step } from "@/models/Step";

type Props = {
  variant: Step.Category;
};
export function ArtifactSymbol({ variant }: Props) {
  return (
    <div className="flex items-center gap-0.5">
      {(variant === Step.Category.consumer || variant === Step.Category.transformer) && (
        <div className="size-4 bg-c-artifact-fill border-2 border-c-artifact-stroke rounded-md" />
      )}
      <div className="w-10 h-8 bg-c-artifact-fill border-2 border-c-artifact-stroke rounded-lg" />
      {(variant === Step.Category.producer || variant === Step.Category.transformer) && (
        <div className="size-4 bg-c-artifact-fill border-2 border-c-artifact-stroke rounded-md" />
      )}
    </div>
  );
}
