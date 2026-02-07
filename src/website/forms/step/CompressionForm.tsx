import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";
import { useEffect } from "react";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: "Used for compressing artifacts.",
  fields: {
    algorithm_implementation: {
      label: "Algorithm",
      description: "Specifies which compression algorithm to use.",
    },
    algorithm_targzip_level: {
      label: "Algorithm: compression level",
      description: "Specifies the tar/gzip compression level.",
    },
  },
});

type Form = {
  [Field.algorithm_implementation]: "targzip";
  [Field.algorithm_targzip_level]: number;
};
function defaultValues(existing: Step.Compression | undefined): Form {
  return {
    [Field.algorithm_implementation]: existing?.algorithm.implementation ?? "targzip",
    [Field.algorithm_targzip_level]: existing?.algorithm.level ?? 9,
  };
}

type Props = {
  id: string;
  existing?: Step.Compression;
  onSave: (step: Step.Compression) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function CompressionForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const form = useForm<Form>({
    defaultValues: defaultValues(existing),
  });
  useEffect(() => form.reset(defaultValues(existing)), [existing]);
  const submit: SubmitHandler<Form> = async (values) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId,
        object: "step",
        type: Step.Type.compression,
        algorithm: {
          implementation: values[Field.algorithm_implementation],
          level: values[Field.algorithm_targzip_level],
        },
      });
    } catch (error) {
      form.setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const { activeField, setActiveField } = FormElements.useActiveField<Form>();
  return (
    <FormElements.Container className={className}>
      <FormElements.Left>
        <fieldset disabled={form.formState.isSubmitting} className="flex flex-col gap-4">
          <FormElements.LabeledInput
            field={Field.algorithm_implementation}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "select", options: ["targzip"] }}
          />
          <FormElements.LabeledInput
            field={Field.algorithm_targzip_level}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "number" }}
          />
        </fieldset>
        <FormElements.ButtonBar
          className="mt-12"
          existing={existing}
          formState={form.formState}
          onSubmit={form.handleSubmit(submit)}
          onDelete={onDelete}
          onCancel={onCancel}
        />
      </FormElements.Left>
      <FormElements.Right
        form={form} //
        stepType={Step.Type.compression}
        fieldDescriptions={Description}
        fieldCurrentlyActive={activeField}
      >
        {summary}
      </FormElements.Right>
    </FormElements.Container>
  );
}
CompressionForm.Field = Field;
CompressionForm.Label = Label;
