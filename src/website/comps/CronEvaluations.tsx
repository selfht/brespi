import { Prettify } from "@/helpers/Prettify";
import { Temporal } from "@js-temporal/polyfill";
import clsx from "clsx";
import { Cron } from "croner";
import { useEffect, useState } from "react";

type Props = {
  className?: string;
  expression: string;
};
export function CronEvaluations({ className, expression }: Props) {
  const [evaluations, setEvaluations] = useState<Temporal.PlainDateTime[]>();
  useEffect(() => {
    const queue: Temporal.PlainDateTime[] = [];
    const evaluate = () => {
      const AMOUNT = 3;
      if (queue.length < AMOUNT) {
        const batch = calculateNextCronEvaluations(expression, 5);
        if (batch) {
          queue.push(...batch);
        }
      }
      setEvaluations((current) => {
        const relevant = current?.filter((t) => Temporal.PlainDateTime.compare(t, Temporal.Now.plainDateTimeISO()) > 0);
        if (!relevant || relevant.length < AMOUNT) {
          const now = Temporal.Now.plainDateTimeISO();
          const upcoming = relevant || [];
          while (queue.length > 0 && upcoming.length < AMOUNT) {
            const candidate = queue.shift();
            if (candidate && Temporal.PlainDateTime.compare(candidate, now) > 0) {
              upcoming.push(candidate);
            }
          }
          return upcoming;
        }
        return relevant;
      });
    };
    const token = setInterval(() => evaluate(), 1000);
    return () => clearInterval(token);
  }, [expression]);

  return (
    <div className={clsx(className, "flex flex-col items-start gap-1")}>
      {evaluations?.map((nextCronEvaluation, index) => (
        <div
          key={nextCronEvaluation.toString()}
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

function calculateNextCronEvaluations(expression: string, number: number = 3): Temporal.PlainDateTime[] | undefined {
  let cron: Cron | undefined = undefined;
  try {
    const now = Temporal.Now.plainDateTimeISO();
    const nowMillis = Date.now();
    cron = new Cron(expression.trim());
    return cron.nextRuns(number).map((date) => now.add({ milliseconds: date.getTime() - nowMillis }));
  } catch (e) {
    return undefined;
  } finally {
    cron?.stop();
  }
}
