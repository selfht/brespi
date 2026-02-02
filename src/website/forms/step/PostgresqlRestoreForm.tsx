import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";
import { useEffect } from "react";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: (
    <>
      Used for restoring a PostgreSQL database from a backup artifact using <FormElements.Code>pg_restore</FormElements.Code>.
    </>
  ),
  fields: {
    connectionReference: {
      label: "Connection reference",
      description: (
        <>
          Specifies which environment variable contains the PostgreSQL connection string in the format{" "}
          <FormElements.Code break>postgresql://username:password@hostname:5432</FormElements.Code>.
        </>
      ),
    },
    toolkit_resolution: {
      label: "Toolkit resolution",
      description: (
        <>
          Specifies how to find PostgreSQL executables (like <FormElements.Code>psql</FormElements.Code>).
        </>
      ),
    },
    toolkit_psql: {
      label: 'Toolkit: "psql" path',
      description: (
        <>
          Specifies where to find the <FormElements.Code>psql</FormElements.Code> executable.
        </>
      ),
    },
    toolkit_pg_restore: {
      label: 'Toolkit: "pg_restore" path',
      description: (
        <>
          Specifies where to find the <FormElements.Code>pg_restore</FormElements.Code> executable.
        </>
      ),
    },
    database: {
      label: "Database",
      description: "Specifies the name of the target database to restore into.",
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
function defaultValues(existing: Step.PostgresqlRestore | undefined): Form {
  return {
    [Field.connectionReference]: existing?.connectionReference ?? "",
    [Field.toolkit_resolution]: existing?.toolkit.resolution ?? "automatic",
    [Field.toolkit_psql]: existing?.toolkit.resolution === "manual" ? existing.toolkit.psql : "",
    [Field.toolkit_pg_restore]: existing?.toolkit.resolution === "manual" ? existing.toolkit.pg_restore : "",
    [Field.database]: existing?.database ?? "",
  };
}

type Props = {
  id: string;
  existing?: Step.PostgresqlRestore;
  onSave: (step: Step.PostgresqlRestore) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function PostgresqlRestoreForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
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
        type: Step.Type.postgresql_restore,
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
        stepType={Step.Type.postgresql_restore}
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
PostgresqlRestoreForm.Field = Field;
PostgresqlRestoreForm.Label = Label;
