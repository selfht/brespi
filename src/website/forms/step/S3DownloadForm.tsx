import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";
import { useEffect } from "react";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: "Used for downloading file artifacts from S3-compatible storage.",
  fields: {
    connection_bucket: {
      label: "Bucket",
      description: "Specifies the S3 bucket name to download from.",
    },
    basePrefix: {
      label: "Base prefix",
      description: 'Specifies the base S3 path prefix where artifacts are retrieved, and must point to a valid "managed storage root".',
    },
    connection_region: {
      label: "Region",
      description: "Specifies the region for the S3 bucket.",
    },
    connection_endpoint: {
      label: "Endpoint",
      description: "Specifies the S3 endpoint URL.",
    },
    connection_accessKey: {
      label: "Access key",
      description: "Specifies the S3 access key.",
    },
    connection_secretKey: {
      label: "Secret key",
      description: "Specifies the S3 secret key.",
    },
    managedStorage: {
      label: "Use managed storage?",
      description: "Enables downloading from a managed storage location (mandatory).",
    },
    managedStorage_target: {
      label: "Managed storage: target",
      description: "Specifies whether to retrieve the latest version of an artifact collection, or a specific version.",
    },
    managedStorage_version: {
      label: "Managed storage: version",
      description: "Determines which specific version to retrieve.",
    },
    filterCriteria: {
      label: "Use filter?",
      description: "Enables filtering artifacts by name when retrieving from managed storage.",
    },
    filterCriteria_method: {
      label: "Filter: method",
      description: "Specifies which matching method to use for filtering.",
    },
    filterCriteria_name: {
      label: "Filter: name",
      description: "Specifies the exact artifact name to match.",
    },
    filterCriteria_nameGlob: {
      label: "Filter: name glob",
      description: "Specifies the glob pattern to match artifact names.",
    },
    filterCriteria_nameRegex: {
      label: "Filter: name regex",
      description: "Specifies the regex pattern to match artifact names.",
    },
  },
});

type Form = {
  [Field.connection_bucket]: string;
  [Field.basePrefix]: string;
  [Field.connection_region]: string;
  [Field.connection_endpoint]: string;
  [Field.connection_accessKey]: string;
  [Field.connection_secretKey]: string;
  [Field.managedStorage]: "true";
  [Field.managedStorage_target]: "latest" | "specific";
  [Field.managedStorage_version]: string;
  [Field.filterCriteria]: "true" | "false";
  [Field.filterCriteria_method]: "exact" | "glob" | "regex";
  [Field.filterCriteria_name]: string;
  [Field.filterCriteria_nameGlob]: string;
  [Field.filterCriteria_nameRegex]: string;
};
function defaultValues(existing: Step.S3Download | undefined): Form {
  return {
    [Field.connection_bucket]: existing?.connection.bucket ?? "",
    [Field.basePrefix]: existing?.basePrefix ?? "",
    [Field.connection_region]: existing?.connection.region ?? "",
    [Field.connection_endpoint]: existing?.connection.endpoint ?? "",
    [Field.connection_accessKey]: existing?.connection.accessKey ?? "",
    [Field.connection_secretKey]: existing?.connection.secretKey ?? "",
    [Field.managedStorage]: "true",
    [Field.managedStorage_target]: existing?.managedStorage.target ?? "latest",
    [Field.managedStorage_version]: existing?.managedStorage.target === "specific" ? existing.managedStorage.version : "",
    [Field.filterCriteria]: existing ? (existing.filterCriteria ? "true" : "false") : "false",
    [Field.filterCriteria_method]: existing?.filterCriteria?.method ?? "exact",
    [Field.filterCriteria_name]: existing?.filterCriteria?.method === "exact" ? existing.filterCriteria.name : "",
    [Field.filterCriteria_nameGlob]: existing?.filterCriteria?.method === "glob" ? existing.filterCriteria.nameGlob : "",
    [Field.filterCriteria_nameRegex]: existing?.filterCriteria?.method === "regex" ? existing.filterCriteria.nameRegex : "",
  };
}

