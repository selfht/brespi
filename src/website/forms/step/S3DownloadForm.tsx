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
  managedStorage = "managedStorage",
  managedStorage_target = "managedStorage_target",
  managedStorage_version = "managedStorage_version",
  filterCriteria = "filterCriteria",
  filterCriteria_method = "filterCriteria_method",
  filterCriteria_name = "filterCriteria_name",
  filterCriteria_nameGlob = "filterCriteria_nameGlob",
  filterCriteria_nameRegex = "filterCriteria_nameRegex",
}
type Form = {
  [Field.connection_bucket]: string;
  [Field.connection_region]: string;
  [Field.connection_endpoint]: string;
  [Field.connection_accessKeyReference]: string;
  [Field.connection_secretKeyReference]: string;
  [Field.baseFolder]: string;
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
      [Field.connection_region]: existing?.connection.region ?? "",
      [Field.connection_endpoint]: existing?.connection.endpoint ?? "",
      [Field.connection_accessKeyReference]: existing?.connection.accessKeyReference ?? "",
      [Field.connection_secretKeyReference]: existing?.connection.secretKeyReference ?? "",
      [Field.baseFolder]: existing?.baseFolder ?? "",
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
        baseFolder: form[Field.baseFolder],
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
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.s3_download}>
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
          <div className="flex items-center">
            <label htmlFor={Field.managedStorage} className="w-72">
              Use managed storage?
            </label>
            <select id={Field.managedStorage} className="rounded p-2 bg-c-dim/20" {...register(Field.managedStorage)}>
              <option value="true">yes</option>
            </select>
          </div>
          <div className="flex items-center">
            <label htmlFor={Field.managedStorage_target} className="w-72">
              <span className="text-c-dim">Managed storage:</span> target
            </label>
            <select
              id={Field.managedStorage_target}
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.managedStorage_target)}
            >
              <option value="latest">latest</option>
              <option value="specific">specific</option>
            </select>
          </div>
          {managedStorageSelectionTarget === "specific" && (
            <div className="flex items-center">
              <label htmlFor={Field.managedStorage_version} className="w-72">
                <span className="text-c-dim">Managed storage:</span> version
              </label>
              <input
                id={Field.managedStorage_version}
                type="text"
                className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                {...register(Field.managedStorage_version)}
              />
            </div>
          )}
          <div className="flex items-center">
            <label htmlFor={Field.filterCriteria} className="w-72">
              Use filter?
            </label>
            <select id={Field.filterCriteria} className="rounded p-2 bg-c-dim/20" {...register(Field.filterCriteria)}>
              <option value="true">yes</option>
              <option value="false">no</option>
            </select>
          </div>
          {filterCriteria === "true" ? (
            <>
              <div className="flex items-center">
                <label htmlFor={Field.filterCriteria_method} className="w-72">
                  <span className="text-c-dim">Filter:</span> method
                </label>
                <select
                  id={Field.filterCriteria_method}
                  className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                  {...register(Field.filterCriteria_method)}
                >
                  {filterCriteriaMethodOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              {filterCriteriaMethod === "exact" && (
                <div className="flex items-center">
                  <label htmlFor={Field.filterCriteria_name} className="w-72">
                    <span className="text-c-dim">Filter:</span> name
                  </label>
                  <input
                    id={Field.filterCriteria_name}
                    type="text"
                    className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                    {...register(Field.filterCriteria_name)}
                  />
                </div>
              )}
              {filterCriteriaMethod === "glob" && (
                <div className="flex items-center">
                  <label htmlFor={Field.filterCriteria_nameGlob} className="w-72">
                    <span className="text-c-dim">Filter:</span> name glob
                  </label>
                  <input
                    id={Field.filterCriteria_nameGlob}
                    type="text"
                    className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                    {...register(Field.filterCriteria_nameGlob)}
                  />
                </div>
              )}
              {filterCriteriaMethod === "regex" && (
                <div className="flex items-center">
                  <label htmlFor={Field.filterCriteria_nameRegex} className="w-72">
                    <span className="text-c-dim">Filter:</span> name regex
                  </label>
                  <input
                    id={Field.filterCriteria_nameRegex}
                    type="text"
                    className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                    {...register(Field.filterCriteria_nameRegex)}
                  />
                </div>
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
      <FormElements.Right formState={formState} clearErrors={clearErrors}>
        <p>This step can be used for downloading artifacts from S3.</p>
        <p>
          The <strong className="font-bold">access key</strong> and <strong className="font-bold">secret key</strong> references specify
          which S3 credentials to use.
        </p>
        <p>
          The <strong className="font-bold">base folder</strong> specifies the S3 path to download from.
        </p>
        <p>
          The <strong className="font-bold">artifact</strong> specifies which artifact to download.
        </p>
        <p>You can choose to download the latest version or a specific version.</p>
      </FormElements.Right>
    </FormElements.Container>
  );
}
