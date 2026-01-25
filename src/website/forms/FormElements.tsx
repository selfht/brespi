import { Step } from "@/models/Step";
import clsx from "clsx";
import { ReactNode, useEffect, useRef, useState } from "react";
import { FieldValues, FormState, Path, UseFormRegister } from "react-hook-form";
import { Button } from "../comps/Button";
import { Icon } from "../comps/Icon";
import { Spinner } from "../comps/Spinner";
import { StepDescription } from "../details/StepDescription";

export namespace FormElements {
  type ContainerProps = {
    className?: string;
    children?: ReactNode;
  };
  export function Container({ className, children }: ContainerProps) {
    return <div className={clsx("flex items-start font-light", className)}>{children}</div>;
  }

  type LeftProps = {
    children?: ReactNode;
  };
  export function Left({ children }: LeftProps) {
    return <div className="flex-1 pr-3">{children}</div>;
  }

  type RightProps = {
    stepType: Step.Type;
    formState: FormState<{}>;
    clearErrors: () => unknown;
    children?: ReactNode;
    className?: string;
    fieldDescriptions: Record<string, ReactNode>;
    fieldCurrentlyActive?: string;
  };
  export function Right({ stepType, formState, clearErrors, children, className, fieldDescriptions, fieldCurrentlyActive }: RightProps) {
    return (
      <div className={clsx("flex-1 pl-3 border-l-2 border-c-dim/20", className)}>
        {formState.errors.root?.message ? (
          <div className="self-stretch border-3 border-c-error p-3 rounded-lg flex justify-between items-start">
            <pre className="text-c-error min-w-0 whitespace-pre-wrap break-all">{formState.errors.root.message}</pre>
            <button className="cursor-pointer" onClick={() => clearErrors()}>
              <Icon variant="close" className="size-5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-start">
            <h1 className="mb-4 text-2xl font-extralight text-c-dim">{StepDescription.forType(stepType)}</h1>
            <div className="mb-2 text-lg">{children}</div>
            {Object.entries(fieldDescriptions).length > 0 ? (
              fieldCurrentlyActive ? (
                <p className="text-c-info">{fieldDescriptions[fieldCurrentlyActive]}</p>
              ) : (
                <p className="text-sm italic">Select a field on the left for more information.</p>
              )
            ) : (
              <p className="text-sm italic">This step has no configurable fields.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  type CodeProps = {
    children: string;
    break?: boolean;
  };
  export function Code({ children, break: breakAll = true }: CodeProps) {
    return <code className={clsx("text-c-dim whitespace-normal", { "break-all": breakAll })}>{children}</code>;
  }

  type ButtonBarProps = {
    className?: string;
    existing?: Step;
    formState: FormState<{}>;
    onSubmit: () => unknown;
    onDelete: (id: string) => unknown;
    onCancel: () => unknown;
  };
  export function ButtonBar({ className, existing, formState, onSubmit, onDelete, onCancel }: ButtonBarProps) {
    return (
      <div className={clsx("flex flex-row-reverse justify-between gap-4", className)}>
        <div className="flex gap-4">
          {!formState.isSubmitting && <Button onClick={onCancel}>Cancel</Button>}
          <Button disabled={formState.isSubmitting} onClick={onSubmit} theme="success">
            {formState.isSubmitting ? <Spinner className="border-c-success" /> : existing ? "Update Step" : "Add Step"}
          </Button>
        </div>
        {existing && !formState.isSubmitting && (
          <Button className="border-c-error! text-c-error hover:bg-c-error/30" onClick={() => onDelete(existing.id)}>
            Delete Step
          </Button>
        )}
      </div>
    );
  }

  type LabeledInputProps<FORM extends FieldValues, F extends keyof FORM> = {
    field: F;
    label?: ReactNode;
    labels: Record<keyof FORM, string>;
    register: UseFormRegister<FORM>;
    activeField: keyof FORM | undefined;
    onActiveFieldChange: (field: keyof FORM | undefined) => unknown;
    input:
      | { type: "text" } //
      | { type: "number" }
      | { type: "yes" }
      | { type: "yesno" }
      | { type: "select"; options: string[] | Array<{ label: string; value: string }> };
  };
  export function LabeledInput<FORM extends FieldValues, F extends keyof FORM>({
    field,
    label,
    labels,
    register,
    input,
    activeField,
    onActiveFieldChange,
  }: LabeledInputProps<FORM, F>) {
    const fieldStr = field.toString();
    const fieldPath = field as unknown as Path<FORM>;
    const labelRef = useRef<HTMLLabelElement>(null);

    if (input.type === "yes") {
      input = {
        type: "select",
        options: [{ label: "yes", value: "true" }],
      };
    }
    if (input.type === "yesno") {
      input = {
        type: "select",
        options: [
          { label: "yes", value: "true" },
          { label: "no", value: "false" },
        ],
      };
    }

    const activateField = () => {
      onActiveFieldChange(field);
    };
    useEffect(() => {
      const deactivateField = (event: PointerEvent) => {
        if (field === activeField) {
          const clickedLabelOrInput = event.target === labelRef.current || event.target === document.getElementById(fieldStr);
          if (!clickedLabelOrInput) {
            onActiveFieldChange(undefined);
          }
        }
      };
      window.addEventListener("click", deactivateField);
      return () => window.removeEventListener("click", deactivateField);
    }, [activeField]);

    // Determine the label to display
    const displayLabel = label ?? labels[field];
    // If it's a string with a colon, split and style the prefix
    const renderedLabel =
      typeof displayLabel === "string" && displayLabel.includes(":")
        ? (() => {
            const colonIndex = displayLabel.indexOf(":");
            const prefix = displayLabel.slice(0, colonIndex + 1); // Include the colon
            const suffix = displayLabel.slice(colonIndex + 1); // After the colon
            return (
              <>
                <span className="text-c-dim">{prefix}</span>
                {suffix}
              </>
            );
          })()
        : displayLabel;

    return (
      <div className="flex items-center">
        <label
          htmlFor={fieldStr}
          className={clsx("w-72 text-lg cursor-pointer select-none", {
            "underline underline-offset-4 decoration-3 decoration-c-info": field === activeField,
          })}
          ref={labelRef}
        >
          {renderedLabel}
        </label>
        {input.type === "text" && (
          <input
            type="text"
            id={fieldStr}
            className="rounded flex-1 p-2 bg-c-dim/20 font-mono focus:outline-2 focus:outline-c-info"
            onFocus={activateField}
            {...register(fieldPath)}
          />
        )}
        {input.type === "number" && (
          <input
            type="number"
            id={fieldStr}
            className="rounded flex-1 p-2 bg-c-dim/20 font-mono focus:outline-2 focus:outline-c-info"
            onFocus={activateField}
            {...register(fieldPath, { valueAsNumber: true })}
          />
        )}
        {input.type === "select" && (
          <select
            id={fieldStr}
            className="rounded flex-1 p-2 bg-c-dim/20 font-mono focus:outline-2 focus:outline-c-info"
            onFocus={activateField}
            {...register(fieldPath)}
          >
            {input.options.map((opt) => {
              const label: string = typeof opt === "string" ? opt : opt.label;
              const value: string = typeof opt === "string" ? opt : opt.value;
              return (
                <option key={value} value={value}>
                  {label}
                </option>
              );
            })}
          </select>
        )}
      </div>
    );
  }

  export function useActiveField<FORM extends FieldValues>() {
    const [activeField, setActiveField] = useState<keyof FORM>();
    return {
      activeField,
      setActiveField,
    };
  }
}
