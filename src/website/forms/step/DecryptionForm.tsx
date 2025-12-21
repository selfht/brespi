import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

type Form = {
  keyReference: string;
  algorithmImplementation: "aes256cbc";
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
      keyReference: existing?.keyReference ?? "",
      algorithmImplementation: existing?.algorithm.implementation ?? "aes256cbc",
    },
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        object: "step",
        type: Step.Type.decryption,
        keyReference: form.keyReference,
        algorithm: {
          implementation: form.algorithmImplementation,
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
      <FormElements.Left stepType={Step.Type.decryption}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label className="w-72">Key Reference</label>
            <input type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("keyReference")} />
          </div>
          <div className="flex items-center">
            <label className="w-72">Algorithm</label>
            <select className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("algorithmImplementation")}>
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
        <p>This step can be used for decrypting artifacts.</p>
        <p>
          The <strong className="font-bold">key reference</strong> specifies which decryption key to use.
        </p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
