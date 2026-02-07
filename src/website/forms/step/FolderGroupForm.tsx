import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: "Used for grouping multiple file artifacts into a single folder artifact.",
  fields: {},
});
type Form = Record<string, never>;

type Props = {
  id: string;
  existing?: Step.FolderGroup;
  onSave: (step: Step.FolderGroup) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function FolderGroupForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const form = useForm<Form>();
  const submit: SubmitHandler<Form> = async () => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId,
        object: "step",
        type: Step.Type.folder_group,
      });
    } catch (error) {
      form.setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };
  return (
    <FormElements.Container className={className}>
      <FormElements.Left>
        <FormElements.ButtonBar
          existing={existing}
          formState={form.formState}
          onSubmit={form.handleSubmit(submit)}
          onDelete={onDelete}
          onCancel={onCancel}
        />
      </FormElements.Left>
      <FormElements.Right form={form} stepType={Step.Type.folder_group} fieldDescriptions={Description}>
        {summary}
      </FormElements.Right>
    </FormElements.Container>
  );
}
FolderGroupForm.Field = Field;
FolderGroupForm.Label = Label;
