import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { Button } from "../../comps/Button";
import { Icon } from "../../comps/Icon";
import { Spinner } from "../../comps/Spinner";
import { StepTranslation } from "../../translation/StepTranslation";
import { FormHelper } from "../FormHelper";

type Form = {
  accessKeyReference: string;
  secretKeyReference: string;
  baseFolder: string;
};
type Props = {
  id: string;
  existing?: Step.S3Upload;
  onCancel: () => unknown;
  onSubmit: (step: Step.S3Upload) => Promise<any>;
  className?: string;
};
export function S3UploadForm({ id, existing, onCancel, onSubmit, className }: Props) {
  const { register, handleSubmit, formState, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      accessKeyReference: existing?.accessKeyReference ?? "",
      secretKeyReference: existing?.secretKeyReference ?? "",
      baseFolder: existing?.baseFolder ?? "",
    },
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSubmit({
        id,
        previousId: existing?.previousId || null,
        type: Step.Type.s3_upload,
        accessKeyReference: form.accessKeyReference,
        secretKeyReference: form.secretKeyReference,
        baseFolder: form.baseFolder,
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
        <div className="flex items-center gap-2">
          {existing && <Icon variant="trashcan" />}
          <h1 className="text-2xl font-extralight text-c-dim">{StepTranslation.type(Step.Type.s3_upload)}</h1>
        </div>

        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label className="w-72">Access Key Reference</label>
            <input type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("accessKeyReference")} />
          </div>
          <div className="flex items-center">
            <label className="w-72">Secret Key Reference</label>
            <input type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("secretKeyReference")} />
          </div>
          <div className="flex items-center">
            <label className="w-72">Base Folder</label>
            <input type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("baseFolder")} />
          </div>
        </fieldset>

        <div className="mt-12 flex justify-end gap-4">
          {!formState.isSubmitting && <Button onClick={onCancel}>Cancel</Button>}
          <Button
            disabled={formState.isSubmitting}
            onClick={handleSubmit(submit)}
            className="border-c-success text-c-success hover:bg-c-success/20"
          >
            {formState.isSubmitting ? <Spinner className="border-c-success" /> : existing ? "Update Step" : "Add Step"}
          </Button>
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
            <p>This step can be used for uploading artifacts to S3.</p>
            <p>
              The <strong className="font-bold">access key</strong> and <strong className="font-bold">secret key</strong> references specify
              which S3 credentials to use.
            </p>
            <p>
              The <strong className="font-bold">base folder</strong> specifies the S3 path where artifacts will be uploaded.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
