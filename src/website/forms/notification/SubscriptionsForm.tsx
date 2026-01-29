import { useFormContext } from "react-hook-form";
import { PolicyEditorTypes } from "./PolicyEditorTypes";

const Field = PolicyEditorTypes.Field;
type Form = PolicyEditorTypes.Form;

export function SubscriptionsForm() {
  const { register, watch } = useFormContext<Form>();
  const executionStartedEnabled = watch(Field.subscription_executionStarted_enabled);
  const executionCompletedEnabled = watch(Field.subscription_executionCompleted_enabled);
  return (
    <div className="flex flex-col gap-5">
      {/* execution_started */}
      <div>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="w-4 h-4" {...register(Field.subscription_executionStarted_enabled)} />
          <span className="font-mono">execution_started</span>
        </label>
        {executionStartedEnabled && (
          <div className="ml-6 mt-1 flex flex-col gap-2">
            <div className="flex items-center gap-4 text-c-dim">
              <span>Triggers:</span>
              <label className="flex items-center gap-1">
                <input type="checkbox" className="w-3 h-3" {...register(Field.subscription_executionStarted_triggerSchedule)} />
                <span>schedule</span>
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" className="w-3 h-3" {...register(Field.subscription_executionStarted_triggerAdHoc)} />
                <span>ad_hoc</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* execution_completed */}
      <div>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="w-4 h-4" {...register(Field.subscription_executionCompleted_enabled)} />
          <span className="font-mono">execution_completed</span>
        </label>
        {executionCompletedEnabled && (
          <div className="ml-6 mt-1 flex flex-col gap-2">
            <div className="flex items-center gap-4 text-c-dim">
              <span>Triggers:</span>
              <label className="flex items-center gap-1">
                <input type="checkbox" className="w-3 h-3" {...register(Field.subscription_executionCompleted_triggerSchedule)} />
                <span>schedule</span>
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" className="w-3 h-3" {...register(Field.subscription_executionCompleted_triggerAdHoc)} />
                <span>ad_hoc</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
