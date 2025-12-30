import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  folder = "folder",
  managedStorage = "managedStorage",
}
type Form = {
  [Field.folder]: string;
  [Field.managedStorage]: "true" | "false";
};
type Props = {
  id: string;
  existing?: Step.FilesystemWrite;
  onSave: (step: Step.FilesystemWrite) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function FilesystemWriteForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      [Field.folder]: existing?.folder ?? "",
      [Field.managedStorage]: existing ? (existing.managedStorage ? "true" : "false") : "false",
    } satisfies Form,
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        object: "step",
        type: Step.Type.filesystem_write,
        folder: form[Field.folder],
        managedStorage: form[Field.managedStorage] === "true",
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.filesystem_write}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label htmlFor={Field.folder} className="w-72">
              Folder
            </label>
            <input id={Field.folder} type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register(Field.folder)} />
          </div>
          <div className="flex items-center">
            <label htmlFor={Field.managedStorage} className="w-72">
              Use managed storage?
            </label>
            <select id={Field.managedStorage} className="rounded p-2 bg-c-dim/20" {...register(Field.managedStorage)}>
              <option value="true">yes</option>
              <option value="false">no</option>
            </select>
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
        <p>This step can be used for writing to the local filesystem.</p>
        <p>
          The <strong className="font-bold">path</strong> references the target location where artifacts will be written.
        </p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
