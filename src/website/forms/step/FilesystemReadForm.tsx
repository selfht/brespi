import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  fileOrFolder = "fileOrFolder",
  managedStorage = "managedStorage",
  managedStorage_target = "managedStorage_target",
  managedStorage_version = "managedStorage_version",
  filterCriteria = "filterCriteria",
  filterCriteria_method = "filterCriteria_method",
  filterCriteria_name = "filterCriteria_name",
  filterCriteria_nameGlob = "filterCriteria_nameGlob",
  filterCriteria_nameRegex = "filterCriteria_nameRegex",
}
type Form = {
  [Field.fileOrFolder]: string;
  [Field.managedStorage]: "true" | "false";
  [Field.managedStorage_target]: "latest" | "specific";
  [Field.managedStorage_version]: string;
  [Field.filterCriteria]: "true" | "false";
  [Field.filterCriteria_method]: "exact" | "glob" | "regex";
  [Field.filterCriteria_name]: string;
  [Field.filterCriteria_nameGlob]: string;
  [Field.filterCriteria_nameRegex]: string;
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
      [Field.managedStorage_target]: existing?.managedStorage?.target ?? "latest",
      [Field.managedStorage_version]: existing?.managedStorage?.target ?? "",
      [Field.filterCriteria]: existing ? (existing.filterCriteria ? "true" : "false") : "false",
      [Field.filterCriteria_method]: existing?.filterCriteria?.method ?? "exact",
      [Field.filterCriteria_name]: existing?.filterCriteria?.method === "exact" ? existing.filterCriteria.name : "",
      [Field.filterCriteria_nameGlob]: existing?.filterCriteria?.method === "glob" ? existing.filterCriteria.nameGlob : "",
      [Field.filterCriteria_nameRegex]: existing?.filterCriteria?.method === "regex" ? existing.filterCriteria.nameRegex : "",
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
            ? form[Field.managedStorage_target] === "latest"
              ? { target: "latest" }
              : { target: "specific", version: form[Field.managedStorage_version] }
            : null,
        filterCriteria:
          form[Field.filterCriteria] === "true"
            ? form[Field.filterCriteria_method] === "exact"
              ? { method: "exact", name: form[Field.filterCriteria_name] }
              : form[Field.filterCriteria_method] === "glob"
                ? { method: "glob", nameGlob: form[Field.filterCriteria_nameGlob] }
                : { method: "regex", nameRegex: form[Field.filterCriteria_nameRegex] }
            : null,
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const managedStorage = watch(Field.managedStorage);
  const managedStorageSelectionTarget = watch(Field.managedStorage_target);
  const filterCriteria = watch(Field.filterCriteria);
  const filterCriteriaMethod = watch(Field.filterCriteria_method);
  const filterCriteriaMethodOptions: Array<typeof filterCriteriaMethod> = ["exact", "glob", "regex"];
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
                <label htmlFor={Field.managedStorage_target} className="w-72">
                  <span className="text-c-dim">Managed storage:</span> target
                </label>
                <select
                  id={Field.managedStorage_target}
                  className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                  {...register(Field.managedStorage_target)}
                >
                  <option value="latest">latest</option>
                  <option value="specific">specific</option>
                </select>
              </div>
              {managedStorageSelectionTarget === "specific" && (
                <div className="flex items-center">
                  <label htmlFor={Field.managedStorage_version} className="w-72">
                    <span className="text-c-dim">Managed storage:</span> version
                  </label>
                  <input
                    id={Field.managedStorage_version}
                    type="text"
                    className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                    {...register(Field.managedStorage_version)}
                  />
                </div>
              )}
            </>
          ) : null}
          <div className="flex items-center">
            <label htmlFor={Field.filterCriteria} className="w-72">
              Use filter?
            </label>
            <select id={Field.filterCriteria} className="rounded p-2 bg-c-dim/20" {...register(Field.filterCriteria)}>
              <option value="true">yes</option>
              <option value="false">no</option>
            </select>
          </div>
          {filterCriteria === "true" ? (
            <>
              <div className="flex items-center">
                <label htmlFor={Field.filterCriteria_method} className="w-72">
                  <span className="text-c-dim">Filter:</span> method
                </label>
                <select
                  id={Field.filterCriteria_method}
                  className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                  {...register(Field.filterCriteria_method)}
                >
                  {filterCriteriaMethodOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              {filterCriteriaMethod === "exact" && (
                <div className="flex items-center">
                  <label htmlFor={Field.filterCriteria_name} className="w-72">
                    <span className="text-c-dim">Filter:</span> name
                  </label>
                  <input
                    id={Field.filterCriteria_name}
                    type="text"
                    className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                    {...register(Field.filterCriteria_name)}
                  />
                </div>
              )}
              {filterCriteriaMethod === "glob" && (
                <div className="flex items-center">
                  <label htmlFor={Field.filterCriteria_nameGlob} className="w-72">
                    <span className="text-c-dim">Filter:</span> name glob
                  </label>
                  <input
                    id={Field.filterCriteria_nameGlob}
                    type="text"
                    className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                    {...register(Field.filterCriteria_nameGlob)}
                  />
                </div>
              )}
              {filterCriteriaMethod === "regex" && (
                <div className="flex items-center">
                  <label htmlFor={Field.filterCriteria_nameRegex} className="w-72">
                    <span className="text-c-dim">Filter:</span> name regex
                  </label>
                  <input
                    id={Field.filterCriteria_nameRegex}
                    type="text"
                    className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                    {...register(Field.filterCriteria_nameRegex)}
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
