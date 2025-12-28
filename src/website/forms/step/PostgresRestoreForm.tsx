import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  connectionReference = "connectionReference",
  database = "database",
}
type Form = {
  [Field.connectionReference]: string;
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
  const { register, handleSubmit, formState, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      [Field.connectionReference]: existing?.connectionReference ?? "",
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
        database: form[Field.database],
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.postgres_restore}>
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
            <label htmlFor={Field.database} className="w-72">
              Database
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
