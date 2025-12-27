import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

type Form = {
  selectionMethod: "exact" | "glob" | "regex";
  selectionName: string;
  selectionNameGlob: string;
  selectionNameRegex: string;
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
      selectionMethod: existing?.selection.method ?? "exact",
      selectionName: existing?.selection.method === "exact" ? existing.selection.name : "",
      selectionNameGlob: existing?.selection.method === "glob" ? existing.selection.nameGlob : "",
      selectionNameRegex: existing?.selection.method === "regex" ? existing.selection.nameRegex : "",
    },
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
          form.selectionMethod === "exact"
            ? { method: "exact", name: form.selectionName }
            : form.selectionMethod === "glob"
              ? { method: "glob", nameGlob: form.selectionNameGlob }
              : { method: "regex", nameRegex: form.selectionNameRegex },
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const selectionMethod = watch("selectionMethod");
  const selectionMethodOptions: Array<typeof selectionMethod> = ["exact", "glob", "regex"];
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.filter}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label className="w-72">Selection method</label>
            <select className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("selectionMethod")}>
              {selectionMethodOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          {selectionMethod === "exact" && (
            <div className="flex items-center">
              <label className="w-72">Name</label>
              <input type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("selectionName")} />
            </div>
          )}
          {selectionMethod === "glob" && (
            <div className="flex items-center">
              <label className="w-72">Name glob</label>
              <input type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("selectionNameGlob")} />
            </div>
          )}
          {selectionMethod === "regex" && (
            <div className="flex items-center">
              <label className="w-72">Name regex</label>
              <input type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("selectionNameRegex")} />
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
