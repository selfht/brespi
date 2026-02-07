import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";
import { useEffect } from "react";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: "Used for filtering artifacts by name matching.",
  fields: {
    filterCriteria_method: {
      label: "Method",
      description: "Specifies which matching method to use for filtering.",
    },
    filterCriteria_name: {
      label: "Name",
      description: "Specifies the exact artifact name to match.",
    },
    filterCriteria_nameGlob: {
      label: "Name glob",
      description: "Specifies the glob pattern to match artifact names.",
    },
    filterCriteria_nameRegex: {
      label: "Name regex",
      description: "Specifies the regex pattern to match artifact names.",
    },
  },
});

type Form = {
  [Field.filterCriteria_method]: "exact" | "glob" | "regex";
  [Field.filterCriteria_name]: string;
  [Field.filterCriteria_nameGlob]: string;
  [Field.filterCriteria_nameRegex]: string;
};
function defaultValues(existing: Step.Filter | undefined): Form {
  return {
    [Field.filterCriteria_method]: existing?.filterCriteria.method ?? "exact",
    [Field.filterCriteria_name]: existing?.filterCriteria.method === "exact" ? existing.filterCriteria.name : "",
    [Field.filterCriteria_nameGlob]: existing?.filterCriteria.method === "glob" ? existing.filterCriteria.nameGlob : "",
    [Field.filterCriteria_nameRegex]: existing?.filterCriteria.method === "regex" ? existing.filterCriteria.nameRegex : "",
  };
}

type Props = {
  id: string;
  existing?: Step.Filter;
  onSave: (step: Step.Filter) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function FilterForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const form = useForm<Form>({
    defaultValues: defaultValues(existing),
  });
  useEffect(() => form.reset(defaultValues(existing)), [existing]);
  const submit: SubmitHandler<Form> = async (values) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId,
        object: "step",
        type: Step.Type.filter,
        filterCriteria:
          values[Field.filterCriteria_method] === "exact"
            ? { method: "exact", name: values[Field.filterCriteria_name] }
            : values[Field.filterCriteria_method] === "glob"
              ? { method: "glob", nameGlob: values[Field.filterCriteria_nameGlob] }
              : { method: "regex", nameRegex: values[Field.filterCriteria_nameRegex] },
      });
    } catch (error) {
      form.setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const filterCriteriaMethod = form.watch(Field.filterCriteria_method);
  const filterCriteriaMethodOptions: Array<typeof filterCriteriaMethod> = ["exact", "glob", "regex"];
  const { activeField, setActiveField } = FormElements.useActiveField<Form>();
  return (
    <FormElements.Container className={className}>
      <FormElements.Left>
        <fieldset disabled={form.formState.isSubmitting} className="flex flex-col gap-4">
          <FormElements.LabeledInput
            field={Field.filterCriteria_method}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "select", options: filterCriteriaMethodOptions }}
          />
          {filterCriteriaMethod === "exact" && (
            <FormElements.LabeledInput
              field={Field.filterCriteria_name}
              labels={Label}
              register={form.register}
              activeField={activeField}
              onActiveFieldChange={setActiveField}
              input={{ type: "text" }}
            />
          )}
          {filterCriteriaMethod === "glob" && (
            <FormElements.LabeledInput
              field={Field.filterCriteria_nameGlob}
              labels={Label}
              register={form.register}
              activeField={activeField}
              onActiveFieldChange={setActiveField}
              input={{ type: "text" }}
            />
          )}
          {filterCriteriaMethod === "regex" && (
            <FormElements.LabeledInput
              field={Field.filterCriteria_nameRegex}
              labels={Label}
              register={form.register}
              activeField={activeField}
              onActiveFieldChange={setActiveField}
              input={{ type: "text" }}
            />
          )}
        </fieldset>
        <FormElements.ButtonBar
          className="mt-12"
          existing={existing}
          formState={form.formState}
          onSubmit={form.handleSubmit(submit)}
          onDelete={onDelete}
          onCancel={onCancel}
        />
      </FormElements.Left>
      <FormElements.Right
        form={form} //
        stepType={Step.Type.filter}
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
