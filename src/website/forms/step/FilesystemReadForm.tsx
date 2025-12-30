import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  path = "path",
  brespiManaged = "brespiManaged",
  brespiManaged_selection_target = "brespiManaged_selection_target",
  brespiManaged_selection_version = "brespiManaged_selection_version",
}
type Form = {
  [Field.path]: string;
  [Field.brespiManaged]: "true" | "false";
  [Field.brespiManaged_selection_target]: "latest" | "specific";
  [Field.brespiManaged_selection_version]: string;
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
      [Field.path]: existing?.path ?? "",
      [Field.brespiManaged]: existing ? (existing.brespiManaged ? "true" : "false") : "false",
      [Field.brespiManaged_selection_target]: existing?.brespiManaged?.selection.target ?? "latest",
      [Field.brespiManaged_selection_version]: existing?.brespiManaged?.selection.target ?? "",
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
        path: form[Field.path],
        brespiManaged:
          form[Field.brespiManaged] === "true"
            ? {
                selection:
                  form[Field.brespiManaged_selection_target] === "latest"
                    ? { target: "latest" }
                    : { target: "specific", version: form[Field.brespiManaged_selection_version] },
              }
            : null,
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const brespiManaged = watch(Field.brespiManaged);
  const brespiManagedSelectionTarget = watch(Field.brespiManaged_selection_target);
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
          <div className="flex items-center">
            <label htmlFor={Field.brespiManaged} className="w-72">
              Brespi managed folder?
            </label>
            <select id={Field.brespiManaged} className="rounded p-2 bg-c-dim/20" {...register(Field.brespiManaged)}>
              <option value="true">yes</option>
              <option value="false">no</option>
            </select>
          </div>
          {brespiManaged === "true" ? (
            <>
              <div className="flex items-center">
                <label htmlFor={Field.brespiManaged_selection_target} className="w-72">
                  Version selection
                </label>
                <select
                  id={Field.brespiManaged_selection_target}
                  className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                  {...register(Field.brespiManaged_selection_target)}
                >
                  <option value="latest">latest</option>
                  <option value="specific">specific</option>
                </select>
              </div>
              {brespiManagedSelectionTarget === "specific" && (
                <div className="flex items-center">
                  <label htmlFor={Field.brespiManaged_selection_version} className="w-72">
                    Version
                  </label>
                  <input
                    id={Field.brespiManaged_selection_version}
                    type="text"
                    className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                    {...register(Field.brespiManaged_selection_version)}
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
