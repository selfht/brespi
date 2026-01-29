export namespace PolicyEditorTypes {
  export enum Field {
    active = "active",
    channel = "channel",
    slack_webhookUrlReference = "slack_webhookUrlReference",
    customScript_path = "customScript_path",
    // execution_started subscription
    subscription_executionStarted_enabled = "subscription_executionStarted_enabled",
    subscription_executionStarted_triggerAdHoc = "subscription_executionStarted_triggerAdHoc",
    subscription_executionStarted_triggerSchedule = "subscription_executionStarted_triggerSchedule",
    // execution_completed subscription
    subscription_executionCompleted_enabled = "subscription_executionCompleted_enabled",
    subscription_executionCompleted_triggerAdHoc = "subscription_executionCompleted_triggerAdHoc",
    subscription_executionCompleted_triggerSchedule = "subscription_executionCompleted_triggerSchedule",
  }

  export type Form = {
    [Field.active]: boolean;
    [Field.channel]: "" | "slack" | "custom_script";
    [Field.slack_webhookUrlReference]: string;
    [Field.customScript_path]: string;
    // execution_started
    [Field.subscription_executionStarted_enabled]: boolean;
    [Field.subscription_executionStarted_triggerAdHoc]: boolean;
    [Field.subscription_executionStarted_triggerSchedule]: boolean;
    // execution_completed
    [Field.subscription_executionCompleted_enabled]: boolean;
    [Field.subscription_executionCompleted_triggerAdHoc]: boolean;
    [Field.subscription_executionCompleted_triggerSchedule]: boolean;
  };
}
