import { Temporal } from "@js-temporal/polyfill";
import { Paper } from "../comps/Paper";
import { Skeleton } from "../comps/Skeleton";
import "./$PipelineOverview.css";
import { Link } from "react-router";
import { SquareIcon } from "../comps/SquareIcon";
import clsx from "clsx";

type PipelineEntry = {
  link: string;
  title: string;
  subtitle?: string;
  squareIcon: SquareIcon.Props["variant"];
};

export function $PipelineOverview() {
  const pipelineEntries: PipelineEntry[] = [
    ...TESTDATA.map<PipelineEntry>((pipeline) => ({
      link: `/pipelines/${pipeline.id}`,
      title: pipeline.name,
      subtitle: pipeline.lastExecution
        ? `${pipeline.lastExecution.outcome === "success" ? "Successfully executed" : "Failed to execute"} on ${pipeline.lastExecution.timestamp.toLocaleString()}`
        : "Last execution: N/A",
      squareIcon: pipeline.lastExecution ? pipeline.lastExecution.outcome : ("no_data" as const),
    })),
    {
      link: "/pipelines/new",
      title: "New Pipeline ...",
      squareIcon: "new",
    },
  ];
  return (
    <Skeleton>
      <Paper className="col-span-full">
        {pipelineEntries.map(({ link, title, subtitle, squareIcon }, index, { length }) => (
          <Link
            key={link}
            to={link}
            className={clsx("flex items-center gap-6 hover:bg-c-dim/20 p-6", {
              "rounded-t-2xl": index === 0,
              "rounded-b-2xl": index + 1 === length,
            })}
          >
            <SquareIcon variant={squareIcon} />
            <div>
              <h3 className="text-lg font-medium">{title}</h3>
              {subtitle && <p className="font-light italic text-c-dim">{subtitle}</p>}
            </div>
          </Link>
        ))}
      </Paper>
    </Skeleton>
  );
}

type TestPipeline = {
  id: string;
  name: string;
  lastExecution?: {
    outcome: "success" | "error";
    timestamp: Temporal.PlainDateTime;
  };
};
const TESTDATA: TestPipeline[] = [
  {
    id: `${Math.random()}`,
    name: "My Postgres Backup Pipeline",
  },
  {
    id: `${Math.random()}`,
    name: "My Wordpress Pipeline for /wp-uploads",
    lastExecution: {
      outcome: "success",
      timestamp: Temporal.PlainDateTime.from("2025-11-26T19:08:32"),
    },
  },
  {
    id: `${Math.random()}`,
    name: "Jessy's Brespi Activity Pipeline created Today",
    lastExecution: {
      outcome: "error",
      timestamp: Temporal.PlainDateTime.from("2025-11-24T14:31:55"),
    },
  },
];
