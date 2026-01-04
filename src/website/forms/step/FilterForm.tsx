import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  filterCriteria_method = "filterCriteria_method",
  filterCriteria_name = "filterCriteria_name",
  filterCriteria_nameGlob = "filterCriteria_nameGlob",
  filterCriteria_nameRegex = "filterCriteria_nameRegex",
}
const Label: Record<Field, string> = {
  [Field.filterCriteria_method]: "Method",
  [Field.filterCriteria_name]: "Name",
  [Field.filterCriteria_nameGlob]: "Name glob",
  [Field.filterCriteria_nameRegex]: "Name regex",
};

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
  const { LabeledInput } = FormElements.useLabeledInput(Label, register);

  const filterCriteriaMethod = watch(Field.filterCriteria_method);
  const filterCriteriaMethodOptions: Array<typeof filterCriteriaMethod> = ["exact", "glob", "regex"];
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.filter}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <LabeledInput field={Field.filterCriteria_method} input={{ type: "select", options: filterCriteriaMethodOptions }} />
          {filterCriteriaMethod === "exact" && <LabeledInput field={Field.filterCriteria_name} input={{ type: "text" }} />}
          {filterCriteriaMethod === "glob" && <LabeledInput field={Field.filterCriteria_nameGlob} input={{ type: "text" }} />}
          {filterCriteriaMethod === "regex" && <LabeledInput field={Field.filterCriteria_nameRegex} input={{ type: "text" }} />}
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
        <p>This step is used for filtering</p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
FilterForm.Field = Field;
FilterForm.Label = Label;
