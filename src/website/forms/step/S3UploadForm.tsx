import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

enum Field {
  connection_bucket = "connection_bucket",
  connection_region = "connection_region",
  connection_endpoint = "connection_endpoint",
  connection_accessKeyReference = "connection_accessKeyReference",
  connection_secretKeyReference = "connection_secretKeyReference",
  baseFolder = "baseFolder",
}
type Form = {
  [Field.connection_bucket]: string;
  [Field.connection_region]: string;
  [Field.connection_endpoint]: string;
  [Field.connection_accessKeyReference]: string;
  [Field.connection_secretKeyReference]: string;
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
      [Field.connection_bucket]: existing?.connection.bucket ?? "",
      [Field.connection_region]: existing?.connection.region ?? "",
      [Field.connection_endpoint]: existing?.connection.endpoint ?? "",
      [Field.connection_accessKeyReference]: existing?.connection.accessKeyReference ?? "",
      [Field.connection_secretKeyReference]: existing?.connection.secretKeyReference ?? "",
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
          bucket: form[Field.connection_bucket],
          region: form[Field.connection_region] || null,
          endpoint: form[Field.connection_endpoint],
          accessKeyReference: form[Field.connection_accessKeyReference],
          secretKeyReference: form[Field.connection_secretKeyReference],
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
            <label htmlFor={Field.connection_bucket} className="w-72">
              Bucket
            </label>
            <input
              id={Field.connection_bucket}
              type="text"
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.connection_bucket)}
            />
          </div>
          <div className="flex items-center">
            <label htmlFor={Field.connection_region} className="w-72">
              Region
            </label>
            <input
              id={Field.connection_region}
              type="text"
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.connection_region)}
            />
          </div>
          <div className="flex items-center">
            <label htmlFor={Field.connection_endpoint} className="w-72">
              Endpoint
            </label>
            <input
              id={Field.connection_endpoint}
              type="text"
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.connection_endpoint)}
            />
          </div>
          <div className="flex items-center">
            <label htmlFor={Field.connection_accessKeyReference} className="w-72">
              Access key reference
            </label>
            <input
              id={Field.connection_accessKeyReference}
              type="text"
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.connection_accessKeyReference)}
            />
          </div>
          <div className="flex items-center">
            <label htmlFor={Field.connection_secretKeyReference} className="w-72">
              Secret key reference
            </label>
            <input
              id={Field.connection_secretKeyReference}
              type="text"
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.connection_secretKeyReference)}
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
