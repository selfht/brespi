import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: "Used for restoring PostgreSQL databases from a backup artifact using pg_restore.",
  fields: {
    connectionReference: {
      label: "Connection reference",
      description: "This field specifies which environment variable contains the PostgreSQL connection string.",
    },
    toolkit_resolution: {
      label: "Toolkit resolution",
      description: "This field specifies whether to automatically detect or manually specify PostgreSQL tools.",
    },
    toolkit_psql: {
      label: "Toolkit: 'psql' path",
      description: "This field specifies the path to the psql executable when using manual toolkit resolution.",
    },
    toolkit_pg_restore: {
      label: "Toolkit: 'pg_restore' path",
      description: "This field specifies the path to the pg_restore executable when using manual toolkit resolution.",
    },
    database: {
      label: "Database",
      description: "This field specifies the target database name to restore into.",
    },
  },
});
type Form = {
  [Field.connectionReference]: string;
  [Field.toolkit_resolution]: "automatic" | "manual";
  [Field.toolkit_psql]: string;
  [Field.toolkit_pg_restore]: string;
  [Field.database]: string;
};

type Props = {
  id: string;
  existing?: Step.PostgresRestore;
  onSave: (step: Step.PostgresRestore) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function PostgresRestoreForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, watch, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      [Field.connectionReference]: existing?.connectionReference ?? "",
      [Field.toolkit_resolution]: existing?.toolkit.resolution ?? "automatic",
      [Field.toolkit_psql]: existing?.toolkit.resolution === "manual" ? existing.toolkit.psql : "",
      [Field.toolkit_pg_restore]: existing?.toolkit.resolution === "manual" ? existing.toolkit.pg_restore : "",
      [Field.database]: existing?.database ?? "",
    } satisfies Form,
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        object: "step",
        type: Step.Type.postgres_restore,
        connectionReference: form[Field.connectionReference],
        toolkit:
          form[Field.toolkit_resolution] === "automatic"
            ? { resolution: "automatic" }
            : {
                resolution: "manual",
                psql: form[Field.toolkit_psql],
                pg_restore: form[Field.toolkit_pg_restore],
              },
        database: form[Field.database],
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const toolkitResolution = watch(Field.toolkit_resolution);
  const { activeField, setActiveField } = FormElements.useActiveField<Form>();
  return (
    <FormElements.Container className={className}>
      <FormElements.Left>
        <fieldset disabled={formState.isSubmitting} className="flex flex-col gap-4">
          <FormElements.LabeledInput
            field={Field.connectionReference}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.toolkit_resolution}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "select", options: ["automatic", "manual"] }}
          />
          {toolkitResolution === "manual" && (
            <>
              <FormElements.LabeledInput
                field={Field.toolkit_psql}
                labels={Label}
                register={register}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                input={{ type: "text" }}
              />
              <FormElements.LabeledInput
                field={Field.toolkit_pg_restore}
                labels={Label}
                register={register}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                input={{ type: "text" }}
              />
            </>
          )}
          <FormElements.LabeledInput
            field={Field.database}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
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
        stepType={Step.Type.postgres_restore}
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
PostgresRestoreForm.Field = Field;
PostgresRestoreForm.Label = Label;
