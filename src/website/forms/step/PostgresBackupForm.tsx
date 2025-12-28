import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  connectionReference = "connectionReference",
  databaseSelectionStrategy = "databaseSelectionStrategy",
  databaseSelectionInclude_include = "databaseSelectionInclude_include",
  databaseSelectionExclude_exclude = "databaseSelectionExclude_exclude",
}
type Form = {
  [Field.connectionReference]: string;
  [Field.databaseSelectionStrategy]: "all" | "include" | "exclude";
  [Field.databaseSelectionInclude_include]: string[];
  [Field.databaseSelectionExclude_exclude]: string[];
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
      [Field.databaseSelectionStrategy]: existing?.databaseSelection.strategy ?? "all",
      [Field.databaseSelectionInclude_include]:
        existing?.databaseSelection.strategy === "include" ? existing?.databaseSelection.include : [],
      [Field.databaseSelectionExclude_exclude]:
        existing?.databaseSelection.strategy === "exclude" ? existing?.databaseSelection.exclude : [],
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
        databaseSelection:
          form[Field.databaseSelectionStrategy] === "all"
            ? {
                strategy: form[Field.databaseSelectionStrategy],
              }
            : form[Field.databaseSelectionStrategy] === "include"
              ? {
                  strategy: form[Field.databaseSelectionStrategy],
                  include: form[Field.databaseSelectionInclude_include],
                }
              : {
                  strategy: form[Field.databaseSelectionStrategy],
                  exclude: form[Field.databaseSelectionExclude_exclude],
                },
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const databaseSelectionStrategy = watch(Field.databaseSelectionStrategy);
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.postgres_backup}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label htmlFor={Field.connectionReference} className="w-72">
              Connection Reference
            </label>
            <input
              id={Field.connectionReference}
              type="text"
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.connectionReference)}
            />
          </div>
          <div className="flex items-center">
            <label htmlFor={Field.databaseSelectionStrategy} className="w-72">
              Database selection
            </label>
            <select
              id={Field.databaseSelectionStrategy}
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.databaseSelectionStrategy)}
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
              <label htmlFor={Field.databaseSelectionInclude_include} className="w-72">
                Include
              </label>
              <input
                id={Field.databaseSelectionInclude_include}
                type="text"
                className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                {...register(Field.databaseSelectionInclude_include, {
                  setValueAs: (values: string | string[]) => (typeof values === "string" ? values.split(",") : values.join(",")),
                })}
              />
            </div>
          )}
          {databaseSelectionStrategy === "exclude" && (
            <div className="flex items-center">
              <label htmlFor={Field.databaseSelectionExclude_exclude} className="w-72">
                Exclude
              </label>
              <input
                id={Field.databaseSelectionExclude_exclude}
                type="text"
                className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                {...register(Field.databaseSelectionExclude_exclude, {
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
