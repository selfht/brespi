import { Pipeline } from "@/models/Pipeline";
import { Schedule } from "@/models/Schedule";
import { PipelineView } from "@/views/PipelineView";
import clsx from "clsx";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PipelineClient } from "../clients/PipelineClient";
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
import { ScheduleEditor } from "../forms/schedule/ScheduleEditor";

export function schedulesPage() {
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

  const gridClassName = clsx(
    "grid grid-cols-[88px_minmax(220px,3fr)_minmax(180px,2fr)_minmax(100px,2fr)_80px]",
    "items-center p-6",
    "border-t border-c-dim/20",
  );
  const editorCallbacks: Pick<ScheduleEditor.Props, "onSave" | "onDelete" | "onCancel"> = {
    onSave(schedule) {
      const data = query.getData()!;
      if (data.schedules.some((s) => s.id === schedule.id)) {
        // update
        query.setData({
          ...data,
          schedules: data.schedules.map((s) => {
            if (s.id === schedule.id) {
              return Internal.convertToVisualization(schedule, data.pipelines);
            }
            return s;
          }),
        });
      } else {
        // create
        query.setData({
          ...data,
          schedules: [Internal.convertToVisualization(schedule, data.pipelines), ...data.schedules],
        });
      }
      setEditing(undefined);
    },
    onDelete(schedule) {
      const data = query.getData()!;
      query.setData({
        ...data,
        schedules: data.schedules.filter((s) => s.id !== schedule.id),
      });
      setEditing(undefined);
    },
    onCancel() {
      setEditing(undefined);
    },
  };
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
          <>
            {/* Header */}
            <div className={clsx(gridClassName, "border-none rounded-t-2xl bg-[rgb(20,20,20)] text-lg")}>
              <label htmlFor={ScheduleEditor.Field.active}>Active</label>
              <label htmlFor={ScheduleEditor.Field.pipelineId}>Pipeline</label>
              <label htmlFor={ScheduleEditor.Field.cron}>Cron</label>
              <div>Next?</div>
              <div />
            </div>
            {editing === "new" ? (
              <ScheduleEditor
                className={clsx(query.data.schedules.length === 0 && "rounded-b-2xl")}
                gridClassName={gridClassName}
                pipelines={query.data.pipelines}
                {...editorCallbacks}
              />
            ) : (
              <button
                disabled={Boolean(editing)}
                onClick={() => setEditing("new")}
                className={clsx(gridClassName, "w-full cursor-pointer not-disabled:hover:bg-c-dim/20", {
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
              const { id, pipelineId, pipelineName, cron, active } = schedule;
              if (editing && typeof editing !== "string" && editing.id === schedule.id) {
                return (
                  <ScheduleEditor
                    key={schedule.id}
                    gridClassName={gridClassName}
                    className={clsx(index + 1 === length && "rounded-b-2xl")}
                    existing={schedule}
                    pipelines={query.data!.pipelines}
                    {...editorCallbacks}
                  />
                );
              }
              return (
                <div key={id} className={clsx(gridClassName, "border-t border-c-dim/20")} data-testid="schedule-row">
                  <div>
                    <div className="inline-flex items-center pl-3">
                      <span className={clsx("h-5 w-5 rounded-full", active ? "bg-c-success" : "bg-c-error")} />
                    </div>
                  </div>
                  <div className="min-w-0 mr-5">
                    <div className="truncate text-lg font-medium">{pipelineName}</div>
                    <div className="truncate text-c-dim">{pipelineId}</div>
                  </div>
                  <div className="truncate font-mono">{cron}</div>
                  <CronEvaluations expression={cron} className={clsx(!active && "text-c-dim line-through decoration-c-error")} />
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
