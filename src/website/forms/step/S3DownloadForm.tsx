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
  managedStorage_selectionTarget = "managedStorage_selectionTarget",
  managedStorage_selectionSpecificVersion = "managedStorage_selectionSpecificVersion",
  filterCriteria = "filterCriteria",
  filterCriteria_method = "filterCriteria_method",
  filterCriteria_name = "filterCriteria_name",
  filterCriteria_nameGlob = "filterCriteria_nameGlob",
  filterCriteria_nameRegex = "filterCriteria_nameRegex",
}
type Form = {
  [Field.bucket]: string;
  [Field.region]: string;
  [Field.endpoint]: string;
  [Field.accessKeyReference]: string;
  [Field.secretKeyReference]: string;
  [Field.baseFolder]: string;
  [Field.managedStorage_selectionTarget]: "latest" | "specific";
  [Field.managedStorage_selectionSpecificVersion]: string;
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
      [Field.bucket]: existing?.connection.bucket ?? "",
      [Field.region]: existing?.connection.region ?? "",
      [Field.endpoint]: existing?.connection.endpoint ?? "",
      [Field.accessKeyReference]: existing?.connection.accessKeyReference ?? "",
      [Field.secretKeyReference]: existing?.connection.secretKeyReference ?? "",
      [Field.baseFolder]: existing?.baseFolder ?? "",
      [Field.managedStorage_selectionTarget]: existing?.managedStorage.selection.target ?? "latest",
      [Field.managedStorage_selectionSpecificVersion]:
        existing?.managedStorage.selection.target === "specific" ? existing.managedStorage.selection.version : "",
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
          bucket: form[Field.bucket],
          region: form[Field.region] || null,
          endpoint: form[Field.endpoint],
          accessKeyReference: form[Field.accessKeyReference],
          secretKeyReference: form[Field.secretKeyReference],
        },
        baseFolder: form[Field.baseFolder],
        managedStorage: {
          selection:
            form[Field.managedStorage_selectionTarget] === "latest"
              ? { target: "latest" }
              : { target: "specific", version: form[Field.managedStorage_selectionSpecificVersion] },
        },
        filterCriteria: null,
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const selectionTarget = watch(Field.managedStorage_selectionTarget);
  return (
    <FormElements.Container className={className}>
      <FormElements.Left stepType={Step.Type.s3_download}>
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
          <div className="flex items-center">
            <label htmlFor={Field.managedStorage_selectionTarget} className="w-72">
              Version selection
            </label>
            <select
              id={Field.managedStorage_selectionTarget}
              className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
              {...register(Field.managedStorage_selectionTarget)}
            >
              <option value="latest">latest</option>
              <option value="specific">specific</option>
            </select>
          </div>
          {selectionTarget === "specific" && (
            <div className="flex items-center">
              <label htmlFor={Field.managedStorage_selectionSpecificVersion} className="w-72">
                Version
              </label>
              <input
                id={Field.managedStorage_selectionSpecificVersion}
                type="text"
                className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
                {...register(Field.managedStorage_selectionSpecificVersion)}
              />
            </div>
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
