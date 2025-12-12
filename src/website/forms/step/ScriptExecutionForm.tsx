import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

type Form = {
  path: string;
  passthrough: boolean;
};
type Props = {
  id: string;
  existing?: Step.ScriptExecution;
  onSave: (step: Step.ScriptExecution) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function ScriptExecutionForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      path: existing?.path ?? "",
      passthrough: existing?.passthrough ?? false,
    },
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        type: Step.Type.script_execution,
        path: form.path,
        passthrough: form.passthrough,
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
        <FormElements.Title stepType={Step.Type.script_execution} />

        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label className="w-72">Script path</label>
            <input type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("path")} />
          </div>
          <div className="flex items-center">
            <label className="w-72">Passthrough?</label>
            <input type="checkbox" className="rounded p-2 bg-c-dim/20" {...register("passthrough")} />
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
          <p>This step can be used for executing custom scripts on artifacts.</p>
          <p>
            The <strong className="font-bold">script path</strong> references the script file to execute.
          </p>
          <p>
            If <strong className="font-bold">passthrough</strong> is enabled, the original artifacts will be passed along unchanged.
          </p>
        </FormElements.DescriptionOrError>
      </div>
    </div>
  );
}
