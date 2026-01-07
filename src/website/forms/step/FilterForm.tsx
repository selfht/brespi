import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: "Used for filtering artifacts by name matching.",
  fields: {
    filterCriteria_method: {
      label: "Method",
      description: "This field specifies which matching method to use for filtering.",
    },
    filterCriteria_name: {
      label: "Name",
      description: "This field specifies the exact artifact name to match.",
    },
    filterCriteria_nameGlob: {
      label: "Name glob",
      description: "This field specifies the glob pattern to match artifact names.",
    },
    filterCriteria_nameRegex: {
      label: "Name regex",
      description: "This field specifies the regex pattern to match artifact names.",
    },
  },
});
type Form = {
  [Field.filterCriteria_method]: "exact" | "glob" | "regex";
  [Field.filterCriteria_name]: string;
  [Field.filterCriteria_nameGlob]: string;
  [Field.filterCriteria_nameRegex]: string;
};

type Props = {
  id: string;
  existing?: Step.Filter;
  onSave: (step: Step.Filter) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function FilterForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, watch, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      [Field.filterCriteria_method]: existing?.filterCriteria.method ?? "exact",
      [Field.filterCriteria_name]: existing?.filterCriteria.method === "exact" ? existing.filterCriteria.name : "",
      [Field.filterCriteria_nameGlob]: existing?.filterCriteria.method === "glob" ? existing.filterCriteria.nameGlob : "",
      [Field.filterCriteria_nameRegex]: existing?.filterCriteria.method === "regex" ? existing.filterCriteria.nameRegex : "",
    } satisfies Form,
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        object: "step",
        type: Step.Type.filter,
        filterCriteria:
          form[Field.filterCriteria_method] === "exact"
            ? { method: "exact", name: form[Field.filterCriteria_name] }
            : form[Field.filterCriteria_method] === "glob"
              ? { method: "glob", nameGlob: form[Field.filterCriteria_nameGlob] }
              : { method: "regex", nameRegex: form[Field.filterCriteria_nameRegex] },
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const filterCriteriaMethod = watch(Field.filterCriteria_method);
  const filterCriteriaMethodOptions: Array<typeof filterCriteriaMethod> = ["exact", "glob", "regex"];
  const { activeField, setActiveField } = FormElements.useActiveField<Form>();
  return (
    <FormElements.Container className={className}>
      <FormElements.Left>
        <fieldset disabled={formState.isSubmitting} className="flex flex-col gap-4">
          <FormElements.LabeledInput
            field={Field.filterCriteria_method}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "select", options: filterCriteriaMethodOptions }}
          />
          {filterCriteriaMethod === "exact" && (
            <FormElements.LabeledInput
              field={Field.filterCriteria_name}
              labels={Label}
              register={register}
              activeField={activeField}
              onActiveFieldChange={setActiveField}
              input={{ type: "text" }}
            />
          )}
          {filterCriteriaMethod === "glob" && (
            <FormElements.LabeledInput
              field={Field.filterCriteria_nameGlob}
              labels={Label}
              register={register}
              activeField={activeField}
              onActiveFieldChange={setActiveField}
              input={{ type: "text" }}
            />
          )}
          {filterCriteriaMethod === "regex" && (
            <FormElements.LabeledInput
              field={Field.filterCriteria_nameRegex}
              labels={Label}
              register={register}
              activeField={activeField}
              onActiveFieldChange={setActiveField}
              input={{ type: "text" }}
            />
          )}
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
        stepType={Step.Type.filter}
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
FilterForm.Field = Field;
FilterForm.Label = Label;
