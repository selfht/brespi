import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

type Form = {
  databaseSelectionStrategy: "all" | "include" | "exclude";
  databaseSelectionInclude: {
    include: string[];
  };
  databaseSelectionExclude: {
    exclude: string[];
  };
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
      databaseSelectionStrategy: existing?.databaseSelection.strategy ?? "all",
      databaseSelectionInclude: {
        include: existing?.databaseSelection.strategy === "include" ? existing?.databaseSelection.include : [],
      },
      databaseSelectionExclude: {
        exclude: existing?.databaseSelection.strategy === "exclude" ? existing?.databaseSelection.exclude : [],
      },
    },
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        type: Step.Type.postgres_backup,
        databaseSelection:
          form.databaseSelectionStrategy === "all"
            ? {
                strategy: form.databaseSelectionStrategy,
              }
            : form.databaseSelectionStrategy === "include"
              ? {
                  strategy: form.databaseSelectionStrategy,
                  ...form.databaseSelectionInclude,
                }
              : {
                  strategy: form.databaseSelectionStrategy,
                  ...form.databaseSelectionExclude,
                },
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const databaseSelectionStrategy = watch("databaseSelectionStrategy");
  return (
    <FormElements.Container className={className}>
      <FormElements.Container.Left>
        <FormElements.Title stepType={Step.Type.postgres_backup} />

        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label className="w-72">Database selection</label>
            <select className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("databaseSelectionStrategy")}>
              {["all", "include", "exclude"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          {databaseSelectionStrategy === "include" && (
            <div className="flex items-center">
              <label className="w-72">Include</label>
              <input
                type="text"
                className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                {...register("databaseSelectionInclude.include", {
                  setValueAs: (values: string | string[]) => (typeof values === "string" ? values.split(",") : values.join(",")),
                })}
              />
            </div>
          )}
          {databaseSelectionStrategy === "exclude" && (
            <div className="flex items-center">
              <label className="w-72">Exclude</label>
              <input
                type="text"
                className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                {...register("databaseSelectionExclude.exclude", {
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
      </FormElements.Container.Left>
      <FormElements.Container.Right formState={formState} clearErrors={clearErrors}>
        <p>This step can be used for creating a Postgres backup</p>
      </FormElements.Container.Right>
    </FormElements.Container>
  );
}
