import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  connectionReference = "connectionReference",
  toolkit_resolution = "toolkit_resolution",
  toolkit_psql = "toolkit_psql",
  toolkit_pg_dump = "toolkit_pg_dump",
  databaseSelection_strategy = "databaseSelection_strategy",
  databaseSelection_inclusions = "databaseSelection_inclusions",
  databaseSelection_exclusions = "databaseSelection_exclusions",
}
const Label: Record<Field, string> = {
  [Field.connectionReference]: "Connection reference",
  [Field.toolkit_resolution]: "Toolkit resolution",
  [Field.toolkit_psql]: "Toolkit: 'psql' path",
  [Field.toolkit_pg_dump]: "Toolkit: 'pg_dump' path",
  [Field.databaseSelection_strategy]: "Database selection",
  [Field.databaseSelection_inclusions]: "Database: inclusions",
  [Field.databaseSelection_exclusions]: "Database: exclusions",
};

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
      [Field.databaseSelection_strategy]: existing?.databaseSelection.strategy ?? "all",
      [Field.databaseSelection_inclusions]:
        existing?.databaseSelection.strategy === "include" ? existing.databaseSelection.inclusions.join(",") : "",
      [Field.databaseSelection_exclusions]:
        existing?.databaseSelection.strategy === "exclude" ? existing.databaseSelection.exclusions.join(",") : "",
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
                strategy: form[Field.databaseSelection_strategy],
              }
            : form[Field.databaseSelection_strategy] === "include"
              ? {
                  strategy: form[Field.databaseSelection_strategy],
                  inclusions: form[Field.databaseSelection_inclusions].split(",").filter(Boolean),
                }
              : {
                  strategy: form[Field.databaseSelection_strategy],
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
  const { LabeledInput } = FormElements.useLabeledInput(Label, register);
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.postgres_backup}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <LabeledInput field={Field.connectionReference} input="text" />
          <LabeledInput field={Field.toolkit_resolution} input="select" options={["automatic", "manual"]} />
          {toolkitResolution === "manual" && (
            <>
              <LabeledInput field={Field.toolkit_psql} input="text" />
              <LabeledInput field={Field.toolkit_pg_dump} input="text" />
            </>
          )}
          <LabeledInput field={Field.databaseSelection_strategy} input="select" options={["all", "include", "exclude"]} />
          {databaseSelectionStrategy === "include" && <LabeledInput field={Field.databaseSelection_inclusions} input="text" />}
          {databaseSelectionStrategy === "exclude" && <LabeledInput field={Field.databaseSelection_exclusions} input="text" />}
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
        <p>This step can be used for creating a Postgres backup</p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
PostgresBackupForm.Field = Field;
PostgresBackupForm.Label = Label;
