import { Step } from "@/models/Step";
import clsx from "clsx";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  keyReference = "keyReference",
  algorithm_implementation = "algorithm_implementation",
}
const Label: Record<Field, string> = {
  [Field.keyReference]: "Key reference",
  [Field.algorithm_implementation]: "Algorithm",
};

type Form = {
  [Field.keyReference]: string;
  [Field.algorithm_implementation]: "aes256cbc";
};
type Props = {
  id: string;
  existing?: Step.Decryption;
  onSave: (step: Step.Decryption) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function DecryptionForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      [Field.keyReference]: existing?.keyReference ?? "",
      [Field.algorithm_implementation]: existing?.algorithm.implementation ?? "aes256cbc",
    } satisfies Form,
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        object: "step",
        type: Step.Type.decryption,
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
      <FormElements.Left stepType={Step.Type.decryption}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
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
      <FormElements.Right formState={formState} clearErrors={clearErrors}>
        <p>This step can be used for decrypting artifacts.</p>
        <p>
          The <strong className="font-bold">key reference</strong> specifies which decryption key to use.
        </p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
DecryptionForm.Field = Field;
DecryptionForm.Label = Label;
