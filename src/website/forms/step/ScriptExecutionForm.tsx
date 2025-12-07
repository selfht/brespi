import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { Button } from "../../comps/Button";
import { Icon } from "../../comps/Icon";
import { Spinner } from "../../comps/Spinner";
import { StepTranslation } from "../../translation/StepTranslation";
import { FormHelper } from "../FormHelper";

type Form = {
  path: string;
  passthrough: boolean;
};
type Props = {
  id: string;
  existing?: Step.ScriptExecution;
  onCancel: () => unknown;
  onSubmit: (step: Step.ScriptExecution) => unknown;
  className?: string;
};
export function ScriptExecutionForm({ id, existing, onCancel, onSubmit, className }: Props) {
  const { register, handleSubmit, formState } = useForm<Form>({
    defaultValues: {
      path: existing?.path ?? "",
      passthrough: existing?.passthrough ?? false,
    },
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    onSubmit({
      id,
      previousStepId: existing?.previousStepId || null,
      type: Step.Type.script_execution,
      path: form.path,
      passthrough: form.passthrough,
    });
  };
  return (
    <div className={clsx(className, "u-subgrid font-light")}>
      <div className="col-span-6 pr-3">
        <div className="flex items-center gap-2">
          {existing && <Icon variant="trashcan" />}
          <h1 className="text-2xl font-extralight text-c-dim">{StepTranslation.type(Step.Type.script_execution)}</h1>
        </div>

        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label
              className={clsx("w-72", {
                "text-c-error": formState.errors.path,
              })}
            >
              Script path
            </label>
            <input
              type="text"
              className={clsx("rounded flex-1 p-2 bg-c-dim/20 font-mono", {
                "outline-2 outline-c-error": formState.errors.path,
              })}
              {...register("path", {
                required: true,
              })}
            />
          </div>
          <div className="flex items-center">
            <label className="w-72">Passthrough?</label>
            <input type="checkbox" className="rounded p-2 bg-c-dim/20" {...register("passthrough")} />
          </div>
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
        <p>This step can be used for executing custom scripts on artifacts.</p>
        <p>
          The <strong className="font-bold">script path</strong> references the script file to execute.
        </p>
        <p>
          If <strong className="font-bold">passthrough</strong> is enabled, the original artifacts will be passed along unchanged.
        </p>
      </div>
    </div>
  );
}
