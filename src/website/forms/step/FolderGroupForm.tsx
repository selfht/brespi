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
  onSave: (step: Step.FolderGroup) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function FolderGroupForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { handleSubmit, formState, setError, clearErrors } = useForm<Form>();
  const submit: SubmitHandler<Form> = async () => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        type: Step.Type.folder_group,
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };
  return (
    <div className={clsx(className, "u-subgrid font-light")}>
      <div className="col-span-6 pr-3">
        <h1 className="text-2xl font-extralight text-c-dim">{StepTranslation.type(Step.Type.folder_group)}</h1>

        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <p className="text-c-dim">This step requires no additional configuration.</p>
        </fieldset>

        <div className="mt-12 flex flex-row-reverse justify-between gap-4">
          <div className="flex gap-4">
            {!formState.isSubmitting && <Button onClick={onCancel}>Cancel</Button>}
            <Button
              disabled={formState.isSubmitting}
              onClick={handleSubmit(submit)}
              className="border-c-success text-c-success hover:bg-c-success/20"
            >
              {formState.isSubmitting ? <Spinner className="border-c-success" /> : existing ? "Update Step" : "Add Step"}
            </Button>
          </div>
          {existing && !formState.isSubmitting && (
            <Button className="border-c-error! text-c-error hover:bg-c-error/20" onClick={() => onDelete(existing.id)}>
              Delete Step
            </Button>
          )}
        </div>
      </div>
      <div className="col-span-6 pl-3 border-l-2 border-c-dim/20">
        {formState.errors.root?.message ? (
          <div className="border-3 border-c-error p-3 rounded-lg flex justify-between items-start">
            <pre className="text-c-error">{formState.errors.root.message}</pre>
            <button className="cursor-pointer" onClick={() => clearErrors()}>
              <Icon variant="close" className="size-5" />
            </button>
          </div>
        ) : (
          <>
            <p>This step can be used for grouping files into folders.</p>
            <p>Files will be organized based on their attributes or naming patterns.</p>
          </>
        )}
      </div>
    </div>
  );
}
