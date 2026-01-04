import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  algorithm_implementation = "algorithm_implementation",
  algorithm_compression_level = "algorithm_compression_level",
}
const Label: Record<Field, string> = {
  [Field.algorithm_implementation]: "Algorithm",
  [Field.algorithm_compression_level]: "Algorithm: compression level",
};

type Form = {
  [Field.algorithm_implementation]: "targzip";
  [Field.algorithm_compression_level]: number;
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
      [Field.algorithm_compression_level]: existing?.algorithm.level ?? 9,
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
          level: form[Field.algorithm_compression_level],
        },
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };
  const { LabeledInput, activeField } = FormElements.useLabeledInput(Label, register);
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.compression}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <LabeledInput field={Field.algorithm_implementation} input="select" options={["targzip"]} />
          <LabeledInput field={Field.algorithm_compression_level} input="number" />
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
        <p>{activeField}</p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
CompressionForm.Field = Field;
CompressionForm.Label = Label;
