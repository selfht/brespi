import { Schedule } from "@/models/Schedule";
import { PipelineView } from "@/views/PipelineView";
import { Temporal } from "@js-temporal/polyfill";
import clsx from "clsx";
import { Cron } from "croner";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { PipelineClient } from "../clients/PipelineClient";
import { ScheduleClient } from "../clients/ScheduleClient";
import { Button } from "../comps/Button";
import { ErrorDump } from "../comps/ErrorDump";
import { Paper } from "../comps/Paper";
import { Skeleton } from "../comps/Skeleton";
import { Spinner } from "../comps/Spinner";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useRegistry } from "../hooks/useRegistry";
import { useYesQuery } from "../hooks/useYesQuery";
import { Prettify } from "@/helpers/Prettify";

const mockData: Array<Schedule & { pipelineName: string; nextCronEvaluation: string }> = [
  {
    id: Math.random().toString(),
    object: "schedule",
    pipelineId: Math.random().toString(),
    pipelineName: "Storage Read",
    cron: "0 3 * * *",
    nextCronEvaluation: "Tomorrow 03:00",
    active: true,
  },
  {
    id: Math.random().toString(),
    object: "schedule",
    pipelineId: Math.random().toString(),
    pipelineName: "Backup Everything",
    cron: "* * 10 * *",
    nextCronEvaluation: "Sometime with 10 in it",
    active: false,
  },
];

