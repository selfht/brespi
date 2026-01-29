import { Event } from "@/events/Event";
import { useFieldArray, useFormContext } from "react-hook-form";
import { PolicyEditorTypes } from "./PolicyEditorTypes";
import { EventSubscription } from "@/models/EventSubscription";

const Field = PolicyEditorTypes.Field;
type Form = PolicyEditorTypes.Form;
export function SubscriptionsForm() {
  const { register, control, watch } = useFormContext<Form>();
  const { fields } = useFieldArray({ control, name: Field.eventSubscriptions });
  return (
    <div className="flex flex-col gap-5">
      {fields.map((field, index) => {
        const enabled = watch(`${Field.eventSubscriptions}.${index}.enabled`) as boolean;
        const subtype = watch(`${Field.eventSubscriptions}.${index}.subscription.type`) as EventSubscription.Type;
        return (
          <div key={field.id}>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4" {...register(`${Field.eventSubscriptions}.${index}.enabled`)} />
              <span className="font-mono">{subtype}</span>
            </label>
            {enabled && (
              <div className="ml-6 mt-1 flex flex-col gap-2">
                {/* Both events (x_started, x_completed) currently use the exact same `triggers` sub-options */}
                {(subtype === Event.Type.execution_started || subtype === Event.Type.execution_completed) && (
                  <div className="flex items-center gap-4 text-c-dim">
                    <span>Triggers:</span>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        className="w-3 h-3"
                        {...register(`${Field.eventSubscriptions}.${index}.subscription.triggers`)}
                        value="schedule"
                      />
                      <span>schedule</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        className="w-3 h-3"
                        {...register(`${Field.eventSubscriptions}.${index}.subscription.triggers`)}
                        value="ad_hoc"
                      />
                      <span>ad_hoc</span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
