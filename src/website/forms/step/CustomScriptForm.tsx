import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  path = "path",
  passthrough = "passthrough",
}
const Label: Record<Field, string> = {
  [Field.path]: "Script path",
  [Field.passthrough]: "Passthrough?",
};

type Form = {
  [Field.path]: string;
  [Field.passthrough]: "true" | "false";
};
type Props = {
  id: string;
  existing?: Step.ScriptExecution;
  onSave: (step: Step.ScriptExecution) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function CustomScriptForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, watch, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      [Field.path]: existing?.path ?? "",
      [Field.passthrough]: existing ? (existing.passthrough ? "true" : "false") : "false",
    } satisfies Form,
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        object: "step",
        type: Step.Type.custom_script,
        path: form[Field.path],
        passthrough: form[Field.passthrough] === "true",
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.custom_script}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label htmlFor={Field.path} className="w-72">
              {Label[Field.path]}
            </label>
            <input id={Field.path} type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register(Field.path)} />
          </div>
          <div className="flex items-center">
            <label htmlFor={Field.passthrough} className="w-72">
              {Label[Field.passthrough]}
            </label>
            <select id={Field.passthrough} className="rounded p-2 bg-c-dim/20" {...register(Field.passthrough)}>
              <option value="true">yes</option>
              <option value="false">no</option>
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
        <p>This step can be used for executing custom scripts on artifacts.</p>
        <p>
          The <strong className="font-bold">script path</strong> references the script file to execute.
        </p>
        <p>
          If <strong className="font-bold">passthrough</strong> is enabled, the original artifacts will be passed along unchanged.
        </p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
CustomScriptForm.Field = Field;
CustomScriptForm.Label = Label;
