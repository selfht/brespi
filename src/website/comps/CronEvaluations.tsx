import { Prettify } from "@/helpers/Prettify";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { ScheduleClient } from "../clients/ScheduleClient";
import { useRegistry } from "../hooks/useRegistry";
import { Temporal } from "@js-temporal/polyfill";

type Props = {
  className?: string;
  expression: string;
};
export function CronEvaluations({ className, expression }: Props) {
  expression = expression.trim();
  const scheduleClient = useRegistry(ScheduleClient);

  const [evaluations, setEvaluations] = useState<Temporal.PlainDateTime[]>();
  useEffect(() => {
    if (expression) {
      scheduleClient.nextCronEvaluations({ expression, amount: 10 }).then(setEvaluations);
    }
  }, [expression]);

  useEffect(() => {
    const validateList = () =>
      setEvaluations((current) => {
        const now = Temporal.Now.plainDateTimeISO();
        return current?.filter((e) => Temporal.PlainDateTime.compare(e, now) > 0);
      });
    const token = setInterval(validateList, 100);
    return () => clearInterval(token);
  }, []);

  const requiresRefresh = !evaluations || evaluations.length < 5;
  useEffect(() => {
    if (expression && requiresRefresh) {
      scheduleClient.nextCronEvaluations({ expression, amount: 10 }).then(setEvaluations);
    }
  }, [expression, requiresRefresh]);

  return (
    <div className={clsx(className, "flex flex-col items-start gap-1")}>
      {evaluations?.slice(0, 3).map((nextCronEvaluation, index) => (
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
