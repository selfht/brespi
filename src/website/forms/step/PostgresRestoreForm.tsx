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
  [Field.connectionReference]: "Connection Reference",
  [Field.toolkit_resolution]: "Toolkit resolution",
  [Field.toolkit_psql]: "psql path",
  [Field.toolkit_pg_restore]: "pg_restore path",
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
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.postgres_restore}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label htmlFor={Field.connectionReference} className="w-72">
              {Label[Field.connectionReference]}
            </label>
            <input
              id={Field.connectionReference}
              type="text"
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.connectionReference)}
            />
          </div>
          <div className="flex items-center">
            <label htmlFor={Field.toolkit_resolution} className="w-72">
              {Label[Field.toolkit_resolution]}
            </label>
            <select
              id={Field.toolkit_resolution}
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.toolkit_resolution)}
            >
              <option value="automatic">automatic</option>
              <option value="manual">manual</option>
            </select>
          </div>
          {toolkitResolution === "manual" && (
            <>
              <div className="flex items-center">
                <label htmlFor={Field.toolkit_psql} className="w-72">
                  <span className="text-c-dim">Toolkit:</span> {Label[Field.toolkit_psql]}
                </label>
                <input
                  id={Field.toolkit_psql}
                  type="text"
                  className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                  {...register(Field.toolkit_psql)}
                />
              </div>
              <div className="flex items-center">
                <label htmlFor={Field.toolkit_pg_restore} className="w-72">
                  <span className="text-c-dim">Toolkit:</span> {Label[Field.toolkit_pg_restore]}
                </label>
                <input
                  id={Field.toolkit_pg_restore}
                  type="text"
                  className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                  {...register(Field.toolkit_pg_restore)}
                />
              </div>
            </>
          )}
          <div className="flex items-center">
            <label htmlFor={Field.database} className="w-72">
              {Label[Field.database]}
            </label>
            <input id={Field.database} type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register(Field.database)} />
          </div>
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
