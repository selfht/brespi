import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: "Used for downloading file artifacts from S3-compatible storage.",
  fields: {
    connection_bucket: {
      label: "Bucket",
      description: "This field specifies the S3 bucket name to download from.",
    },
    basePrefix: {
      label: "Base prefix",
      description:
        'This field specifies the base S3 path prefix where artifacts are retrieved, and must point to a valid "managed storage root".',
    },
    connection_region: {
      label: "Region",
      description: "This field specifies the region for the S3 bucket.",
    },
    connection_endpoint: {
      label: "Endpoint",
      description: "This field specifies the S3 endpoint URL.",
    },
    connection_accessKeyReference: {
      label: "Access key reference",
      description: "This field specifies which environment variable contains the S3 access key.",
    },
    connection_secretKeyReference: {
      label: "Secret key reference",
      description: "This field specifies which environment variable contains the S3 secret key.",
    },
    managedStorage: {
      label: "Use managed storage?",
      description: "This field enables downloading from a managed storage location (mandatory).",
    },
    managedStorage_target: {
      label: "Managed storage: target",
      description: "This field specifies whether to retrieve the latest version of an artifact collection, or a specific version.",
    },
    managedStorage_version: {
      label: "Managed storage: version",
      description: "This field specifies which specific version to retrieve.",
    },
    filterCriteria: {
      label: "Use filter?",
      description: "This field enables filtering artifacts by name when retrieving from managed storage.",
    },
    filterCriteria_method: {
      label: "Filter: method",
      description: "This field specifies which matching method to use for filtering.",
    },
    filterCriteria_name: {
      label: "Filter: name",
      description: "This field specifies the exact artifact name to match.",
    },
    filterCriteria_nameGlob: {
      label: "Filter: name glob",
      description: "This field specifies the glob pattern to match artifact names.",
    },
    filterCriteria_nameRegex: {
      label: "Filter: name regex",
      description: "This field specifies the regex pattern to match artifact names.",
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
  [Field.managedStorage_target]: "latest" | "specific";
  [Field.managedStorage_version]: string;
  [Field.filterCriteria]: "true" | "false";
  [Field.filterCriteria_method]: "exact" | "glob" | "regex";
  [Field.filterCriteria_name]: string;
  [Field.filterCriteria_nameGlob]: string;
  [Field.filterCriteria_nameRegex]: string;
};

type Props = {
  id: string;
  existing?: Step.S3Download;
  onSave: (step: Step.S3Download) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function S3DownloadForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, watch, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      [Field.connection_bucket]: existing?.connection.bucket ?? "",
      [Field.basePrefix]: existing?.basePrefix ?? "",
      [Field.connection_region]: existing?.connection.region ?? "",
      [Field.connection_endpoint]: existing?.connection.endpoint ?? "",
      [Field.connection_accessKeyReference]: existing?.connection.accessKeyReference ?? "",
      [Field.connection_secretKeyReference]: existing?.connection.secretKeyReference ?? "",
      [Field.managedStorage]: "true",
      [Field.managedStorage_target]: existing?.managedStorage.target ?? "latest",
      [Field.managedStorage_version]: existing?.managedStorage.target === "specific" ? existing.managedStorage.version : "",
      [Field.filterCriteria]: existing ? (existing.filterCriteria ? "true" : "false") : "false",
      [Field.filterCriteria_method]: existing?.filterCriteria?.method ?? "exact",
      [Field.filterCriteria_name]: existing?.filterCriteria?.method === "exact" ? existing.filterCriteria.name : "",
      [Field.filterCriteria_nameGlob]: existing?.filterCriteria?.method === "glob" ? existing.filterCriteria.nameGlob : "",
      [Field.filterCriteria_nameRegex]: existing?.filterCriteria?.method === "regex" ? existing.filterCriteria.nameRegex : "",
    } satisfies Form,
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        object: "step",
        type: Step.Type.s3_download,
        connection: {
          bucket: form[Field.connection_bucket],
          region: form[Field.connection_region] || null,
          endpoint: form[Field.connection_endpoint],
          accessKeyReference: form[Field.connection_accessKeyReference],
          secretKeyReference: form[Field.connection_secretKeyReference],
        },
        basePrefix: form[Field.basePrefix],
        managedStorage:
          form[Field.managedStorage_target] === "latest"
            ? { target: "latest" }
            : { target: "specific", version: form[Field.managedStorage_version] },
        filterCriteria:
          form[Field.filterCriteria] === "true"
            ? form[Field.filterCriteria_method] === "exact"
              ? { method: "exact", name: form[Field.filterCriteria_name] }
              : form[Field.filterCriteria_method] === "glob"
                ? { method: "glob", nameGlob: form[Field.filterCriteria_nameGlob] }
                : { method: "regex", nameRegex: form[Field.filterCriteria_nameRegex] }
            : null,
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const managedStorageSelectionTarget = watch(Field.managedStorage_target);
  const filterCriteria = watch(Field.filterCriteria);
  const filterCriteriaMethod = watch(Field.filterCriteria_method);
  const filterCriteriaMethodOptions: Array<typeof filterCriteriaMethod> = ["exact", "glob", "regex"];
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
            field={Field.managedStorage_target}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "select", options: ["latest", "specific"] }}
          />
          {managedStorageSelectionTarget === "specific" && (
            <FormElements.LabeledInput
              field={Field.managedStorage_version}
              labels={Label}
              register={register}
              activeField={activeField}
              onActiveFieldChange={setActiveField}
              input={{ type: "text" }}
            />
          )}
          <FormElements.LabeledInput
            field={Field.filterCriteria}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "yesno" }}
          />
          {filterCriteria === "true" ? (
            <>
              <FormElements.LabeledInput
                field={Field.filterCriteria_method}
                labels={Label}
                register={register}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                input={{ type: "select", options: filterCriteriaMethodOptions }}
              />
              {filterCriteriaMethod === "exact" && (
                <FormElements.LabeledInput
                  field={Field.filterCriteria_name}
                  labels={Label}
                  register={register}
                  activeField={activeField}
                  onActiveFieldChange={setActiveField}
                  input={{ type: "text" }}
                />
              )}
              {filterCriteriaMethod === "glob" && (
                <FormElements.LabeledInput
                  field={Field.filterCriteria_nameGlob}
                  labels={Label}
                  register={register}
                  activeField={activeField}
                  onActiveFieldChange={setActiveField}
                  input={{ type: "text" }}
                />
              )}
              {filterCriteriaMethod === "regex" && (
                <FormElements.LabeledInput
                  field={Field.filterCriteria_nameRegex}
                  labels={Label}
                  register={register}
                  activeField={activeField}
                  onActiveFieldChange={setActiveField}
                  input={{ type: "text" }}
                />
              )}
            </>
          ) : null}
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
        stepType={Step.Type.s3_download}
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
S3DownloadForm.Field = Field;
S3DownloadForm.Label = Label;
