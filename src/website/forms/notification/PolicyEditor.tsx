import { Event } from "@/events/Event";
import { EventSubscription } from "@/models/EventSubscription";
import { NotificationChannel } from "@/models/NotificationChannel";
import { NotificationPolicy } from "@/models/NotificationPolicy";
import { OmitBetter } from "@/types/OmitBetter";
import { NotificationClient } from "@/website/clients/NotificationClient";
import { Button } from "@/website/comps/Button";
import { Toggle } from "@/website/comps/Toggle";
import { useRegistry } from "@/website/hooks/useRegistry";
import clsx from "clsx";
import { FormProvider, useForm } from "react-hook-form";
import { FormHelper } from "../FormHelper";
import { PolicyEditorTypes } from "./PolicyEditorTypes";
import { SubscriptionsForm } from "./SubscriptionsForm";

function defaultSubscriptionForm(type: EventSubscription["type"], existing?: NotificationPolicy): PolicyEditorTypes.FormSubscription {
  switch (type) {
    case Event.Type.execution_started: {
      const existingSub = existing?.eventSubscriptions.find((s) => s.type === type);
      return {
        enabled: Boolean(existingSub),
        subscription: existingSub ?? {
          type,
          triggers: ["ad_hoc", "schedule"],
        },
      };
    }
    case Event.Type.execution_completed: {
      const existingSub = existing?.eventSubscriptions.find((s) => s.type === type);
      return {
        enabled: Boolean(existingSub),
        subscription: existingSub ?? {
          type,
          triggers: ["ad_hoc", "schedule"],
        },
      };
    }
  }
}

const Field = PolicyEditorTypes.Field;
type Form = PolicyEditorTypes.Form;
type Props = PolicyEditor.Props;
export function PolicyEditor({ className, gridClassName, existing, onSave, onDelete, onCancel }: Props) {
  const notificationClient = useRegistry(NotificationClient);

  const form = useForm<Form>({
    defaultValues: {
      [Field.active]: true,
      [Field.channelType]: existing?.channel.type ?? "",
      [Field.webhookUrlReference]: existing?.channel.type === "slack" ? existing.channel.webhookUrlReference : "",
      [Field.scriptPath]: existing?.channel.type === "custom_script" ? existing.channel.path : "",
      [Field.eventSubscriptions]: [
        defaultSubscriptionForm(Event.Type.execution_started, existing),
        defaultSubscriptionForm(Event.Type.execution_completed, existing),
      ],
    } satisfies Form,
  });

  const save = async (data: Form) => {
    try {
      form.clearErrors();
      await FormHelper.snoozeBeforeSubmit();
      let channel: NotificationChannel;
      switch (data[Field.channelType]) {
        case "": {
          channel = {} as NotificationChannel; // let it fail later
          break;
        }
        case "slack": {
          channel = {
            type: "slack",
            webhookUrlReference: data[Field.webhookUrlReference],
          };
          break;
        }
        case "custom_script": {
          // $AB
          channel = {
            type: "custom_script",
            path: data[Field.scriptPath],
          };
          break;
        }
      }
      const request: OmitBetter<NotificationPolicy, "id" | "object"> = {
        channel,
        eventSubscriptions: data[Field.eventSubscriptions] //
          .filter(({ enabled }) => enabled)
          .map(({ subscription }) => subscription),
      };
      const policy = existing
        ? await notificationClient.updatePolicy(existing.id, request)
        : await notificationClient.createPolicy(request);
      onSave(policy);
    } catch (e) {
      form.setError("root", {
        message: FormHelper.formatError(e),
      });
    }
  };

  const remove = async () => {
    try {
      form.clearErrors();
      await FormHelper.snoozeBeforeSubmit();
      if (existing && confirm("Are you sure about deleting this notification policy?")) {
        const policy = await notificationClient.deletePolicy(existing.id);
        onDelete(policy);
      }
    } catch (e) {
      form.setError("root", {
        message: FormHelper.formatError(e),
      });
    }
  };

  const channelType = form.watch(Field.channelType);
  return (
    <FormProvider {...form}>
      <div className={clsx(className, "border-t border-b border-c-info bg-black")}>
        <fieldset disabled={form.formState.isSubmitting} className={clsx(gridClassName, "items-start!")}>
          {/* Active */}
          <Toggle id={Field.active} className="mt-1.5 ml-2" {...form.register(Field.active)} />
          {/* Channel */}
          <div className="min-w-0 mr-10">
            <select
              id={Field.channelType}
              className="w-full text-lg p-2 border-2 border-c-dim rounded-lg focus:border-c-info outline-none! mb-3"
              {...form.register(Field.channelType)}
            >
              <option value="" disabled>
                Select a channel
              </option>
              <option value="slack">Slack</option>
              <option value="custom_script">Custom Script</option>
            </select>
            {channelType === "slack" && (
              <>
                <label className="block text-c-dim text-sm mb-1">Specify the environment variable containing the Slack webhook URL</label>
                <input
                  type="text"
                  className="w-full font-mono p-2 border-2 border-c-dim rounded-lg focus:border-c-info outline-none!"
                  placeholder="MY_SLACK_WEBHOOK_URL"
                  {...form.register(Field.webhookUrlReference)}
                />
              </>
            )}
            {channelType === "custom_script" && (
              <>
                <label className="block text-c-dim text-sm mb-1">
                  Specify the filesystem path for the custom script that will be invoked
                </label>
                <input
                  type="text"
                  className="w-full font-mono p-2 border-2 border-c-dim rounded-lg focus:border-c-info outline-none!"
                  placeholder="/scripts/notify.sh"
                  {...form.register(Field.scriptPath)}
                />
              </>
            )}
          </div>
          {/* Events */}
          <SubscriptionsForm />
          {/* Actions */}
          <div className="flex flex-col items-end gap-1">
            <Button className="border-none font-normal text-c-success hover:text-white" onClick={form.handleSubmit(save)}>
              Save
            </Button>
            {existing && (
              <Button className="border-none font-normal text-c-error hover:text-white" onClick={form.handleSubmit(remove)}>
                Delete
              </Button>
            )}
            <Button className="border-none font-normal text-c-dim hover:text-white" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </fieldset>
      </div>
    </FormProvider>
  );
}

export namespace PolicyEditor {
  export type Props = {
    className?: string;
    gridClassName: string;
    existing?: NotificationPolicy;
    onSave: (policy: NotificationPolicy) => unknown;
    onDelete: (policy: NotificationPolicy) => unknown;
    onCancel: () => unknown;
  };
}
