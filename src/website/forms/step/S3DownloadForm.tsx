import { Step } from "@/models/Step";
import clsx from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";
import { Button } from "../../comps/Button";
import { Icon } from "../../comps/Icon";
import { Spinner } from "../../comps/Spinner";
import { StepTranslation } from "../../translation/StepTranslation";
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
  onCancel: () => unknown;
  onSubmit: (step: Step.S3Download) => unknown;
  className?: string;
};
export function S3DownloadForm({ id, existing, onCancel, onSubmit, className }: Props) {
  const { register, handleSubmit, formState, watch } = useForm<Form>({
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
    onSubmit({
      id,
      previousStepId: existing?.previousStepId || null,
      type: Step.Type.s3_download,
      accessKeyReference: form.accessKeyReference,
      secretKeyReference: form.secretKeyReference,
      baseFolder: form.baseFolder,
      artifact: form.artifact,
      selection: form.selectionTarget === "latest" ? { target: "latest" } : { target: "specific", version: form.selectionSpecificVersion },
    });
  };

  const selectionTarget = watch("selectionTarget");
  return (
    <div className={clsx(className, "u-subgrid font-light")}>
      <div className="col-span-6 pr-3">
        <div className="flex items-center gap-2">
          {existing && <Icon variant="trashcan" />}
          <h1 className="text-2xl font-extralight text-c-dim">{StepTranslation.type(Step.Type.s3_download)}</h1>
        </div>

        <fieldset disabled={formState.isSubmitting} className="mt-8 flex flex-col gap-4">
          <div className="flex items-center">
            <label
              className={clsx("w-72", {
                "text-c-error": formState.errors.accessKeyReference,
              })}
            >
              Access Key Reference
            </label>
            <input
              type="text"
              className={clsx("rounded flex-1 p-2 bg-c-dim/20 font-mono", {
                "outline-2 outline-c-error": formState.errors.accessKeyReference,
              })}
              {...register("accessKeyReference", {
                required: true,
              })}
            />
          </div>
          <div className="flex items-center">
            <label
              className={clsx("w-72", {
                "text-c-error": formState.errors.secretKeyReference,
              })}
            >
              Secret Key Reference
            </label>
            <input
              type="text"
              className={clsx("rounded flex-1 p-2 bg-c-dim/20 font-mono", {
                "outline-2 outline-c-error": formState.errors.secretKeyReference,
              })}
              {...register("secretKeyReference", {
                required: true,
              })}
            />
          </div>
          <div className="flex items-center">
            <label
              className={clsx("w-72", {
                "text-c-error": formState.errors.baseFolder,
              })}
            >
              Base Folder
            </label>
            <input
              type="text"
              className={clsx("rounded flex-1 p-2 bg-c-dim/20 font-mono", {
                "outline-2 outline-c-error": formState.errors.baseFolder,
              })}
              {...register("baseFolder", {
                required: true,
              })}
            />
          </div>
          <div className="flex items-center">
            <label
              className={clsx("w-72", {
                "text-c-error": formState.errors.artifact,
              })}
            >
              Artifact
            </label>
            <input
              type="text"
              className={clsx("rounded flex-1 p-2 bg-c-dim/20 font-mono", {
                "outline-2 outline-c-error": formState.errors.artifact,
              })}
              {...register("artifact", {
                required: true,
              })}
            />
          </div>
          <div className="flex items-center">
            <label
              className={clsx("w-72", {
                "text-c-error": formState.errors.selectionTarget,
              })}
            >
              Version Selection
            </label>
            <select
              className={clsx("rounded flex-1 p-2 bg-c-dim/20 font-mono", {
                "outline-2 outline-c-error": formState.errors.selectionTarget,
              })}
              {...register("selectionTarget", {
                required: true,
              })}
            >
              <option value="latest">latest</option>
              <option value="specific">specific</option>
            </select>
          </div>
          {selectionTarget === "specific" && (
            <div className="flex items-center">
              <label
                className={clsx("w-72", {
                  "text-c-error": formState.errors.selectionSpecificVersion,
                })}
              >
                Version
              </label>
              <input
                type="text"
                className={clsx("rounded flex-1 p-2 bg-c-dim/20 font-mono", {
                  "outline-2 outline-c-error": formState.errors.selectionSpecificVersion,
                })}
                {...register("selectionSpecificVersion", {
                  required: selectionTarget === "specific",
                })}
              />
            </div>
          )}
        </fieldset>

        <div className="mt-12 flex justify-end gap-4">
          {!formState.isSubmitting && <Button onClick={onCancel}>Cancel</Button>}
          <Button
            disabled={formState.isSubmitting}
            onClick={handleSubmit(submit)}
            className="border-c-success text-c-success hover:bg-c-success/20"
          >
            {formState.isSubmitting ? <Spinner className="border-c-success" /> : existing ? "Update Step" : "Add Step"}
          </Button>
        </div>
      </div>
      <div className="col-span-6 pl-3 border-l-2 border-c-dim/20">
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
      </div>
    </div>
  );
}
