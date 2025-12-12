import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
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
        <FormElements.Title stepType={Step.Type.folder_group} />

        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <p className="text-c-dim">This step requires no additional configuration.</p>
        </fieldset>

        <FormElements.ButtonBar
          className="mt-12"
          existing={existing}
          formState={formState}
          onSubmit={handleSubmit(submit)}
          onDelete={onDelete}
          onCancel={onCancel}
        />
      </div>
      <div className="col-span-6 pl-3 border-l-2 border-c-dim/20">
        <FormElements.DescriptionOrError formState={formState} clearErrors={clearErrors}>
          <p>This step can be used for grouping files into folders.</p>
          <p>Files will be organized based on their attributes or naming patterns.</p>
        </FormElements.DescriptionOrError>
      </div>
    </div>
  );
}
