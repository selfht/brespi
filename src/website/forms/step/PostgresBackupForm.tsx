import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: (
    <>
      Used for creating Postgres backups using <FormElements.Code>pg_dump</FormElements.Code>.
    </>
  ),
  fields: {
    connectionReference: {
      label: "Connection reference",
      description: (
        <>
          This field specifies which environment variable contains the Postgres connection string in the format{" "}
          <FormElements.Code break>postgresql://username:password@hostname:5432</FormElements.Code>.
        </>
      ),
    },
    toolkit_resolution: {
      label: "Toolkit resolution",
      description: (
        <>
          This field specifies how to find Postgres executables (like <FormElements.Code>psql</FormElements.Code>).
        </>
      ),
    },
    toolkit_psql: {
      label: 'Toolkit: "psql" path',
      description: (
        <>
          This field specifies where to find the <FormElements.Code>psql</FormElements.Code> executable.
        </>
      ),
    },
    toolkit_pg_dump: {
      label: 'Toolkit: "pg_dump" path',
      description: (
        <>
          This field specifies where to find the <FormElements.Code>pg_dump</FormElements.Code> executable.
        </>
      ),
    },
    databaseSelection_strategy: {
      label: "Database selection method",
      description: "This field specifies whether to backup all databases, or only a selection.",
    },
    databaseSelection_inclusions: {
      label: "Database selection: inclusions",
      description: "This field specifies comma-separated database names to include in the backup.",
    },
    databaseSelection_exclusions: {
      label: "Database selection: exclusions",
      description: "This field specifies comma-separated database names to exclude from the backup.",
    },
  },
});
type Form = {
  [Field.connectionReference]: string;
  [Field.toolkit_resolution]: "automatic" | "manual";
  [Field.toolkit_psql]: string;
  [Field.toolkit_pg_dump]: string;
  [Field.databaseSelection_strategy]: "all" | "include" | "exclude";
  [Field.databaseSelection_inclusions]: string;
  [Field.databaseSelection_exclusions]: string;
};

type Props = {
  id: string;
  existing?: Step.PostgresBackup;
  onSave: (step: Step.PostgresBackup) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function PostgresBackupForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, watch, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      [Field.connectionReference]: existing?.connectionReference ?? "",
      [Field.toolkit_resolution]: existing?.toolkit.resolution ?? "automatic",
      [Field.toolkit_psql]: existing?.toolkit.resolution === "manual" ? existing.toolkit.psql : "",
      [Field.toolkit_pg_dump]: existing?.toolkit.resolution === "manual" ? existing.toolkit.pg_dump : "",
      [Field.databaseSelection_strategy]: existing?.databaseSelection.method ?? "all",
      [Field.databaseSelection_inclusions]:
        existing?.databaseSelection.method === "include" ? existing.databaseSelection.inclusions.join(",") : "",
      [Field.databaseSelection_exclusions]:
        existing?.databaseSelection.method === "exclude" ? existing.databaseSelection.exclusions.join(",") : "",
    } satisfies Form,
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        object: "step",
        type: Step.Type.postgres_backup,
        connectionReference: form[Field.connectionReference],
        toolkit:
          form[Field.toolkit_resolution] === "automatic"
            ? { resolution: "automatic" }
            : {
                resolution: "manual",
                psql: form[Field.toolkit_psql],
                pg_dump: form[Field.toolkit_pg_dump],
              },
        databaseSelection:
          form[Field.databaseSelection_strategy] === "all"
            ? {
                method: "all",
              }
            : form[Field.databaseSelection_strategy] === "include"
              ? {
                  method: "include",
                  inclusions: form[Field.databaseSelection_inclusions].split(",").filter(Boolean),
                }
              : {
                  method: "exclude",
                  exclusions: form[Field.databaseSelection_exclusions].split(",").filter(Boolean),
                },
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const toolkitResolution = watch(Field.toolkit_resolution);
  const databaseSelectionStrategy = watch(Field.databaseSelection_strategy);
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
                field={Field.toolkit_pg_dump}
                labels={Label}
                register={register}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                input={{ type: "text" }}
              />
            </>
          )}
          <FormElements.LabeledInput
            field={Field.databaseSelection_strategy}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "select", options: ["all", "include", "exclude"] }}
          />
          {databaseSelectionStrategy === "include" && (
            <FormElements.LabeledInput
              field={Field.databaseSelection_inclusions}
              labels={Label}
              register={register}
              activeField={activeField}
              onActiveFieldChange={setActiveField}
              input={{ type: "text" }}
            />
          )}
          {databaseSelectionStrategy === "exclude" && (
            <FormElements.LabeledInput
              field={Field.databaseSelection_exclusions}
              labels={Label}
              register={register}
              activeField={activeField}
              onActiveFieldChange={setActiveField}
              input={{ type: "text" }}
            />
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
        stepType={Step.Type.postgres_backup}
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
PostgresBackupForm.Field = Field;
PostgresBackupForm.Label = Label;
