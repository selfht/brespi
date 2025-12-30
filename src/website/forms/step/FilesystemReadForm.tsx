import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  fileOrFolder = "fileOrFolder",
  managedStorage = "managedStorage",
  managedStorage_selection_target = "managedStorage_selection_target",
  managedStorage_selection_version = "managedStorage_selection_version",
}
type Form = {
  [Field.fileOrFolder]: string;
  [Field.managedStorage]: "true" | "false";
  [Field.managedStorage_selection_target]: "latest" | "specific";
  [Field.managedStorage_selection_version]: string;
};
type Props = {
  id: string;
  existing?: Step.FilesystemRead;
  onSave: (step: Step.FilesystemRead) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function FilesystemReadForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, watch, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      [Field.fileOrFolder]: existing?.fileOrFolder ?? "",
      [Field.managedStorage]: existing ? (existing.managedStorage ? "true" : "false") : "false",
      [Field.managedStorage_selection_target]: existing?.managedStorage?.selection.target ?? "latest",
      [Field.managedStorage_selection_version]: existing?.managedStorage?.selection.target ?? "",
    } satisfies Form,
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        object: "step",
        type: Step.Type.filesystem_read,
        fileOrFolder: form[Field.fileOrFolder],
        managedStorage:
          form[Field.managedStorage] === "true"
            ? {
                selection:
                  form[Field.managedStorage_selection_target] === "latest"
                    ? { target: "latest" }
                    : { target: "specific", version: form[Field.managedStorage_selection_version] },
              }
            : null,
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const managedStorage = watch(Field.managedStorage);
  const managedStorageSelectionTarget = watch(Field.managedStorage_selection_target);
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.filesystem_read}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label htmlFor={Field.fileOrFolder} className="w-72">
              {managedStorage === "true" ? "Folder" : "File or folder"}
            </label>
            <input
              id={Field.fileOrFolder}
              type="text"
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.fileOrFolder)}
            />
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
          {managedStorage === "true" ? (
            <>
              <div className="flex items-center">
                <label htmlFor={Field.managedStorage_selection_target} className="w-72">
                  Version selection
                </label>
                <select
                  id={Field.managedStorage_selection_target}
                  className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                  {...register(Field.managedStorage_selection_target)}
                >
                  <option value="latest">latest</option>
                  <option value="specific">specific</option>
                </select>
              </div>
              {managedStorageSelectionTarget === "specific" && (
                <div className="flex items-center">
                  <label htmlFor={Field.managedStorage_selection_version} className="w-72">
                    Version
                  </label>
                  <input
                    id={Field.managedStorage_selection_version}
                    type="text"
                    className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                    {...register(Field.managedStorage_selection_version)}
                  />
                </div>
              )}
            </>
          ) : null}
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
