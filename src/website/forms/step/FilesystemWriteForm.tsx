import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";
import { useEffect } from "react";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: "Used for writing to the local filesystem.",
  fields: {
    folderPath: {
      label: "Folder path",
      description: "Specifies the local folder path where artifacts will be written.",
    },
    managedStorage: {
      label: "Use managed storage?",
      description:
        'Enables writing to a managed storage folder. If no "managed storage root" is detected at the provided folder path, it will be initialized upon first execution.',
    },
    retentionPolicy: {
      label: "Retention policy",
      description: "Specifies the automated cleanup retention policy for stored artifacts.",
    },
    retentionMaxVersions: {
      label: "Retention: max versions",
      description: "Specifies how many versions can be stored, before automatic cleanup kicks in.",
    },
  },
});

type Form = {
  [Field.folderPath]: string;
  [Field.managedStorage]: "true" | "false";
  [Field.retentionPolicy]: "none" | "last_n_versions";
  [Field.retentionMaxVersions]: number;
};
function defaultValues(existing: Step.FilesystemWrite | undefined): Form {
  return {
    [Field.folderPath]: existing?.folderPath ?? "",
    [Field.managedStorage]: existing ? (existing.managedStorage ? "true" : "false") : "false",
    [Field.retentionPolicy]: existing ? (existing.retention ? existing.retention.policy : "none") : "none",
    [Field.retentionMaxVersions]: existing ? (existing.retention ? existing.retention.maxVersions : 10) : 10,
  };
}

type Props = {
  id: string;
  existing?: Step.FilesystemWrite;
  onSave: (step: Step.FilesystemWrite) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function FilesystemWriteForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const form = useForm<Form>({
    defaultValues: defaultValues(existing),
  });
  useEffect(() => form.reset(defaultValues(existing)), [existing]);
  const submit: SubmitHandler<Form> = async (values) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId,
        object: "step",
        type: Step.Type.filesystem_write,
        folderPath: values[Field.folderPath],
        managedStorage: values[Field.managedStorage] === "true",
        retention:
          values[Field.retentionPolicy] === "last_n_versions"
            ? { policy: "last_n_versions", maxVersions: values[Field.retentionMaxVersions] }
            : undefined,
      });
    } catch (error) {
      form.setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const managedStorage = form.watch(Field.managedStorage);
  const retentionPolicy = form.watch(Field.retentionPolicy);
  const { activeField, setActiveField } = FormElements.useActiveField<Form>();
  return (
    <FormElements.Container className={className}>
      <FormElements.Left>
        <fieldset disabled={form.formState.isSubmitting} className="flex flex-col gap-4">
          <FormElements.LabeledInput
            field={Field.folderPath}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.managedStorage}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "yesno" }}
          />
          {managedStorage === "true" && (
            <>
              <FormElements.LabeledInput
                field={Field.retentionPolicy}
                labels={Label}
                register={form.register}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                input={{
                  type: "select",
                  options: ["none", "last_n_versions"] satisfies Array<Form["retentionPolicy"]>,
                }}
              />
              {retentionPolicy === "last_n_versions" && (
                <FormElements.LabeledInput
                  field={Field.retentionMaxVersions}
                  labels={Label}
                  register={form.register}
                  activeField={activeField}
                  onActiveFieldChange={setActiveField}
                  input={{ type: "number" }}
                />
              )}
            </>
          )}
        </fieldset>
        <FormElements.ButtonBar
          className="mt-12"
          existing={existing}
          formState={form.formState}
          onSubmit={form.handleSubmit(submit)}
          onDelete={onDelete}
          onCancel={onCancel}
        />
      </FormElements.Left>
      <FormElements.Right
        form={form} //
        stepType={Step.Type.filesystem_write}
        fieldDescriptions={Description}
        fieldCurrentlyActive={activeField}
      >
        {summary}
      </FormElements.Right>
    </FormElements.Container>
  );
}
FilesystemWriteForm.Field = Field;
FilesystemWriteForm.Label = Label;
