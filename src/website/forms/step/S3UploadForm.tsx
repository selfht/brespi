import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";
import { useEffect } from "react";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: "Used for uploading file artifacts to S3-compatible storage.",
  fields: {
    connection_bucket: {
      label: "Bucket",
      description: "Specifies the S3 bucket name to upload to.",
    },
    basePrefix: {
      label: "Base prefix",
      description:
        'Specifies the base S3 path prefix where artifacts will be uploaded to managed storage. If no "managed storage root" is detected at the provided base prefix, it will be initialized upon first execution.',
    },
    connection_region: {
      label: "Region",
      description: "Specifies the region for the S3 bucket.",
    },
    connection_endpoint: {
      label: "Endpoint",
      description: "Specifies the S3 endpoint URL.",
    },
    connection_accessKeyReference: {
      label: "Access key reference",
      description: "Specifies which environment variable contains the S3 access key.",
    },
    connection_secretKeyReference: {
      label: "Secret key reference",
      description: "Specifies which environment variable contains the S3 secret key.",
    },
    managedStorage: {
      label: "Use managed storage?",
      description: "Enables uploading to a managed storage location (mandatory).",
    },
    retentionPolicy: {
      label: "Retention policy",
      description: "Specifies the automated cleanup retention policy for stored artifacts.",
    },
    retentionMaxVersions: {
      label: "Retention: max versions",
      description: "Specifies how many versions can be stored, before automatic cleanup activates.",
    },
  },
});

type Form = {
  [Field.connection_bucket]: string;
  [Field.basePrefix]: string;
  [Field.connection_region]: string;
  [Field.connection_endpoint]: string;
  [Field.connection_accessKeyReference]: string;
  [Field.connection_secretKeyReference]: string;
  [Field.managedStorage]: "true";
  [Field.retentionPolicy]: "none" | "last_n_versions";
  [Field.retentionMaxVersions]: number;
};
function defaultValues(existing: Step.S3Upload | undefined): Form {
  return {
    [Field.connection_bucket]: existing?.connection.bucket ?? "",
    [Field.basePrefix]: existing?.basePrefix ?? "",
    [Field.connection_region]: existing?.connection.region ?? "",
    [Field.connection_endpoint]: existing?.connection.endpoint ?? "",
    [Field.connection_accessKeyReference]: existing?.connection.accessKeyReference ?? "",
    [Field.connection_secretKeyReference]: existing?.connection.secretKeyReference ?? "",
    [Field.managedStorage]: "true",
    [Field.retentionPolicy]: existing ? (existing.retention ? existing.retention.policy : "none") : "none",
    [Field.retentionMaxVersions]: existing ? (existing.retention ? existing.retention.maxVersions : 10) : 10,
  };
}

type Props = {
  id: string;
  existing?: Step.S3Upload;
  onSave: (step: Step.S3Upload) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function S3UploadForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, watch, setError, clearErrors, reset } = useForm<Form>({
    defaultValues: defaultValues(existing),
  });
  useEffect(() => reset(defaultValues(existing)), [existing]);
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
        basePrefix: form[Field.basePrefix],
        retention:
          form[Field.retentionPolicy] === "last_n_versions"
            ? { policy: "last_n_versions", maxVersions: form[Field.retentionMaxVersions] }
            : null,
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const retentionPolicy = watch(Field.retentionPolicy);
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
            field={Field.basePrefix}
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
            field={Field.managedStorage}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "yes" }}
          />
          <FormElements.LabeledInput
            field={Field.retentionPolicy}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{
              type: "select",
              options: ["none", "last_n_versions"] satisfies Array<Form["retentionPolicy"]>,
            }}
          />
          {retentionPolicy === "last_n_versions" && (
            <FormElements.LabeledInput
              field={Field.retentionMaxVersions}
              labels={Label}
              register={register}
              activeField={activeField}
              onActiveFieldChange={setActiveField}
              input={{ type: "number" }}
            />
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
      <FormElements.Right
        stepType={Step.Type.s3_upload}
        formState={formState}
        clearErrors={clearErrors}
        fieldDescriptions={Description}
        fieldCurrentlyActive={activeField}
      >
        {summary}
      </FormElements.Right>
    </FormElements.Container>
  );
}
S3UploadForm.Field = Field;
S3UploadForm.Label = Label;
