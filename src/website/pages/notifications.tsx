import { Pipeline } from "@/models/Pipeline";
import { Schedule } from "@/models/Schedule";
import { PipelineView } from "@/views/PipelineView";
import clsx from "clsx";
import { useForm } from "react-hook-form";
import { NotificationClient } from "../clients/NotificationClient";
import { ScheduleClient } from "../clients/ScheduleClient";
import { Button } from "../comps/Button";
import { CronEvaluations } from "../comps/CronEvaluations";
import { ErrorDump } from "../comps/ErrorDump";
import { Paper } from "../comps/Paper";
import { Skeleton } from "../comps/Skeleton";
import { Spinner } from "../comps/Spinner";
import { FormHelper } from "../forms/FormHelper";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useRegistry } from "../hooks/useRegistry";
import { useYesQuery } from "../hooks/useYesQuery";

export function notifications() {
  useDocumentTitle("Notifications | Brespi");

  const notificationClient = useRegistry(NotificationClient);
  const query = useYesQuery({
    queryFn: () => notificationClient.queryPolicies(),
  });

  return (
    <Skeleton>
      <Paper className="col-span-full">
        {query.error ? (
          <div className="p-6">
            <ErrorDump error={query.error} />
          </div>
        ) : !query.data ? (
          <div className="p-6 text-center">
            <Spinner />
          </div>
        ) : (
          <div>
            <pre>{JSON.stringify(notifications, null, 2)}</pre>
          </div>
        )}
      </Paper>
    </Skeleton>
  );
}

export namespace Internal {
  export type ScheduleVisualization = Schedule & {
    pipelineName: string;
  };
  export function convertToVisualization(schedule: Schedule, pipelines: PipelineView[]): ScheduleVisualization {
    const pipeline = pipelines.find((p) => p.id === schedule.pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found for schedule; pipelineId=${schedule.pipelineId}`);
    }
    return {
      ...schedule,
      pipelineName: pipeline.name,
    };
  }
}

type Props = {
  className?: string;
  gridClassName: string;
  existing?: Schedule;
  pipelines: Pipeline[];
  onSave: (schedule: Schedule) => unknown;
  onDelete: (schedule: Schedule) => unknown;
  onCancel: () => unknown;
};
enum Field {
  pipelineId = "pipelineId",
  active = "active",
  cron = "cron",
}
type Form = {
  [Field.pipelineId]: string;
  [Field.active]: "true" | "false";
  [Field.cron]: string;
};
function ScheduleEditor({ className, gridClassName, existing, pipelines, onSave, onDelete, onCancel }: Props) {
  const scheduleClient = useRegistry(ScheduleClient);
  const { register, handleSubmit, formState, watch, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      [Field.pipelineId]: existing?.pipelineId ?? "",
      [Field.active]: existing ? (existing.active ? "true" : "false") : "true",
      [Field.cron]: existing?.cron ?? "",
    } satisfies Form,
  });
  const save = async (form: Form) => {
    try {
      clearErrors();
      const schedule = existing
        ? await scheduleClient.update(existing.id, {
            pipelineId: form[Field.pipelineId],
            cron: form[Field.cron],
            active: form[Field.active] === "true",
          })
        : await scheduleClient.create({
            pipelineId: form[Field.pipelineId],
            cron: form[Field.cron],
            active: form[Field.active] === "true",
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

  const cron = watch(Field.cron);
  return (
    <div className={clsx(className, "border-t border-b border-c-info bg-black")}>
      <fieldset disabled={formState.isSubmitting} className={clsx(gridClassName)}>
        <select
          id={Field.active}
          className="-ml-1 text-xl p-2 w-16 border-2 border-c-dim rounded-lg focus:border-c-info outline-none!"
          {...register(Field.active)}
        >
          <option value="true">🟢</option>
          <option value="false">🔴</option>
        </select>
        <select
          id={Field.pipelineId}
          className="text-lg p-2 -ml-3 mr-10 border-2 border-c-dim rounded-lg focus:border-c-info outline-none!"
          {...register(Field.pipelineId)}
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
          id={Field.cron}
          type="text"
          className="font-mono p-2 -ml-3 mr-10 border-2 border-c-dim rounded-lg focus:border-c-info outline-none!"
          placeholder="E.g.: 0 12 * * FRI"
          {...register(Field.cron)}
        />
        <CronEvaluations expression={cron} />
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
