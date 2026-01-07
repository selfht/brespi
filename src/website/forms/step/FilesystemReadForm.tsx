import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";
import { ReactNode } from "react";

enum Field {
  path = "path",
  managedStorage = "managedStorage",
  managedStorage_target = "managedStorage_target",
  managedStorage_version = "managedStorage_version",
  filterCriteria = "filterCriteria",
  filterCriteria_method = "filterCriteria_method",
  filterCriteria_name = "filterCriteria_name",
  filterCriteria_nameGlob = "filterCriteria_nameGlob",
  filterCriteria_nameRegex = "filterCriteria_nameRegex",
}
const Label: Record<Field, string> = {
  [Field.path]: "Path",
  [Field.managedStorage]: "Use managed storage?",
  [Field.managedStorage_target]: "Managed storage: target",
  [Field.managedStorage_version]: "Managed storage: version",
  [Field.filterCriteria]: "Use filter?",
  [Field.filterCriteria_method]: "Filter: method",
  [Field.filterCriteria_name]: "Filter: name",
  [Field.filterCriteria_nameGlob]: "Filter: name glob",
  [Field.filterCriteria_nameRegex]: "Filter: name regex",
};
const Description: Record<Field, ReactNode> = {
  [Field.path]: "This field specifies the local filesystem path to read from.",
  [Field.managedStorage]:
    "This field enables reading an artifact collection from a managed storage folder. If enabled, the path above must point to such a folder.",
  [Field.managedStorage_target]:
    "This field specifies whether to retrieve the latest version of an artifact collection, or a specific version.",
  [Field.managedStorage_version]: "This field specifies which specific version to retrieve.",
  [Field.filterCriteria]: "This field enables filtering artifacts by name when retrieving from managed storage.",
  [Field.filterCriteria_method]: "This field specifies which matching method to use for filtering.",
  [Field.filterCriteria_name]: "This field specifies the exact artifact name to match.",
  [Field.filterCriteria_nameGlob]: "This field specifies the glob pattern to match artifact names.",
  [Field.filterCriteria_nameRegex]: "This field specifies the regex pattern to match artifact names.",
};

type Form = {
  [Field.path]: string;
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
      [Field.path]: existing?.path ?? "",
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
        path: form[Field.path],
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
  const { activeField, setActiveField } = FormElements.useActiveField<Form>();
  return (
    <FormElements.Container className={className}>
      <FormElements.Left>
        <fieldset disabled={formState.isSubmitting} className="flex flex-col gap-4">
          <FormElements.LabeledInput
            field={Field.path}
            label={managedStorage === "true" ? `Folder ${Label[Field.path].toLowerCase()}` : Label[Field.path]}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.managedStorage}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "yesno" }}
          />
          {managedStorage === "true" && (
            <>
              <FormElements.LabeledInput
                field={Field.managedStorage_target}
                labels={Label}
                register={register}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                input={{ type: "select", options: ["latest", "specific"] }}
              />
              {managedStorageSelectionTarget === "specific" && (
                <FormElements.LabeledInput
                  field={Field.managedStorage_version}
                  labels={Label}
                  register={register}
                  activeField={activeField}
                  onActiveFieldChange={setActiveField}
                  input={{ type: "text" }}
                />
              )}
              <FormElements.LabeledInput
                field={Field.filterCriteria}
                labels={Label}
                register={register}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                input={{ type: "yesno" }}
              />
              {filterCriteria === "true" && (
                <>
                  <FormElements.LabeledInput
                    field={Field.filterCriteria_method}
                    labels={Label}
                    register={register}
                    activeField={activeField}
                    onActiveFieldChange={setActiveField}
                    input={{ type: "select", options: filterCriteriaMethodOptions }}
                  />
                  {filterCriteriaMethod === "exact" && (
                    <FormElements.LabeledInput
                      field={Field.filterCriteria_name}
                      labels={Label}
                      register={register}
                      activeField={activeField}
                      onActiveFieldChange={setActiveField}
                      input={{ type: "text" }}
                    />
                  )}
                  {filterCriteriaMethod === "glob" && (
                    <FormElements.LabeledInput
                      field={Field.filterCriteria_nameGlob}
                      labels={Label}
                      register={register}
                      activeField={activeField}
                      onActiveFieldChange={setActiveField}
                      input={{ type: "text" }}
                    />
                  )}
                  {filterCriteriaMethod === "regex" && (
                    <FormElements.LabeledInput
                      field={Field.filterCriteria_nameRegex}
                      labels={Label}
                      register={register}
                      activeField={activeField}
                      onActiveFieldChange={setActiveField}
                      input={{ type: "text" }}
                    />
                  )}
                </>
              )}
            </>
          )}
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
      <FormElements.Right
        stepType={Step.Type.filesystem_read}
        formState={formState}
        clearErrors={clearErrors}
        fieldDescriptions={Description}
        fieldCurrentlyActive={activeField}
      >
        <p>A step used for reading from the local filesystem.</p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
FilesystemReadForm.Field = Field;
FilesystemReadForm.Label = Label;
