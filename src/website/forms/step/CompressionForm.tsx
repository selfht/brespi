import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
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
  onSave: (step: Step.Compression) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function CompressionForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
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
      await onSave({
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
    <FormElements.Container className={className}>
      <FormElements.Container.Left>
        <FormElements.Title stepType={Step.Type.compression} />

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
        <p>This step can be used for compressing artifacts</p>
      </FormElements.Container.Right>
    </FormElements.Container>
  );
}
