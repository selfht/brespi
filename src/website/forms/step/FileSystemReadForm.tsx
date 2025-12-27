import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  path = "path",
}
type Form = {
  [Field.path]: string;
};
type Props = {
  id: string;
  existing?: Step.FilesystemRead;
  onSave: (step: Step.FilesystemRead) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function FileSystemReadForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      [Field.path]: existing?.path ?? "",
    },
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        object: "step",
        type: Step.Type.filesystem_read,
        path: form[Field.path],
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.filesystem_read}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label htmlFor={Field.path} className="w-72">
              Path
            </label>
            <input id={Field.path} type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register(Field.path)} />
          </div>
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
        <p>This step can be used for reading from the local filesystem.</p>
        <p>
          The <strong className="font-bold">path</strong> references either a file or a folder.
        </p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
