import { EventSubscription } from "@/models/EventSubscription";

export namespace PolicyEditorTypes {
  export enum Field {
    active = "active",
    channelType = "channelType",
    webhookUrlReference = "webhookUrlReference",
    scriptPath = "scriptPath",
    eventSubscriptions = "eventSubscriptions",
  }

  export type Form = {
    [Field.active]: boolean;
    [Field.channelType]: "" | "slack" | "custom_script";
    [Field.webhookUrlReference]: string;
    [Field.scriptPath]: string;
    [Field.eventSubscriptions]: FormSubscription[];
  };
  export type FormSubscription = {
    enabled: boolean;
    subscription: EventSubscription;
  };
}
