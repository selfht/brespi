import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: "Used for flattening a nested folder structure into a single collection of file artifacts.",
  fields: {},
});
type Form = Record<string, never>;

type Props = {
  id: string;
  existing?: Step.FolderFlatten;
  onSave: (step: Step.FolderFlatten) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function FolderFlattenForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const form = useForm<Form>();
  const submit: SubmitHandler<Form> = async () => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId,
        object: "step",
        type: Step.Type.folder_flatten,
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
      <FormElements.Right
        form={form} //
        stepType={Step.Type.folder_flatten}
        fieldDescriptions={Description}
      >
        {summary}
      </FormElements.Right>
    </FormElements.Container>
  );
}
FolderFlattenForm.Field = Field;
FolderFlattenForm.Label = Label;
