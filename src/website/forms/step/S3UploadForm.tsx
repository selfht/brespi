import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";
import { ReactNode } from "react";

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
const Description: Record<Field, ReactNode> = {
  [Field.connection_bucket]: "This field specifies the S3 bucket name to upload to.",
  [Field.connection_region]: "This field specifies the AWS region for the S3 bucket.",
  [Field.connection_endpoint]: "This field specifies the S3-compatible endpoint URL.",
  [Field.connection_accessKeyReference]: "This field specifies which environment variable contains the S3 access key.",
  [Field.connection_secretKeyReference]: "This field specifies which environment variable contains the S3 secret key.",
  [Field.baseFolder]: "This field specifies the S3 path prefix where artifacts will be uploaded.",
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

  const { activeField, setActiveField } = FormElements.useActiveField<Form>();
  return (
    <FormElements.Container className={className}>
      <FormElements.Left>
        <fieldset disabled={formState.isSubmitting} className="flex flex-col gap-4">
          <FormElements.LabeledInput
            field={Field.connection_bucket}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.connection_region}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.connection_endpoint}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.connection_accessKeyReference}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.connection_secretKeyReference}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.baseFolder}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
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
      <FormElements.Right
        stepType={Step.Type.s3_upload}
        formState={formState}
        clearErrors={clearErrors}
        fieldDescriptions={Description}
        fieldCurrentlyActive={activeField}
      >
        <p>A step used for uploading artifacts to S3-compatible storage.</p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
S3UploadForm.Field = Field;
S3UploadForm.Label = Label;
