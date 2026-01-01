import { customType } from "drizzle-orm/pg-core";
import { Temporal } from "@js-temporal/polyfill";

customType<{
  data: Temporal.Instant;
  driverData: string;
  config: {
    precision?: number;
    // config can be defined here
    // it will be passed to `dataType` function below
  };
}>({
  dataType({ precision = 3 } = {}) {
    return `timestamp(${precision})`;
  },

  fromDriver: (value) => {
    const treatedAsUTC = `${value.replace(" ", "T")}Z`;
    return Temporal.Instant.from(treatedAsUTC);
  },
  toDriver: (value) => value.toString(),
});
export const timestampPlainDateTime = customType<{
  data: Temporal.PlainDateTime;
  driverData: string;
  config: {
    precision?: number;
    // config can be defined here
    // it will be passed to the `dataType` function below
  };
}>({
  dataType({ precision = 3 } = {}) {
    return `timestamp(${precision})`;
  },

  fromDriver: (value) => {
    return Temporal.PlainDateTime.from(value);
  },
  toDriver: (value) => value.toString(),
});