type Props = {
  id: string;
  existing?: Step.S3Download;
  onSave: (step: Step.S3Download) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function S3DownloadForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const form = useForm<Form>({
    defaultValues: defaultValues(existing),
  });
  useEffect(() => form.reset(defaultValues(existing)), [existing]);
  const submit: SubmitHandler<Form> = async (values) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId,
        object: "step",
        type: Step.Type.s3_download,
        connection: {
          bucket: values[Field.connection_bucket],
          region: values[Field.connection_region] || undefined,
          endpoint: values[Field.connection_endpoint],
          accessKey: values[Field.connection_accessKey],
          secretKey: values[Field.connection_secretKey],
        },
        basePrefix: values[Field.basePrefix],
        managedStorage:
          values[Field.managedStorage_target] === "latest"
            ? { target: "latest" }
            : { target: "specific", version: values[Field.managedStorage_version] },
        filterCriteria:
          values[Field.filterCriteria] === "true"
            ? values[Field.filterCriteria_method] === "exact"
              ? { method: "exact", name: values[Field.filterCriteria_name] }
              : values[Field.filterCriteria_method] === "glob"
                ? { method: "glob", nameGlob: values[Field.filterCriteria_nameGlob] }
                : { method: "regex", nameRegex: values[Field.filterCriteria_nameRegex] }
            : undefined,
      });
    } catch (error) {
      form.setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const managedStorageSelectionTarget = form.watch(Field.managedStorage_target);
  const filterCriteria = form.watch(Field.filterCriteria);
  const filterCriteriaMethod = form.watch(Field.filterCriteria_method);
  const filterCriteriaMethodOptions: Array<typeof filterCriteriaMethod> = ["exact", "glob", "regex"];
  const { activeField, setActiveField } = FormElements.useActiveField<Form>();
  return (
    <FormElements.Container className={className}>
      <FormElements.Left>
        <fieldset disabled={form.formState.isSubmitting} className="flex flex-col gap-4">
          <FormElements.LabeledInput
            field={Field.connection_bucket}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.basePrefix}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.connection_region}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.connection_endpoint}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.connection_accessKey}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.connection_secretKey}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.managedStorage}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "yes" }}
          />
          <FormElements.LabeledInput
            field={Field.managedStorage_target}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "select", options: ["latest", "specific"] }}
          />
          {managedStorageSelectionTarget === "specific" && (
            <FormElements.LabeledInput
              field={Field.managedStorage_version}
              labels={Label}
              register={form.register}
              activeField={activeField}
              onActiveFieldChange={setActiveField}
              input={{ type: "text" }}
            />
          )}
          <FormElements.LabeledInput
            field={Field.filterCriteria}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "yesno" }}
          />
          {filterCriteria === "true" && (
            <>
              <FormElements.LabeledInput
                field={Field.filterCriteria_method}
                labels={Label}
                register={form.register}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                input={{ type: "select", options: filterCriteriaMethodOptions }}
              />
              {filterCriteriaMethod === "exact" && (
                <FormElements.LabeledInput
                  field={Field.filterCriteria_name}
                  labels={Label}
                  register={form.register}
                  activeField={activeField}
                  onActiveFieldChange={setActiveField}
                  input={{ type: "text" }}
                />
              )}
              {filterCriteriaMethod === "glob" && (
                <FormElements.LabeledInput
                  field={Field.filterCriteria_nameGlob}
                  labels={Label}
                  register={form.register}
                  activeField={activeField}
                  onActiveFieldChange={setActiveField}
                  input={{ type: "text" }}
                />
              )}
              {filterCriteriaMethod === "regex" && (
                <FormElements.LabeledInput
                  field={Field.filterCriteria_nameRegex}
                  labels={Label}
                  register={form.register}
                  activeField={activeField}
                  onActiveFieldChange={setActiveField}
                  input={{ type: "text" }}
                />
              )}
            </>
          )}
        </fieldset>
        <FormElements.ButtonBar
          className="mt-12"
          existing={existing}
          formState={form.formState}
          onSubmit={form.handleSubmit(submit)}
          onDelete={onDelete}
          onCancel={onCancel}
        />
      </FormElements.Left>
      <FormElements.Right
        form={form} //
        stepType={Step.Type.s3_download}
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
