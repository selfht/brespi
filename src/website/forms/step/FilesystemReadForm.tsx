import { Step } from "@/models/Step";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

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
      <FormElements.Left stepType={Step.Type.filesystem_read}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
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
            input={{ type: "select", options: ["true", "false"] }}
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
                input={{ type: "select", options: ["true", "false"] }}
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
      <FormElements.Right formState={formState} clearErrors={clearErrors}>
        <p>This step can be used for reading from the local filesystem.</p>
        <p>
          The <strong className="font-bold">path</strong> references either a file or a folder.
        </p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
FilesystemReadForm.Field = Field;
FilesystemReadForm.Label = Label;
