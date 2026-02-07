import { Prettify } from "@/helpers/Prettify";
import { Outcome } from "@/models/Outcome";
import { ProblemDetails } from "@/models/ProblemDetails";
import { ServerMessage } from "@/socket/ServerMessage";
import { PipelineView } from "@/views/PipelineView";
import { Temporal } from "@js-temporal/polyfill";
import clsx from "clsx";
import { useEffect } from "react";
import { Link } from "react-router";
import { DialogClient } from "../clients/DialogClient";
import { PipelineClient } from "../clients/PipelineClient";
import { SocketClient } from "../clients/SocketClient";
import { ErrorDump } from "../comps/ErrorDump";
import { ExecutionIcon } from "../comps/ExecutionIcon";
import { Paper } from "../comps/Paper";
import { Skeleton } from "../comps/Skeleton";
import { Spinner } from "../comps/Spinner";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useRegistry } from "../hooks/useRegistry";
import { useYesQuery } from "../hooks/useYesQuery";

export function pipelinesPage() {
  useDocumentTitle("Pipelines | Brespi");
  const pipelineClient = useRegistry(PipelineClient);
  const socketClient = useRegistry(SocketClient);

  const query = useYesQuery<Internal.PipelineVisualization[], ProblemDetails>({
    queryFn: () =>
      pipelineClient.query().then<Internal.PipelineVisualization[]>((pipelines) => [
        {
          link: "/pipelines/new",
          title: "New Pipeline ...",
          titleUnderline: true,
          icon: "new",
          currentlyExecutingId: null,
        },
        ...pipelines.map(Internal.convertToVisualization),
      ]),
  });

  useEffect(() => {
    const token = socketClient.subscribe({
      type: ServerMessage.Type.execution_update,
      callback: () => query.reload(),
    });
    return () => socketClient.unsubscribe(token);
  }, []);
  const isSomePipelineExecuting = query.data?.some((pipeline) => pipeline.icon === "loading") || false;
  useEffect(() => {
    const interval = Temporal.Duration.from({
      seconds: isSomePipelineExecuting ? 2 : 20,
    });
    const token = setInterval(() => query.reload(), interval.total("milliseconds"));
    return () => clearInterval(token);
  }, [isSomePipelineExecuting]);

  const dialogClient = useRegistry(DialogClient);
  const doConfirm = async () => {
    const result = await dialogClient.confirm({
      render({ yesNoButtons }) {
        return (
          <div>
            <p>Are you sure about deleting this?</p>
            {yesNoButtons()}
          </div>
        );
      },
    });
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
          query.data.map(({ link, title, titleUnderline, subtitle, icon }, index, { length }) => (
            <Link
              key={link}
              to={link}
              className={clsx("flex items-center gap-6 hover:bg-c-dim/20 p-6", {
                "border-t border-c-dim/20": index > 0,
                "rounded-t-2xl": index === 0,
                "rounded-b-2xl": index + 1 === length,
              })}
            >
              <ExecutionIcon variant={icon} />
              <div>
                <h3
                  className={clsx("text-lg font-medium", titleUnderline && "underline underline-offset-2 decoration-2 decoration-c-accent")}
                >
                  {title}
                </h3>
                {subtitle && <p className="font-light italic text-c-dim">{subtitle}</p>}
              </div>
            </Link>
          ))
        )}
      </Paper>
    </Skeleton>
  );
}

export namespace Internal {
  export type PipelineVisualization = {
    link: string;
    title: string;
    titleUnderline: boolean;
    subtitle?: string;
    icon: ExecutionIcon.Props["variant"];
  };
  export function convertToVisualization({ id, name, lastExecution }: PipelineView): PipelineVisualization {
    let subtitle = "";
    let icon: PipelineVisualization["icon"];
    if (lastExecution) {
      if (lastExecution.result) {
        subtitle = `${lastExecution.result.outcome === Outcome.success ? "Successfully executed" : "Failed to execute"} on ${Prettify.timestamp(lastExecution.result.completedAt)}`;
        icon = lastExecution.result.outcome;
      } else {
        subtitle = `Started executing on ${Prettify.timestamp(lastExecution.startedAt)} ...`;
        icon = "loading";
      }
    } else {
      subtitle = "Last execution: N/A";
      icon = "no_data";
    }
    return {
      link: `/pipelines/${id}`,
      title: name,
      titleUnderline: false,
      subtitle,
      icon,
    };
  }
}
