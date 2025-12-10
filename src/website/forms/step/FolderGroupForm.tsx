import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { Button } from "../../comps/Button";
import { Icon } from "../../comps/Icon";
import { Spinner } from "../../comps/Spinner";
import { StepTranslation } from "../../translation/StepTranslation";
import { FormHelper } from "../FormHelper";

type Form = Record<string, never>;
type Props = {
  id: string;
  existing?: Step.FolderGroup;
  onCancel: () => unknown;
  onSubmit: (step: Step.FolderGroup) => unknown;
  className?: string;
};
export function FolderGroupForm({ id, existing, onCancel, onSubmit, className }: Props) {
  const { handleSubmit, formState } = useForm<Form>();
  const submit: SubmitHandler<Form> = async () => {
    await FormHelper.snoozeBeforeSubmit();
    onSubmit({
      id,
      previousId: existing?.previousId || null,
      type: Step.Type.folder_group,
    });
  };
  return (
    <div className={clsx(className, "u-subgrid font-light")}>
      <div className="col-span-6 pr-3">
        <div className="flex items-center gap-2">
          {existing && <Icon variant="trashcan" />}
          <h1 className="text-2xl font-extralight text-c-dim">{StepTranslation.type(Step.Type.folder_group)}</h1>
        </div>

        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <p className="text-c-dim">This step requires no additional configuration.</p>
        </fieldset>

        <div className="mt-12 flex justify-end gap-4">
          {!formState.isSubmitting && <Button onClick={onCancel}>Cancel</Button>}
          <Button
            disabled={formState.isSubmitting}
            onClick={handleSubmit(submit)}
            className="border-c-success text-c-success hover:bg-c-success/20"
          >
            {formState.isSubmitting ? <Spinner className="border-c-success" /> : existing ? "Update Step" : "Add Step"}
          </Button>
        </div>
      </div>
      <div className="col-span-6 pl-3 border-l-2 border-c-dim/20">
        <p>This step can be used for grouping files into folders.</p>
        <p>Files will be organized based on their attributes or naming patterns.</p>
      </div>
    </div>
  );
}
