import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";
import { useEffect } from "react";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: "Used for executing a custom bash script, with the possiblity of generating, transforming or otherwise processing artifacts.",
  fields: {
    path: {
      label: "Script path",
      description: "Specifies the local filesystem path to the bash script.",
    },
    passthrough: {
      label: "Passthrough?",
      description: (
        <p>
          By default, artifacts "pass through" this step without transformation. Disable "passthrough" to receive incoming artifacts inside
          a folder <FormElements.Code break>$BRESPI_ARTIFACTS_IN</FormElements.Code>, in which case the provided bash script will be
          responsible for placing (tranformed) artifacts inside the folder{" "}
          <FormElements.Code break>$BRESPI_ARTIFACTS_OUT</FormElements.Code>.
        </p>
      ),
    },
  },
});

type Form = {
  [Field.path]: string;
  [Field.passthrough]: "true" | "false";
};
function defaultValues(existing: Step.CustomScript | undefined): Form {
  return {
    [Field.path]: existing?.path ?? "",
    [Field.passthrough]: existing ? (existing.passthrough ? "true" : "false") : "true",
  };
}

type Props = {
  id: string;
  existing?: Step.CustomScript;
  onSave: (step: Step.CustomScript) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function CustomScriptForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, watch, setError, clearErrors, reset } = useForm<Form>({
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

  const { activeField, setActiveField } = FormElements.useActiveField<Form>();
  return (
    <FormElements.Container className={className}>
      <FormElements.Left>
        <fieldset disabled={formState.isSubmitting} className="flex flex-col gap-4">
          <FormElements.LabeledInput
            field={Field.path}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.passthrough}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "yesno" }}
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
        stepType={Step.Type.custom_script}
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
CustomScriptForm.Field = Field;
CustomScriptForm.Label = Label;
