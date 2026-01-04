import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  algorithm_implementation = "algorithm_implementation",
}
const Label: Record<Field, string> = {
  [Field.algorithm_implementation]: "Algorithm",
};

type Form = {
  [Field.algorithm_implementation]: "targzip";
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
      [Field.algorithm_implementation]: existing?.algorithm.implementation ?? "targzip",
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
          implementation: form[Field.algorithm_implementation],
        },
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };
  const { LabeledInput } = FormElements.useLabeledInput(Label, register);
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.decompression}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <LabeledInput field={Field.algorithm_implementation} input="select" options={["targzip"]} />
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
DecompressionForm.Field = Field;
DecompressionForm.Label = Label;
