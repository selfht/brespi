import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  selectionMethod = "selectionMethod",
  selectionName = "selectionName",
  selectionNameGlob = "selectionNameGlob",
  selectionNameRegex = "selectionNameRegex",
}
type Form = {
  [Field.selectionMethod]: "exact" | "glob" | "regex";
  [Field.selectionName]: string;
  [Field.selectionNameGlob]: string;
  [Field.selectionNameRegex]: string;
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
      [Field.selectionMethod]: existing?.selection.method ?? "exact",
      [Field.selectionName]: existing?.selection.method === "exact" ? existing.selection.name : "",
      [Field.selectionNameGlob]: existing?.selection.method === "glob" ? existing.selection.nameGlob : "",
      [Field.selectionNameRegex]: existing?.selection.method === "regex" ? existing.selection.nameRegex : "",
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
        selection:
          form[Field.selectionMethod] === "exact"
            ? { method: "exact", name: form[Field.selectionName] }
            : form[Field.selectionMethod] === "glob"
              ? { method: "glob", nameGlob: form[Field.selectionNameGlob] }
              : { method: "regex", nameRegex: form[Field.selectionNameRegex] },
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const selectionMethod = watch(Field.selectionMethod);
  const selectionMethodOptions: Array<typeof selectionMethod> = ["exact", "glob", "regex"];
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.filter}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label htmlFor={Field.selectionMethod} className="w-72">
              Selection method
            </label>
            <select id={Field.selectionMethod} className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register(Field.selectionMethod)}>
              {selectionMethodOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          {selectionMethod === "exact" && (
            <div className="flex items-center">
              <label htmlFor={Field.selectionName} className="w-72">
                Name
              </label>
              <input
                id={Field.selectionName}
                type="text"
                className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                {...register(Field.selectionName)}
              />
            </div>
          )}
          {selectionMethod === "glob" && (
            <div className="flex items-center">
              <label htmlFor={Field.selectionNameGlob} className="w-72">
                Name glob
              </label>
              <input
                id={Field.selectionNameGlob}
                type="text"
                className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                {...register(Field.selectionNameGlob)}
              />
            </div>
          )}
          {selectionMethod === "regex" && (
            <div className="flex items-center">
              <label htmlFor={Field.selectionNameRegex} className="w-72">
                Name regex
              </label>
              <input
                id={Field.selectionNameRegex}
                type="text"
                className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                {...register(Field.selectionNameRegex)}
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
        <p>This step is used for filtering (TODO)</p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
