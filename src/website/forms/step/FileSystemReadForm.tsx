import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { Button } from "../../comps/Button";
import { Icon } from "../../comps/Icon";
import { Spinner } from "../../comps/Spinner";
import { StepTranslation } from "../../translation/StepTranslation";
import { FormHelper } from "../FormHelper";

type Form = {
  path: string;
};
type Props = {
  id: string;
  existing?: Step.FilesystemRead;
  onSave: (step: Step.FilesystemRead) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function FileSystemReadForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      path: existing?.path ?? "",
    },
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        type: Step.Type.filesystem_read,
        path: form.path,
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };
  return (
    <div className={clsx(className, "u-subgrid font-light")}>
      <div className="col-span-6 pr-3">
        <h1 className="text-2xl font-extralight text-c-dim">{StepTranslation.type(Step.Type.filesystem_read)}</h1>

        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label className="w-72">Path</label>
            <input type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("path")} />
          </div>
        </fieldset>

        <div className="mt-12 flex flex-row-reverse justify-between gap-4">
          <div className="flex gap-4">
            {!formState.isSubmitting && <Button onClick={onCancel}>Cancel</Button>}
            <Button
              disabled={formState.isSubmitting}
              onClick={handleSubmit(submit)}
              className="border-c-success text-c-success hover:bg-c-success/20"
            >
              {formState.isSubmitting ? <Spinner className="border-c-success" /> : existing ? "Update Step" : "Add Step"}
            </Button>
          </div>
          {existing && !formState.isSubmitting && (
            <Button className="border-c-error! text-c-error hover:bg-c-error/20" onClick={() => onDelete(existing.id)}>
              Delete Step
            </Button>
          )}
        </div>
      </div>
      <div className="col-span-6 pl-3 border-l-2 border-c-dim/20">
        {formState.errors.root?.message ? (
          <div className="border-3 border-c-error p-3 rounded-lg flex justify-between items-start">
            <pre className="text-c-error">{formState.errors.root.message}</pre>
            <button className="cursor-pointer" onClick={() => clearErrors()}>
              <Icon variant="close" className="size-5" />
            </button>
          </div>
        ) : (
          <>
            <p>This step can be used for reading from the local filesystem.</p>
            <p>
              The <strong className="font-bold">path</strong> references either a file or a folder.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