export function schedules() {
  useDocumentTitle("Schedules | Brespi");
  const [editing, setEditing] = useState<"new" | Schedule>();

  const scheduleClient = useRegistry(ScheduleClient);
  const pipelineClient = useRegistry(PipelineClient);
  const query = useYesQuery({
    queryFn: () =>
      Promise.all([scheduleClient.query(), pipelineClient.query()]).then(([schedules, pipelines]) => ({
        schedules: schedules.map((s) => Internal.convertToVisualization(s, pipelines)),
        pipelines,
      })),
  });

  useEffect(() => {
    // recalculate the `next evaluation` for each cron
    const token = setInterval(() => {
      const data = query.getData();
      if (data?.schedules.length) {
        query.setData({
          ...data,
          schedules: data.schedules.map((schedule) => ({
            ...schedule,
            nextCronEvaluation: Internal.calculateNextCronEvaluation(schedule.cron),
          })),
        });
      }
    }, 1000);
    return () => clearInterval(token);
  }, []);

  const className = clsx(
    "grid grid-cols-[88px_minmax(220px,3fr)_minmax(180px,1.5fr)_minmax(100px,2fr)_80px]",
    "items-center p-6",
    "border-t border-c-dim/20",
  );
  return (
    <Skeleton>
      <Paper className="col-span-full">
        {query.error ? (
          <div className="p-6 text-center">
            <ErrorDump error={query.error} />
          </div>
        ) : !query.data ? (
          <div className="p-6 text-center">
            <Spinner />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className={clsx(className, "border-none rounded-t-2xl bg-[rgb(20,20,20)] text-lg")}>
              <div>Active</div>
              <div>Pipeline</div>
              <div>Cron</div>
              <div>Next?</div>
              <div />
            </div>
            {editing === "new" ? (
              <ScheduleEditor
                className={clsx(className, query.data.schedules.length === 0 && "rounded-b-2xl")}
                onClose={() => setEditing(undefined)}
              />
            ) : (
              <button
                disabled={Boolean(editing)}
                onClick={() => setEditing("new")}
                className={clsx(className, "w-full cursor-pointer not-disabled:hover:bg-c-dim/20", {
                  "cursor-not-allowed!": editing,
                  "pb-8!": query.data.schedules.length === 0,
                })}
              >
                <div className="inline-flex items-center pl-3">
                  <span className="h-5 w-5 rounded-full bg-c-info" />
                </div>
                <div className="col-span-4 text-start text-lg underline underline-offset-2 decoration-2 decoration-c-info">
                  New Schedule ...
                </div>
              </button>
            )}
            {/* Data */}
            {query.data.schedules.map((schedule, index, { length }) => {
              const { id, pipelineId, pipelineName, cron, nextCronEvaluations, active } = schedule;
              if (editing && typeof editing !== "string" && editing.id === schedule.id) {
                return (
                  <ScheduleEditor
                    className={clsx(className, index + 1 === length && "rounded-b-2xl")}
                    existing={schedule}
                    onClose={() => setEditing(undefined)}
                  />
                );
              }
              return (
                <div key={id} className={clsx(className, "border-t border-c-dim/20")}>
                  <div>
                    <div className="inline-flex items-center pl-3">
                      <span className={clsx("h-5 w-5 rounded-full", active ? "bg-c-success" : "bg-c-error")} />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-lg font-medium">{pipelineName}</div>
                    <div className="truncate text-c-dim">{pipelineId}</div>
                  </div>
                  <div className="font-mono truncate">{cron}</div>
                  <div className={clsx("truncate", !active && "text-c-dim line-through decoration-c-error")}>
                    {nextCronEvaluations.map((nextCronEvaluation, index) => (
                      <div key={nextCronEvaluation.toString()} style={{ opacity: 1 - index * 0.1 }}>
                        {Prettify.timestamp(nextCronEvaluation)}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => setEditing(schedule)}
                      disabled={Boolean(editing)}
                      className="border-none font-normal text-c-dim hover:text-white"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </Paper>
    </Skeleton>
  );
}

export namespace Internal {
  export type ScheduleVisualization = Schedule & {
    pipelineName: string;
    nextCronEvaluations: Temporal.PlainDateTime[];
  };
  export function convertToVisualization(schedule: Schedule, pipelines: PipelineView[]): ScheduleVisualization {
    const pipeline = pipelines.find((p) => p.id === schedule.pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found for schedule; pipelineId=${schedule.pipelineId}`);
    }
    return {
      ...schedule,
      pipelineName: pipeline.name,
      nextCronEvaluations: calculateNextCronEvaluation(schedule.cron),
    };
  }
  export function tryCalculateNextCronEvaluation(cronExpression: string): Temporal.PlainDateTime[] | undefined {
    try {
      return calculateNextCronEvaluation(cronExpression);
    } catch (e) {
      return undefined; // invalid cron
    }
  }
  export function calculateNextCronEvaluation(cronExpression: string): Temporal.PlainDateTime[] {
    const cron = new Cron(cronExpression.trim());
    try {
      const now = Temporal.Now.plainDateTimeISO();
      const nowMillis = Date.now();
      return cron.nextRuns(3).map((date) => now.add({ milliseconds: date.getTime() - nowMillis }));
    } finally {
      cron.stop();
    }
  }
}

type Props = {
  className?: string;
  existing?: Schedule;
  onClose?: () => unknown;
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
function ScheduleEditor({ className, existing, onClose }: Props) {
  const { register, handleSubmit, formState, watch, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      [Field.pipelineId]: existing?.pipelineId ?? "",
      [Field.active]: existing ? (existing.active ? "true" : "false") : "true",
      [Field.cron]: "",
    } satisfies Form,
  });
  const save = async () => {
    console.log("Saving");
  };
  const remove = async () => {
    console.log("Deleting");
  };

  const cron = watch(Field.cron);
  const nextCronEvaluations = Internal.tryCalculateNextCronEvaluation(cron);

  return (
    <fieldset disabled={formState.isSubmitting} className={clsx(className, "border-t border-b border-c-info bg-black")}>
      <select
        {...register(Field.active)}
        className="-ml-1 text-xl p-2 w-16 border-2 border-c-dim rounded-lg focus:border-c-info outline-none!"
      >
        <option value="true">🟢</option>
        <option value="false">🔴</option>
      </select>
      <select
        {...register(Field.pipelineId)}
        className="text-lg p-2 -ml-3 mr-10 border-2 border-c-dim rounded-lg focus:border-c-info outline-none!"
      >
        <option>Pipeline A</option>
        <option>Pipeline B</option>
      </select>
      <input
        type="text"
        className="font-mono p-2 -ml-3 mr-10 border-2 border-c-dim rounded-lg focus:border-c-info outline-none!"
        {...register(Field.cron)}
      />
      <div className="flex flex-col items-start gap-1">
        {nextCronEvaluations?.map((nextCronEvaluation, index) => (
          <div key={nextCronEvaluation.toString()} style={{ opacity: 1 - index * 0.2 }}>
            {Prettify.timestamp(nextCronEvaluation)}
          </div>
        ))}
      </div>
      <div className="flex flex-col items-end gap-1">
        <Button className="border-none font-normal text-c-success hover:text-white" onClick={handleSubmit(save)}>
          Save
        </Button>
        {existing && (
          <Button className="border-none font-normal text-c-error hover:text-white" onClick={handleSubmit(save)}>
            Delete
          </Button>
        )}
        <Button className="border-none font-normal text-c-dim hover:text-white" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </fieldset>
  );
}
