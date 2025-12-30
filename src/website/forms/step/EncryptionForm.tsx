import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  keyReference = "keyReference",
  algorithm_implementation = "algorithm_implementation",
}
type Form = {
  [Field.keyReference]: string;
  [Field.algorithm_implementation]: "aes256cbc";
};
type Props = {
  id: string;
  existing?: Step.Encryption;
  onSave: (step: Step.Encryption) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function EncryptionForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
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
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.encryption}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label htmlFor={Field.keyReference} className="w-72">
              Key Reference
            </label>
            <input
              id={Field.keyReference}
              type="text"
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.keyReference)}
            />
          </div>
          <div className="flex items-center">
            <label htmlFor={Field.algorithm_implementation} className="w-72">
              Algorithm
            </label>
            <select
              id={Field.algorithm_implementation}
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.algorithm_implementation)}
            >
              <option value="aes256cbc">aes256cbc</option>
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
        <p>This step can be used for encrypting artifacts.</p>
        <p>
          The <strong className="font-bold">key reference</strong> specifies which encryption key to use.
        </p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
