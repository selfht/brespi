import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { Button } from "../../comps/Button";
import { Icon } from "../../comps/Icon";
import { Spinner } from "../../comps/Spinner";
import { StepTranslation } from "../../translation/StepTranslation";
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
  onCancel: () => unknown;
  onSubmit: (step: Step.PostgresBackup) => unknown;
  className?: string;
};
export function PostgresBackupForm({ id, existing, onCancel, onSubmit, className }: Props) {
  const { register, handleSubmit, formState, watch } = useForm<Form>({
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
    onSubmit({
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
  };

  const databaseSelectionStrategy = watch("databaseSelectionStrategy");
  return (
    <div className={clsx(className, "u-subgrid font-light")}>
      <div className="col-span-6 pr-3">
        <div className="flex items-center gap-2">
          {existing && <Icon variant="trashcan" />}
          <h1 className="text-2xl font-extralight text-c-dim">{StepTranslation.type(Step.Type.postgres_backup)}</h1>
        </div>

        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label
              className={clsx("w-72", {
                "text-c-error": formState.errors.databaseSelectionStrategy,
              })}
            >
              Database selection
            </label>
            <select
              className={clsx("rounded flex-1 p-2 bg-c-dim/20 font-mono", {
                "outline-2 outline-c-error": formState.errors.databaseSelectionStrategy,
              })}
              {...register("databaseSelectionStrategy", {
                required: true,
              })}
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
              <label
                className={clsx("w-72", {
                  "text-c-error": formState.errors.databaseSelectionInclude?.include,
                })}
              >
                Include
              </label>
              <input
                type="text"
                className={clsx("rounded flex-1 p-2 bg-c-dim/20 font-mono", {
                  "outline-2 outline-c-error": formState.errors.databaseSelectionInclude?.include,
                })}
                {...register("databaseSelectionInclude.include", {
                  setValueAs: (values: string | string[]) => (typeof values === "string" ? values.split(",") : values.join(",")),
                })}
              />
            </div>
          )}
          {databaseSelectionStrategy === "exclude" && (
            <div className="flex items-center">
              <label
                className={clsx("w-72", {
                  "text-c-error": formState.errors.databaseSelectionExclude?.exclude,
                })}
              >
                Exclude
              </label>
              <input
                type="text"
                className={clsx("rounded flex-1 p-2 bg-c-dim/20 font-mono", {
                  "outline-2 outline-c-error": formState.errors.databaseSelectionExclude?.exclude,
                })}
                {...register("databaseSelectionExclude.exclude", {
                  setValueAs: (values: string | string[]) => (typeof values === "string" ? values.split(",") : values.join(",")),
                })}
              />
            </div>
          )}
        </fieldset>

        <div className="mt-12 flex justify-end gap-4">
          {!formState.isSubmitting && <Button onClick={onCancel}>Cancel</Button>}
          <Button
            disabled={formState.isSubmitting}
            onClick={handleSubmit(submit)}
            className="border-c-success text-c-success hover:bg-c-success/20"
          >
            {formState.isSubmitting ? <Spinner className="border-c-success" /> : existing ? "Update Step" : "Add Step"}
          </Button>
        </div>
      </div>
      <div className="col-span-6 pl-3 border-l-2 border-c-dim/20">
        <p>This step can be used for creating a Postgres backup</p>
      </div>
    </div>
  );
}
