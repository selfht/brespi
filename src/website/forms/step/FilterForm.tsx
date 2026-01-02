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

  const filterCriteriaMethod = watch(Field.filterCriteria_method);
  const filterCriteriaMethodOptions: Array<typeof filterCriteriaMethod> = ["exact", "glob", "regex"];
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.filter}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label htmlFor={Field.filterCriteria_method} className="w-72">
              {Label[Field.filterCriteria_method]}
            </label>
            <select
              id={Field.filterCriteria_method}
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.filterCriteria_method)}
            >
              {filterCriteriaMethodOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          {filterCriteriaMethod === "exact" && (
            <div className="flex items-center">
              <label htmlFor={Field.filterCriteria_name} className="w-72">
                {Label[Field.filterCriteria_name]}
              </label>
              <input
                id={Field.filterCriteria_name}
                type="text"
                className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                {...register(Field.filterCriteria_name)}
              />
            </div>
          )}
          {filterCriteriaMethod === "glob" && (
            <div className="flex items-center">
              <label htmlFor={Field.filterCriteria_nameGlob} className="w-72">
                {Label[Field.filterCriteria_nameGlob]}
              </label>
              <input
                id={Field.filterCriteria_nameGlob}
                type="text"
                className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                {...register(Field.filterCriteria_nameGlob)}
              />
            </div>
          )}
          {filterCriteriaMethod === "regex" && (
            <div className="flex items-center">
              <label htmlFor={Field.filterCriteria_nameRegex} className="w-72">
                {Label[Field.filterCriteria_nameRegex]}
              </label>
              <input
                id={Field.filterCriteria_nameRegex}
                type="text"
                className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                {...register(Field.filterCriteria_nameRegex)}
              />
            </div>
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
      <FormElements.Right formState={formState} clearErrors={clearErrors}>
        <p>This step is used for filtering</p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
FilterForm.Field = Field;
FilterForm.Label = Label;
