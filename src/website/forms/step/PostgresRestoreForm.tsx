import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

type Form = {
  database: string;
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
  const { register, handleSubmit, formState, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      database: existing?.database ?? "",
    },
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        type: Step.Type.postgres_restore,
        database: form.database,
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };
  return (
    <div className={clsx(className, "u-subgrid font-light")}>
      <div className="col-span-6 pr-3">
        <FormElements.Title stepType={Step.Type.postgres_restore} />

        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label className="w-72">Database</label>
            <input type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("database")} />
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
      </div>
      <div className="col-span-6 pl-3 border-l-2 border-c-dim/20">
        <FormElements.DescriptionOrError formState={formState} clearErrors={clearErrors}>
          <p>This step can be used for restoring a Postgres database from a backup.</p>
          <p>
            The <strong className="font-bold">database</strong> specifies which database to restore to.
          </p>
        </FormElements.DescriptionOrError>
      </div>
    </div>
  );
}
