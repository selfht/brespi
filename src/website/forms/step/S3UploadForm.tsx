import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

type Form = {
  bucket: string;
  endpoint: string;
  region: string;
  accessKeyReference: string;
  secretKeyReference: string;
  baseFolder: string;
};
type Props = {
  id: string;
  existing?: Step.S3Upload;
  onSave: (step: Step.S3Upload) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function S3UploadForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      bucket: existing?.connection.bucket ?? "",
      endpoint: existing?.connection.endpoint ?? "",
      region: existing?.connection.region ?? "",
      accessKeyReference: existing?.connection.accessKeyReference ?? "",
      secretKeyReference: existing?.connection.secretKeyReference ?? "",
      baseFolder: existing?.baseFolder ?? "",
    },
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        object: "step",
        type: Step.Type.s3_upload,
        connection: {
          bucket: form.bucket,
          endpoint: form.endpoint,
          region: form.region || null,
          accessKeyReference: form.accessKeyReference,
          secretKeyReference: form.secretKeyReference,
        },
        baseFolder: form.baseFolder,
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.s3_upload}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label className="w-72">Bucket</label>
            <input type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("bucket")} />
          </div>
          <div className="flex items-center">
            <label className="w-72">Endpoint</label>
            <input type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("endpoint")} />
          </div>
          <div className="flex items-center">
            <label className="w-72">Region</label>
            <input type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("region")} />
          </div>
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
        <p>This step can be used for uploading artifacts to S3.</p>
        <p>
          The <strong className="font-bold">access key</strong> and <strong className="font-bold">secret key</strong> references specify
          which S3 credentials to use.
        </p>
        <p>
          The <strong className="font-bold">base folder</strong> specifies the S3 path where artifacts will be uploaded.
        </p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
