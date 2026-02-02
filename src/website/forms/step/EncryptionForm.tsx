import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";
import { useEffect } from "react";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: "Used for encrypting file artifacts.",
  fields: {
    keyReference: {
      label: "Key reference",
      description: "Specifies which environment variable contains the encryption key.",
    },
    algorithm_implementation: {
      label: "Algorithm",
      description: "Specifies which encryption algorithm to use.",
    },
  },
});

type Form = {
  [Field.keyReference]: string;
  [Field.algorithm_implementation]: "aes256cbc";
};
function defaultValues(existing: Step.Encryption | undefined): Form {
  return {
    [Field.keyReference]: existing?.keyReference ?? "",
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
  const { register, handleSubmit, formState, setError, clearErrors, reset } = useForm<Form>({
    defaultValues: defaultValues(existing),
  });
  useEffect(() => reset(defaultValues(existing)), [existing]);
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        object: "step",
        type: Step.Type.encryption,
        keyReference: form[Field.keyReference],
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

  const { activeField, setActiveField } = FormElements.useActiveField<Form>();
  return (
    <FormElements.Container className={className}>
      <FormElements.Left>
        <fieldset disabled={formState.isSubmitting} className="flex flex-col gap-4">
          <FormElements.LabeledInput
            field={Field.keyReference}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.algorithm_implementation}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "select", options: ["aes256cbc"] }}
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
      <FormElements.Right
        stepType={Step.Type.encryption}
        formState={formState}
        clearErrors={clearErrors}
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
