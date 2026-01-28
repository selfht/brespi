import { Pipeline } from "@/models/Pipeline";
import { Schedule } from "@/models/Schedule";
import { ScheduleClient } from "@/website/clients/ScheduleClient";
import { Button } from "@/website/comps/Button";
import { CronEvaluations } from "@/website/comps/CronEvaluations";
import { Toggle } from "@/website/comps/Toggle";
import { useRegistry } from "@/website/hooks/useRegistry";
import clsx from "clsx";
import { useForm } from "react-hook-form";
import { FormHelper } from "../FormHelper";

type Props = ScheduleEditor.Props;
type Form = {
  [ScheduleEditor.Field.pipelineId]: string;
  [ScheduleEditor.Field.active]: boolean;
  [ScheduleEditor.Field.cron]: string;
};
export function ScheduleEditor({ className, gridClassName, existing, pipelines, onSave, onDelete, onCancel }: Props) {
  const scheduleClient = useRegistry(ScheduleClient);
  const { register, handleSubmit, formState, watch, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      [ScheduleEditor.Field.pipelineId]: existing?.pipelineId ?? "",
      [ScheduleEditor.Field.active]: existing ? existing.active : true,
      [ScheduleEditor.Field.cron]: existing?.cron ?? "",
    } satisfies Form,
  });
  const save = async (form: Form) => {
    try {
      clearErrors();
      await FormHelper.snoozeBeforeSubmit();
      const schedule = existing
        ? await scheduleClient.update(existing.id, {
            pipelineId: form[ScheduleEditor.Field.pipelineId],
            cron: form[ScheduleEditor.Field.cron],
            active: form[ScheduleEditor.Field.active],
          })
        : await scheduleClient.create({
            pipelineId: form[ScheduleEditor.Field.pipelineId],
            cron: form[ScheduleEditor.Field.cron],
            active: form[ScheduleEditor.Field.active],
          });
      onSave(schedule);
    } catch (e) {
      setError("root", {
        message: FormHelper.formatError(e),
      });
    }
  };
  const remove = async () => {
    try {
      clearErrors();
      await FormHelper.snoozeBeforeSubmit();
      if (existing && confirm("Are you sure about deleting this schedule?")) {
        const schedule = await scheduleClient.delete(existing.id);
        onDelete(schedule);
      }
    } catch (e) {
      setError("root", {
        message: FormHelper.formatError(e),
      });
    }
  };

  const cron = watch(ScheduleEditor.Field.cron);
  const active = watch(ScheduleEditor.Field.active);
  return (
    <div className={clsx(className, "border-t border-b border-c-info bg-black")}>
      <fieldset disabled={formState.isSubmitting} className={clsx(gridClassName)}>
        <Toggle id={ScheduleEditor.Field.active} className="ml-2 " {...register(ScheduleEditor.Field.active)} />
        <select
          id={ScheduleEditor.Field.pipelineId}
          className="text-lg p-2 -ml-3 mr-10 border-2 border-c-dim rounded-lg focus:border-c-info outline-none!"
          {...register(ScheduleEditor.Field.pipelineId)}
        >
          <option value="" disabled>
            Select a pipeline
          </option>
          {pipelines.map(({ id, name }) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <input
          id={ScheduleEditor.Field.cron}
          type="text"
          className="font-mono p-2 -ml-3 mr-10 border-2 border-c-dim rounded-lg focus:border-c-info outline-none!"
          placeholder="E.g.: 0 12 * * FRI"
          {...register(ScheduleEditor.Field.cron)}
        />
        <CronEvaluations expression={cron} className={clsx(!active && "text-c-dim line-through decoration-c-error")} />
        <div className="flex flex-col items-end gap-1">
          <Button className="border-none font-normal text-c-success hover:text-white" onClick={handleSubmit(save)}>
            Save
          </Button>
          {existing && (
            <Button className="border-none font-normal text-c-error hover:text-white" onClick={handleSubmit(remove)}>
              Delete
            </Button>
          )}
          <Button className="border-none font-normal text-c-dim hover:text-white" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        {formState.errors.root?.message && <pre className="col-span-full text-c-error">{formState.errors.root.message}</pre>}
      </fieldset>
    </div>
  );
}

export namespace ScheduleEditor {
  export type Props = {
    className?: string;
    gridClassName: string;
    existing?: Schedule;
    pipelines: Pipeline[];
    onSave: (schedule: Schedule) => unknown;
    onDelete: (schedule: Schedule) => unknown;
    onCancel: () => unknown;
  };
  export enum Field {
    pipelineId = "pipelineId",
    active = "active",
    cron = "cron",
  }
}
