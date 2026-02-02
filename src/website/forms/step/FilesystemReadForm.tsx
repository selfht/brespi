import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";
import { useEffect } from "react";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: "Used for reading from the local filesystem.",
  fields: {
    path: {
      label: "Path",
      description: "Specifies the local filesystem path to read from.",
    },
    managedStorage: {
      label: "Use managed storage?",
      description:
        'Enables reading an artifact collection from a managed storage folder. If enabled, the path above must point to a valid "managed storage root".',
    },
    managedStorage_target: {
      label: "Managed storage: target",
      description: "Specifies whether to retrieve the latest version of an artifact collection, or a specific version.",
    },
    managedStorage_version: {
      label: "Managed storage: version",
      description: "Determines which specific version to retrieve.",
    },
    filterCriteria: {
      label: "Use filter?",
      description: "Enables filtering artifacts by name when retrieving from managed storage.",
    },
    filterCriteria_method: {
      label: "Filter: method",
      description: "Specifies which matching method to use for filtering.",
    },
    filterCriteria_name: {
      label: "Filter: name",
      description: "Specifies the exact artifact name to match.",
    },
    filterCriteria_nameGlob: {
      label: "Filter: name glob",
      description: "Specifies the glob pattern to match artifact names.",
    },
    filterCriteria_nameRegex: {
      label: "Filter: name regex",
      description: "Specifies the regex pattern to match artifact names.",
    },
  },
});

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
function defaultValues(existing: Step.FilesystemRead | undefined): Form {
  return {
    [Field.path]: existing?.path ?? "",
    [Field.managedStorage]: existing ? (existing.managedStorage ? "true" : "false") : "false",
    [Field.managedStorage_target]: existing?.managedStorage?.target ?? "latest",
    [Field.managedStorage_version]: existing?.managedStorage?.target ?? "",
    [Field.filterCriteria]: existing ? (existing.filterCriteria ? "true" : "false") : "false",
    [Field.filterCriteria_method]: existing?.filterCriteria?.method ?? "exact",
    [Field.filterCriteria_name]: existing?.filterCriteria?.method === "exact" ? existing.filterCriteria.name : "",
    [Field.filterCriteria_nameGlob]: existing?.filterCriteria?.method === "glob" ? existing.filterCriteria.nameGlob : "",
    [Field.filterCriteria_nameRegex]: existing?.filterCriteria?.method === "regex" ? existing.filterCriteria.nameRegex : "",
  };
}

type Props = {
  id: string;
  existing?: Step.FilesystemRead;
  onSave: (step: Step.FilesystemRead) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function FilesystemReadForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, watch, setError, clearErrors, reset } = useForm<Form>({
    defaultValues: defaultValues(existing),
  });
  useEffect(() => reset(defaultValues(existing)), [existing]);
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
        {summary}
      </FormElements.Right>
    </FormElements.Container>
  );
}
FilesystemReadForm.Field = Field;
FilesystemReadForm.Label = Label;
