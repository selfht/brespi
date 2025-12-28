import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  algorithmImplementation = "algorithmImplementation",
}
type Form = {
  [Field.algorithmImplementation]: "targzip";
};
type Props = {
  id: string;
  existing?: Step.Decompression;
  onSave: (step: Step.Decompression) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function DecompressionForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      [Field.algorithmImplementation]: existing?.algorithm.implementation ?? "targzip",
    } satisfies Form,
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        object: "step",
        type: Step.Type.decompression,
        algorithm: {
          implementation: form[Field.algorithmImplementation],
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
      <FormElements.Left stepType={Step.Type.decompression}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label htmlFor={Field.algorithmImplementation} className="w-72">
              Algorithm
            </label>
            <select
              id={Field.algorithmImplementation}
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.algorithmImplementation)}
            >
              <option value="targzip">targzip</option>
            </select>
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
        <p>This step can be used for decompressing artifacts.</p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
