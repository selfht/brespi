import { Event } from "@/events/Event";
import { NotificationChannel } from "@/models/NotificationChannel";
import { NotificationPolicy } from "@/models/NotificationPolicy";
import { OmitBetter } from "@/types/OmitBetter";
import clsx from "clsx";
import { JSX, useState } from "react";
import { NotificationClient } from "../clients/NotificationClient";
import { Button } from "../comps/Button";
import { ErrorDump } from "../comps/ErrorDump";
import { Icon } from "../comps/Icon";
import { Paper } from "../comps/Paper";
import { Skeleton } from "../comps/Skeleton";
import { Spinner } from "../comps/Spinner";
import { Toggle } from "../comps/Toggle";
import { PolicyEditor } from "../forms/notification/PolicyEditor";
import { PolicyEditorTypes } from "../forms/notification/PolicyEditorTypes";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useRegistry } from "../hooks/useRegistry";
import { useYesQuery } from "../hooks/useYesQuery";

export function notificationsPage() {
  useDocumentTitle("Notifications | Brespi");
  const [editing, setEditing] = useState<"new" | NotificationPolicy>();

  const notificationClient = useRegistry(NotificationClient);
  const query = useYesQuery({
    queryFn: () => notificationClient.queryPolicies(),
  });

  const gridClassName = clsx(
    "grid grid-cols-[88px_minmax(180px,2fr)_minmax(280px,3fr)_80px]",
    "items-center p-6",
    "border-t border-c-dim/20",
  );

  const editorCallbacks: Pick<PolicyEditor.Props, "onSave" | "onDelete" | "onCancel"> = {
    onSave(policy) {
      const data = query.getData()!;
      if (data.some((p) => p.id === policy.id)) {
        query.setData(data.map((p) => (p.id === policy.id ? policy : p)));
      } else {
        query.setData([policy, ...data]);
      }
      setEditing(undefined);
    },
    onDelete(policy) {
      const data = query.getData()!;
      query.setData(data.filter((p) => p.id !== policy.id));
      setEditing(undefined);
    },
    onCancel() {
      setEditing(undefined);
    },
  };

  const performClientSideUpdate = (id: string, update: Partial<OmitBetter<NotificationPolicy, "id">>) => {
    const data = query.getData()!;
    query.setData(
      data.map((p) => {
        if (p.id === id) {
          return { ...p, ...update };
        }
        return p;
      }),
    );
  };

  const toggleActive = (policy: NotificationPolicy) => {
    const oldActiveValue = policy.active;
    const newActiveValue = !policy.active;
    // Client-side update
    performClientSideUpdate(policy.id, { active: newActiveValue });
    // Server-side update
    notificationClient.updatePolicy(policy.id, { ...policy, active: newActiveValue }).catch((err) => {
      console.error(err);
      performClientSideUpdate(policy.id, { active: oldActiveValue });
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
          <>
            {/* Header */}
            <div className={clsx(gridClassName, "border-none rounded-t-2xl bg-[rgb(20,20,20)] text-lg")}>
              <label htmlFor={PolicyEditorTypes.Field.active}>Active</label>
              <label htmlFor={PolicyEditorTypes.Field.channel}>Channel</label>
              <label>Events</label>
              <div />
            </div>
            {/* New policy row */}
            {editing === "new" ? (
              <PolicyEditor
                className={clsx(query.data.length === 0 && "rounded-b-2xl")}
                gridClassName={gridClassName}
                {...editorCallbacks}
              />
            ) : (
              <button
                disabled={Boolean(editing)}
                onClick={() => setEditing("new")}
                className={clsx(gridClassName, "w-full cursor-pointer not-disabled:hover:bg-c-dim/20", {
                  "cursor-not-allowed!": editing,
                  "pb-8!": query.data.length === 0,
                })}
              >
                <Icon className="size-8 ml-2" variant="new" />
                <div className="col-span-3 text-start text-lg underline underline-offset-2 decoration-2 decoration-c-accent">
                  New Policy ...
                </div>
              </button>
            )}
            {/* Data */}
            {query.data.map((policy, index, { length }) => {
              if (editing && typeof editing !== "string" && editing.id === policy.id) {
                return (
                  <PolicyEditor
                    key={policy.id}
                    className={clsx(index + 1 === length && "rounded-b-2xl")}
                    gridClassName={gridClassName}
                    existing={policy}
                    {...editorCallbacks}
                  />
                );
              }
              const channelTranslation: Record<NotificationChannel["type"], string> = {
                slack: "Slack",
                custom_script: "Custom script",
              };
              return (
                <div key={policy.id} className={clsx(gridClassName, "border-t border-c-dim/20")} data-testid="policy-row">
                  {/* Active */}
                  <Toggle className="ml-2" checked={policy.active} onChange={() => toggleActive(policy)} />
                  {/* Channel */}
                  <div className="min-w-0 mr-10">
                    <div className="truncate text-lg font-medium">{channelTranslation[policy.channel.type]}</div>
                    {policy.channel.type === "slack" && <div className="truncate text-c-dim">{policy.channel.webhookUrlReference}</div>}
                    {policy.channel.type === "custom_script" && <div className="truncate text-c-dim">{policy.channel.path}</div>}
                  </div>
                  {/* Events */}
                  <div className="flex flex-wrap gap-2">
                    {policy.eventSubscriptions.map((sub): JSX.Element => {
                      switch (sub.type) {
                        case Event.Type.execution_started:
                        case Event.Type.execution_completed:
                          return (
                            <span
                              key={sub.type}
                              className={clsx("border-2 rounded-lg p-2", policy.active ? "border-c-accent" : "border-c-dim text-c-dim")}
                            >
                              <span className="font-bold">{sub.type}</span>
                            </span>
                          );
                      }
                    })}
                  </div>
                  {/* Actions */}
                  <div className="flex justify-end">
                    <Button
                      onClick={() => setEditing(policy)}
                      disabled={Boolean(editing)}
                      className="border-none font-normal text-c-dim hover:text-white"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </Paper>
    </Skeleton>
  );
}
