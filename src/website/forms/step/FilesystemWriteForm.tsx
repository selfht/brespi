import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

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

type Props = {
  id: string;
  existing?: Step.FilesystemWrite;
  onSave: (step: Step.FilesystemWrite) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function FilesystemWriteForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, watch, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      [Field.folderPath]: existing?.folderPath ?? "",
      [Field.managedStorage]: existing ? (existing.managedStorage ? "true" : "false") : "false",
      [Field.retentionPolicy]: existing ? (existing.retention ? existing.retention.policy : "none") : "none",
      [Field.retentionMaxVersions]: existing ? (existing.retention ? existing.retention.maxVersions : 10) : 10,
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
        folderPath: form[Field.folderPath],
        managedStorage: form[Field.managedStorage] === "true",
        retention:
          form[Field.retentionPolicy] === "last_n_versions"
            ? { policy: "last_n_versions", maxVersions: form[Field.retentionMaxVersions] }
            : null,
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const managedStorage = watch(Field.managedStorage);
  const retentionPolicy = watch(Field.retentionPolicy);
  const { activeField, setActiveField } = FormElements.useActiveField<Form>();
  return (
    <FormElements.Container className={className}>
      <FormElements.Left>
        <fieldset disabled={formState.isSubmitting} className="flex flex-col gap-4">
          <FormElements.LabeledInput
            field={Field.folderPath}
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
                field={Field.retentionPolicy}
                labels={Label}
                register={register}
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
                  register={register}
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
          formState={formState}
          onSubmit={handleSubmit(submit)}
          onDelete={onDelete}
          onCancel={onCancel}
        />
      </FormElements.Left>
      <FormElements.Right
        stepType={Step.Type.filesystem_write}
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
FilesystemWriteForm.Field = Field;
FilesystemWriteForm.Label = Label;
