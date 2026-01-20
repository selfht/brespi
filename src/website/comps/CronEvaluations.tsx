import { Prettify } from "@/helpers/Prettify";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { ScheduleClient } from "../clients/ScheduleClient";
import { useRegistry } from "../hooks/useRegistry";

type Props = {
  className?: string;
  expression: string;
};
export function CronEvaluations({ className, expression }: Props) {
  expression = expression.trim();
  const scheduleClient = useRegistry(ScheduleClient);
  const calculateNextCronEvaluations = (expression: string) => scheduleClient.nextCronEvaluations({ expression, amount: 3 });

  const [evaluations, setEvaluations] = useState(calculateNextCronEvaluations(expression));
  useEffect(() => {
    const update = () => setEvaluations(calculateNextCronEvaluations(expression));
    update();
    const token = setInterval(update, 250);
    return () => clearInterval(token);
  }, [expression]);

  return (
    <div className={clsx(className, "flex flex-col items-start gap-1")}>
      {evaluations?.map((nextCronEvaluation, index) => (
        <div
          key={nextCronEvaluation.toString()}
          className="truncate"
          style={{
            opacity: 1 - index * 0.2,
            fontSize: `${1 - index * 0.07}rem`,
          }}
        >
          {Prettify.timestamp(nextCronEvaluation)}
        </div>
      ))}
    </div>
  );
}
