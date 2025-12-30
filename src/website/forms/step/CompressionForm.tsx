import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  algorithm_implementation = "algorithm_implementation",
  algorithm_level = "algorithm_level",
}
type Form = {
  [Field.algorithm_implementation]: "targzip";
  [Field.algorithm_level]: number;
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
      [Field.algorithm_implementation]: existing?.algorithm.implementation ?? "targzip",
      [Field.algorithm_level]: existing?.algorithm.level ?? 9,
    } satisfies Form,
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        object: "step",
        type: Step.Type.compression,
        algorithm: {
          implementation: form[Field.algorithm_implementation],
          level: form[Field.algorithm_level],
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
      <FormElements.Left stepType={Step.Type.compression}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label htmlFor={Field.algorithm_implementation} className="w-72">
              Algorithm
            </label>
            <select
              id={Field.algorithm_implementation}
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.algorithm_implementation)}
            >
              <option value="targzip">targzip</option>
            </select>
          </div>
          <div className="flex items-center">
            <label htmlFor={Field.algorithm_level} className="w-72">
              Compression level
            </label>
            <input
              id={Field.algorithm_level}
              type="number"
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.algorithm_level, {
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
      </FormElements.Left>
      <FormElements.Right formState={formState} clearErrors={clearErrors}>
        <p>This step can be used for compressing artifacts</p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
