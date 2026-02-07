import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";
import { useEffect } from "react";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: "Used for encrypting file artifacts.",
  fields: {
    key: {
      label: "Key",
      description: "Specifies the encryption key.",
    },
    algorithm_implementation: {
      label: "Algorithm",
      description: "Specifies which encryption algorithm to use.",
    },
  },
});

type Form = {
  [Field.key]: string;
  [Field.algorithm_implementation]: "aes256cbc";
};
function defaultValues(existing: Step.Encryption | undefined): Form {
  return {
    [Field.key]: existing?.key ?? "",
    [Field.algorithm_implementation]: existing?.algorithm.implementation ?? "aes256cbc",
  };
}

type Props = {
  id: string;
  existing?: Step.Encryption;
  onSave: (step: Step.Encryption) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function EncryptionForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
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
        type: Step.Type.encryption,
        key: values[Field.key],
        algorithm: {
          implementation: values[Field.algorithm_implementation],
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
            field={Field.key}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.algorithm_implementation}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "select", options: ["aes256cbc"] }}
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
        stepType={Step.Type.encryption}
        fieldDescriptions={Description}
        fieldCurrentlyActive={activeField}
      >
        {summary}
      </FormElements.Right>
    </FormElements.Container>
  );
}
EncryptionForm.Field = Field;
EncryptionForm.Label = Label;
