import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

type Form = Record<string, never>;
type Props = {
  id: string;
  existing?: Step.FolderFlatten;
  onSave: (step: Step.FolderFlatten) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function FolderFlattenForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { handleSubmit, formState, setError, clearErrors } = useForm<Form>();
  const submit: SubmitHandler<Form> = async () => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        type: Step.Type.folder_flatten,
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.folder_flatten}>
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
      </FormElements.Left>
      <FormElements.Right formState={formState} clearErrors={clearErrors}>
        <p>This step can be used for flattening folder structures.</p>
        <p>All files from nested directories will be moved to a single level.</p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
