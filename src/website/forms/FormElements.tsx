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
    stepType: Step.Type;
    children?: ReactNode;
  };
  export function Left({ stepType, children }: LeftProps) {
    return (
      <div className="flex-1 pr-3">
        <h1 className="text-2xl font-extralight text-c-dim">{StepDescription.forType(stepType)}</h1>
        {children}
      </div>
    );
  }

  type RightProps = {
    formState: FormState<{}>;
    clearErrors: () => unknown;
    children?: ReactNode;
    className?: string;
  };
  export function Right({ formState, clearErrors, children, className }: RightProps) {
    return (
      <div className={clsx("flex-1 pl-3 border-l-2 border-c-dim/20 text-lg flex flex-col gap-4 items-start", className)}>
        {formState.errors.root?.message ? (
          <div className="self-stretch border-3 border-c-error p-3 rounded-lg flex justify-between items-start">
            <pre className="text-c-error min-w-0 whitespace-pre-wrap break-all">{formState.errors.root.message}</pre>
            <button className="cursor-pointer" onClick={() => clearErrors()}>
              <Icon variant="close" className="size-5" />
            </button>
          </div>
        ) : (
          children
        )}
      </div>
    );
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
          <Button disabled={formState.isSubmitting} onClick={onSubmit} className="border-c-success text-c-success hover:bg-c-success/30">
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
      | { type: "select"; options: string[] };
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

    const activateField = () => {
      onActiveFieldChange(field);
    };
    useEffect(() => {
      const deactivateField = (event: PointerEvent) => {
        if (field === activeField) {
          const clickedLabelOrInput = event.target === labelRef.current || event.target === document.getElementById(fieldStr);
          if (!clickedLabelOrInput) {
            console.log("Bye!");
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
            {input.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
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

  type FieldDescriptionProps = {
    descriptions: Record<string, ReactNode>;
    activeField: string | undefined;
  };
  export function FieldDescription({ descriptions, activeField }: FieldDescriptionProps) {
    if (activeField) {
      return <p className="text-c-info animate-fade-in">{descriptions[activeField]}</p>;
    }
    return <p className="text-c-dim text-base italic animate-fade-in">Select a field for more information.</p>;
  }
}
