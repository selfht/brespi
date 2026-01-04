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
const Label: Record<Field, string> = {
  [Field.connection_bucket]: "Bucket",
  [Field.connection_region]: "Region",
  [Field.connection_endpoint]: "Endpoint",
  [Field.connection_accessKeyReference]: "Access key reference",
  [Field.connection_secretKeyReference]: "Secret key reference",
  [Field.baseFolder]: "Base folder",
};

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
  const { LabeledInput } = FormElements.useLabeledInput(Label, register);
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.s3_upload}>
        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <LabeledInput field={Field.connection_bucket} input={{ type: "text" }} />
          <LabeledInput field={Field.connection_region} input={{ type: "text" }} />
          <LabeledInput field={Field.connection_endpoint} input={{ type: "text" }} />
          <LabeledInput field={Field.connection_accessKeyReference} input={{ type: "text" }} />
          <LabeledInput field={Field.connection_secretKeyReference} input={{ type: "text" }} />
          <LabeledInput field={Field.baseFolder} input={{ type: "text" }} />
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
S3UploadForm.Field = Field;
S3UploadForm.Label = Label;
