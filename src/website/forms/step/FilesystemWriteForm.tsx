import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  folder = "folder",
  managedStorage = "managedStorage",
}
const Label: Record<Field, string> = {
  [Field.folder]: "Folder",
  [Field.managedStorage]: "Use managed storage?",
};

type Form = {
  [Field.folder]: string;
  [Field.managedStorage]: "true" | "false";
};
type Props = {
  id: string;
  existing?: Step.FilesystemWrite;
  onSave: (step: Step.FilesystemWrite) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function FilesystemWriteForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      [Field.folder]: existing?.folder ?? "",
      [Field.managedStorage]: existing ? (existing.managedStorage ? "true" : "false") : "false",
    } satisfies Form,
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        object: "step",
        type: Step.Type.filesystem_write,
        folder: form[Field.folder],
        managedStorage: form[Field.managedStorage] === "true",
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };
  const LabeledInput = FormElements.createLabeledInputComponent(Label, register);
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.filesystem_write}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <LabeledInput field={Field.folder} input="text" />
          <LabeledInput field={Field.managedStorage} input="select" options={["true", "false"]} />
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
        <p>This step can be used for writing to the local filesystem.</p>
        <p>
          The <strong className="font-bold">path</strong> references the target location where artifacts will be written.
        </p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
FilesystemWriteForm.Field = Field;
FilesystemWriteForm.Label = Label;
