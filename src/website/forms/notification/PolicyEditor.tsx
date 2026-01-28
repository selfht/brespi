import { Event } from "@/events/Event";
import { NotificationChannel } from "@/models/NotificationChannel";
import { NotificationEventSubscription } from "@/models/NotificationEventSubscription";
import { NotificationPolicy } from "@/models/NotificationPolicy";
import { NotificationClient } from "@/website/clients/NotificationClient";
import { Button } from "@/website/comps/Button";
import { useRegistry } from "@/website/hooks/useRegistry";
import clsx from "clsx";
import { useForm } from "react-hook-form";
import { FormHelper } from "../FormHelper";

type EventSubscriptionForm = {
  type: NotificationEventSubscription["type"];
  enabled: boolean;
  triggers: {
    ad_hoc: boolean;
    schedule: boolean;
  };
};

type Props = PolicyEditor.Props;
type Form = {
  [PolicyEditor.Field.channelType]: "slack" | "custom_script";
  [PolicyEditor.Field.webhookUrlReference]: string;
  [PolicyEditor.Field.scriptPath]: string;
  [PolicyEditor.Field.eventSubscriptions]: EventSubscriptionForm[];
};
export function PolicyEditor({ className, existing, onSave, onDelete, onCancel }: Props) {
  const notificationClient = useRegistry(NotificationClient);

  const defaultEventSubscriptions: EventSubscriptionForm[] = [
    {
      type: Event.Type.execution_started,
      enabled: existing?.eventSubscriptions.some((s) => s.type === Event.Type.execution_started) ?? false,
      triggers: {
        ad_hoc: existing?.eventSubscriptions.find((s) => s.type === Event.Type.execution_started)?.triggers.includes("ad_hoc") ?? false,
        schedule: existing?.eventSubscriptions.find((s) => s.type === Event.Type.execution_started)?.triggers.includes("schedule") ?? false,
      },
    },
    {
      type: Event.Type.execution_completed,
      enabled: existing?.eventSubscriptions.some((s) => s.type === Event.Type.execution_completed) ?? false,
      triggers: {
        ad_hoc: existing?.eventSubscriptions.find((s) => s.type === Event.Type.execution_completed)?.triggers.includes("ad_hoc") ?? false,
        schedule:
          existing?.eventSubscriptions.find((s) => s.type === Event.Type.execution_completed)?.triggers.includes("schedule") ?? false,
      },
    },
  ];

  const { register, handleSubmit, formState, watch, setError, clearErrors } = useForm<Form>({
    defaultValues: {
      [PolicyEditor.Field.channelType]: existing?.channel.type ?? "slack",
      [PolicyEditor.Field.webhookUrlReference]: existing?.channel.type === "slack" ? existing.channel.webhookUrlReference : "",
      [PolicyEditor.Field.scriptPath]: existing?.channel.type === "custom_script" ? existing.channel.path : "",
      [PolicyEditor.Field.eventSubscriptions]: defaultEventSubscriptions,
    } satisfies Form,
  });

  const channelType = watch(PolicyEditor.Field.channelType);
  const eventSubscriptions = watch(PolicyEditor.Field.eventSubscriptions);

  const save = async (form: Form) => {
    try {
      clearErrors();
      await FormHelper.snoozeBeforeSubmit();
      const channel: NotificationChannel =
        form[PolicyEditor.Field.channelType] === "slack"
          ? { type: "slack", webhookUrlReference: form[PolicyEditor.Field.webhookUrlReference] }
          : { type: "custom_script", path: form[PolicyEditor.Field.scriptPath] };
      const subscriptions: NotificationEventSubscription[] = form[PolicyEditor.Field.eventSubscriptions]
        .filter((sub) => sub.enabled)
        .map((sub) => ({
          type: sub.type,
          triggers: [...(sub.triggers.ad_hoc ? ["ad_hoc" as const] : []), ...(sub.triggers.schedule ? ["schedule" as const] : [])],
        }));
      const policy = existing
        ? await notificationClient.updatePolicy(existing.id, { channel, eventSubscriptions: subscriptions })
        : await notificationClient.createPolicy({ channel, eventSubscriptions: subscriptions });
      onSave(policy);
    } catch (e) {
      setError("root", {
        message: FormHelper.formatError(e),
      });
    }
  };

  const remove = async () => {
    try {
      clearErrors();
      await FormHelper.snoozeBeforeSubmit();
      if (existing && confirm("Are you sure about deleting this notification policy?")) {
        const policy = await notificationClient.deletePolicy(existing.id);
        onDelete(policy);
      }
    } catch (e) {
      setError("root", {
        message: FormHelper.formatError(e),
      });
    }
  };

  return (
    <div className={clsx(className, "border-t border-b border-c-info bg-black")}>
      <fieldset disabled={formState.isSubmitting} className="p-6">
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Channel Type */}
          <div>
            <label className="block text-c-dim text-sm mb-2">Channel Type</label>
            <select
              className="w-full text-lg p-2 border-2 border-c-dim rounded-lg focus:border-c-info outline-none!"
              {...register(PolicyEditor.Field.channelType)}
            >
              <option value="slack">Slack</option>
              <option value="custom_script">Custom Script</option>
            </select>
          </div>

          {/* Channel Config */}
          <div>
            {channelType === "slack" ? (
              <>
                <label className="block text-c-dim text-sm mb-2">Webhook URL Reference</label>
                <input
                  type="text"
                  className="w-full font-mono p-2 border-2 border-c-dim rounded-lg focus:border-c-info outline-none!"
                  placeholder="MY_SLACK_WEBHOOK"
                  {...register(PolicyEditor.Field.webhookUrlReference)}
                />
              </>
            ) : (
              <>
                <label className="block text-c-dim text-sm mb-2">Script Path</label>
                <input
                  type="text"
                  className="w-full font-mono p-2 border-2 border-c-dim rounded-lg focus:border-c-info outline-none!"
                  placeholder="/scripts/notify.sh"
                  {...register(PolicyEditor.Field.scriptPath)}
                />
              </>
            )}
          </div>
        </div>

        {/* Event Subscriptions */}
        <div className="mb-6">
          <label className="block text-c-dim text-sm mb-3">Event Subscriptions</label>
          <div className="space-y-4">
            {eventSubscriptions.map((sub, index) => (
              <div key={sub.type} className="flex items-start gap-4">
                <label className="flex items-center gap-2 min-w-[200px]">
                  <input type="checkbox" className="w-4 h-4" {...register(`${PolicyEditor.Field.eventSubscriptions}.${index}.enabled`)} />
                  <span className="font-mono text-sm">{sub.type}</span>
                </label>
                {eventSubscriptions[index].enabled && (
                  <div className="flex items-center gap-4 text-sm text-c-dim">
                    <span>Triggers:</span>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        className="w-3 h-3"
                        {...register(`${PolicyEditor.Field.eventSubscriptions}.${index}.triggers.schedule`)}
                      />
                      <span>schedule</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        className="w-3 h-3"
                        {...register(`${PolicyEditor.Field.eventSubscriptions}.${index}.triggers.ad_hoc`)}
                      />
                      <span>ad_hoc</span>
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button className="border-none font-normal text-c-success hover:text-white" onClick={handleSubmit(save)}>
            Save
          </Button>
          {existing && (
            <Button className="border-none font-normal text-c-error hover:text-white" onClick={handleSubmit(remove)}>
              Delete
            </Button>
          )}
          <Button className="border-none font-normal text-c-dim hover:text-white" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        {formState.errors.root?.message && <pre className="mt-4 text-c-error">{formState.errors.root.message}</pre>}
      </fieldset>
    </div>
  );
}

export namespace PolicyEditor {
  export type Props = {
    className?: string;
    existing?: NotificationPolicy;
    onSave: (policy: NotificationPolicy) => unknown;
    onDelete: (policy: NotificationPolicy) => unknown;
    onCancel: () => unknown;
  };
  export enum Field {
    channelType = "channelType",
    webhookUrlReference = "webhookUrlReference",
    scriptPath = "scriptPath",
    eventSubscriptions = "eventSubscriptions",
  }
}
