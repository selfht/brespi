import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  connectionReference = "connectionReference",
  toolkit_resolution = "toolkit_resolution",
  toolkit_psql = "toolkit_psql",
  toolkit_pg_restore = "toolkit_pg_restore",
  database = "database",
}
const Label: Record<Field, string> = {
  [Field.connectionReference]: "Connection reference",
  [Field.toolkit_resolution]: "Toolkit resolution",
  [Field.toolkit_psql]: "Toolkit: 'psql' path",
  [Field.toolkit_pg_restore]: "Toolkit: 'pg_restore' path",
  [Field.database]: "Database",
};

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
  const { LabeledInput } = FormElements.useLabeledInput(Label, register);
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.postgres_restore}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <LabeledInput field={Field.connectionReference} input="text" />
          <LabeledInput field={Field.toolkit_resolution} input="select" options={["automatic", "manual"]} />
          {toolkitResolution === "manual" && (
            <>
              <LabeledInput field={Field.toolkit_psql} input="text" />
              <LabeledInput field={Field.toolkit_pg_restore} input="text" />
            </>
          )}
          <LabeledInput field={Field.database} input="text" />
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
        <p>This step can be used for restoring a Postgres database from a backup.</p>
        <p>
          The <strong className="font-bold">database</strong> specifies which database to restore to.
        </p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
PostgresRestoreForm.Field = Field;
PostgresRestoreForm.Label = Label;
