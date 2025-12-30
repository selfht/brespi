import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  bucket = "bucket",
  region = "region",
  endpoint = "endpoint",
  accessKeyReference = "accessKeyReference",
  secretKeyReference = "secretKeyReference",
  baseFolder = "baseFolder",
}
type Form = {
  [Field.bucket]: string;
  [Field.region]: string;
  [Field.endpoint]: string;
  [Field.accessKeyReference]: string;
  [Field.secretKeyReference]: string;
  [Field.baseFolder]: string;
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
      [Field.bucket]: existing?.connection.bucket ?? "",
      [Field.region]: existing?.connection.region ?? "",
      [Field.endpoint]: existing?.connection.endpoint ?? "",
      [Field.accessKeyReference]: existing?.connection.accessKeyReference ?? "",
      [Field.secretKeyReference]: existing?.connection.secretKeyReference ?? "",
      [Field.baseFolder]: existing?.baseFolder ?? "",
    } satisfies Form,
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
          bucket: form[Field.bucket],
          region: form[Field.region] || null,
          endpoint: form[Field.endpoint],
          accessKeyReference: form[Field.accessKeyReference],
          secretKeyReference: form[Field.secretKeyReference],
        },
        baseFolder: form[Field.baseFolder],
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
            <label htmlFor={Field.bucket} className="w-72">
              Bucket
            </label>
            <input id={Field.bucket} type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register(Field.bucket)} />
          </div>
          <div className="flex items-center">
            <label htmlFor={Field.region} className="w-72">
              Region
            </label>
            <input id={Field.region} type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register(Field.region)} />
          </div>
          <div className="flex items-center">
            <label htmlFor={Field.endpoint} className="w-72">
              Endpoint
            </label>
            <input id={Field.endpoint} type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register(Field.endpoint)} />
          </div>
          <div className="flex items-center">
            <label htmlFor={Field.accessKeyReference} className="w-72">
              Access Key Reference
            </label>
            <input
              id={Field.accessKeyReference}
              type="text"
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.accessKeyReference)}
            />
          </div>
          <div className="flex items-center">
            <label htmlFor={Field.secretKeyReference} className="w-72">
              Secret Key Reference
            </label>
            <input
              id={Field.secretKeyReference}
              type="text"
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.secretKeyReference)}
            />
          </div>
          <div className="flex items-center">
            <label htmlFor={Field.baseFolder} className="w-72">
              Base Folder
            </label>
            <input id={Field.baseFolder} type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register(Field.baseFolder)} />
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
