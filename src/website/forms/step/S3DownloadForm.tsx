import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";

type Form = {
  accessKeyReference: string;
  secretKeyReference: string;
  baseFolder: string;
  artifact: string;
  selectionTarget: "latest" | "specific";
  selectionSpecificVersion: string;
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
      accessKeyReference: existing?.accessKeyReference ?? "",
      secretKeyReference: existing?.secretKeyReference ?? "",
      baseFolder: existing?.baseFolder ?? "",
      artifact: existing?.artifact ?? "",
      selectionTarget: existing?.selection.target ?? "latest",
      selectionSpecificVersion: existing?.selection.target === "specific" ? existing.selection.version : "",
    },
  });
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId || null,
        type: Step.Type.s3_download,
        accessKeyReference: form.accessKeyReference,
        secretKeyReference: form.secretKeyReference,
        baseFolder: form.baseFolder,
        artifact: form.artifact,
        selection:
          form.selectionTarget === "latest" ? { target: "latest" } : { target: "specific", version: form.selectionSpecificVersion },
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const selectionTarget = watch("selectionTarget");
  return (
    <FormElements.Container className={className}>
      <FormElements.Container.Left>
        <FormElements.Title stepType={Step.Type.s3_download} />

        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
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
          <div className="flex items-center">
            <label className="w-72">Artifact</label>
            <input type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("artifact")} />
          </div>
          <div className="flex items-center">
            <label className="w-72">Version Selection</label>
            <select className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("selectionTarget")}>
              <option value="latest">latest</option>
              <option value="specific">specific</option>
            </select>
          </div>
          {selectionTarget === "specific" && (
            <div className="flex items-center">
              <label className="w-72">Version</label>
              <input type="text" className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register("selectionSpecificVersion")} />
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
      </FormElements.Container.Left>
      <FormElements.Container.Right formState={formState} clearErrors={clearErrors}>
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
      </FormElements.Container.Right>
    </FormElements.Container>
  );
}
