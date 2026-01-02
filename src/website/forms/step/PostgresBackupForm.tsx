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
  databaseSelection_include = "databaseSelection_include",
  databaseSelection_exclude = "databaseSelection_exclude",
}
const Label: Record<Field, string> = {
  [Field.connectionReference]: "Connection Reference",
  [Field.toolkit_resolution]: "Toolkit resolution",
  [Field.toolkit_psql]: "psql path",
  [Field.toolkit_pg_dump]: "pg_dump path",
  [Field.databaseSelection_strategy]: "Database selection",
  [Field.databaseSelection_include]: "Include",
  [Field.databaseSelection_exclude]: "Exclude",
};

type Form = {
  [Field.connectionReference]: string;
  [Field.toolkit_resolution]: "automatic" | "manual";
  [Field.toolkit_psql]: string;
  [Field.toolkit_pg_dump]: string;
  [Field.databaseSelection_strategy]: "all" | "include" | "exclude";
  [Field.databaseSelection_include]: string[];
  [Field.databaseSelection_exclude]: string[];
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
      [Field.databaseSelection_include]: existing?.databaseSelection.strategy === "include" ? existing?.databaseSelection.include : [],
      [Field.databaseSelection_exclude]: existing?.databaseSelection.strategy === "exclude" ? existing?.databaseSelection.exclude : [],
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
                  include: form[Field.databaseSelection_include],
                }
              : {
                  strategy: form[Field.databaseSelection_strategy],
                  exclude: form[Field.databaseSelection_exclude],
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
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.postgres_backup}>
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
                <label htmlFor={Field.toolkit_pg_dump} className="w-72">
                  <span className="text-c-dim">Toolkit:</span> {Label[Field.toolkit_pg_dump]}
                </label>
                <input
                  id={Field.toolkit_pg_dump}
                  type="text"
                  className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                  {...register(Field.toolkit_pg_dump)}
                />
              </div>
            </>
          )}
          <div className="flex items-center">
            <label htmlFor={Field.databaseSelection_strategy} className="w-72">
              {Label[Field.databaseSelection_strategy]}
            </label>
            <select
              id={Field.databaseSelection_strategy}
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.databaseSelection_strategy)}
            >
              {["all", "include", "exclude"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          {databaseSelectionStrategy === "include" && (
            <div className="flex items-center">
              <label htmlFor={Field.databaseSelection_include} className="w-72">
                {Label[Field.databaseSelection_include]}
              </label>
              <input
                id={Field.databaseSelection_include}
                type="text"
                className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                {...register(Field.databaseSelection_include, {
                  setValueAs: (values: string | string[]) => (typeof values === "string" ? values.split(",") : values.join(",")),
                })}
              />
            </div>
          )}
          {databaseSelectionStrategy === "exclude" && (
            <div className="flex items-center">
              <label htmlFor={Field.databaseSelection_exclude} className="w-72">
                {Label[Field.databaseSelection_exclude]}
              </label>
              <input
                id={Field.databaseSelection_exclude}
                type="text"
                className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                {...register(Field.databaseSelection_exclude, {
                  setValueAs: (values: string | string[]) => (typeof values === "string" ? values.split(",") : values.join(",")),
                })}
              />
            </div>
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
        <p>This step can be used for creating a Postgres backup</p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
PostgresBackupForm.Field = Field;
PostgresBackupForm.Label = Label;
