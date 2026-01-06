import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";
import { ReactNode } from "react";

enum Field {
  algorithm_implementation = "algorithm_implementation",
  algorithm_targzip_level = "algorithm_targzip_level",
}
const Label: Record<Field, string> = {
  [Field.algorithm_implementation]: "Algorithm",
  [Field.algorithm_targzip_level]: "Algorithm: compression level",
};
const Description: Record<Field, ReactNode> = {
  [Field.algorithm_implementation]: "The selected field specifies which compression algorithm to use.",
  [Field.algorithm_targzip_level]: "The selected field specifies the tar/gzip compression level.",
};

type Form = {
  [Field.algorithm_implementation]: "targzip";
  [Field.algorithm_targzip_level]: number;
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
      [Field.algorithm_targzip_level]: existing?.algorithm.level ?? 9,
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
          level: form[Field.algorithm_targzip_level],
        },
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const { activeField, setActiveField } = FormElements.useActiveField<Form>();
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.compression}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <FormElements.LabeledInput
            field={Field.algorithm_implementation}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "select", options: ["targzip"] }}
          />
          <FormElements.LabeledInput
            field={Field.algorithm_targzip_level}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "number" }}
          />
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
        <p>This step can be used for compressing both file and folder artifacts.</p>
        {activeField && <p className="text-c-info">{Description[activeField]}</p>}
      </FormElements.Right>
    </FormElements.Container>
  );
}
CompressionForm.Field = Field;
CompressionForm.Label = Label;
