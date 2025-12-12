import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { Button } from "../../comps/Button";
import { Icon } from "../../comps/Icon";
import { Spinner } from "../../comps/Spinner";
import { StepTranslation } from "../../translation/StepTranslation";
import { FormHelper } from "../FormHelper";

type Form = {
  algorithmImplementation: "targzip";
  algorithmTargzip: {
    level: number;
  };
};
type Props = {
  id: string;
  existing?: Step.Compression;
  onCancel: () => unknown;
  onSubmit: (step: Step.Compression) => Promise<any>;
  className?: string;
};
export function CompressionForm({ id, existing, onCancel, onSubmit, className }: Props) {
  const { register, handleSubmit, formState, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      algorithmImplementation: existing?.algorithm.implementation ?? "targzip",
      algorithmTargzip: {
        level: existing?.algorithm.level ?? 9,
      },
    },
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSubmit({
        id,
        previousId: existing?.previousId || null,
        type: Step.Type.compression,
        algorithm: {
          implementation: form.algorithmImplementation,
          level: form.algorithmTargzip?.level,
        },
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
        <div className="flex items-center gap-2">
          {existing && <Icon variant="trashcan" />}
          <h1 className="text-2xl font-extralight text-c-dim">{StepTranslation.type(Step.Type.compression)}</h1>
        </div>

        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label className="w-72">Algorithm</label>
            <select className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("algorithmImplementation")}>
              <option value="targzip">targzip</option>
            </select>
          </div>
          <div className="flex items-center">
            <label className="w-72">Compression level</label>
            <input
              type="number"
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register("algorithmTargzip.level", {
                valueAsNumber: true,
              })}
            />
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
        {formState.errors.root?.message ? (
          <div className="border-3 border-c-error p-3 rounded-lg flex justify-between items-start">
            <pre className="text-c-error">{formState.errors.root.message}</pre>
            <button className="cursor-pointer" onClick={() => clearErrors()}>
              <Icon variant="close" className="size-5" />
            </button>
          </div>
        ) : (
          <p>This step can be used for compressing artifacts</p>
        )}
      </div>
    </div>
  );
}
