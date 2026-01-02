import { Step } from "@/models/Step";
import clsx from "clsx";
import { ReactNode } from "react";
import { FieldValues, FormState, Path, UseFormRegister } from "react-hook-form";
import { Button } from "../comps/Button";
import { Icon } from "../comps/Icon";
import { Spinner } from "../comps/Spinner";
import { StepTranslation } from "../translation/StepTranslation";

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
        <h1 className="text-2xl font-extralight text-c-dim">{StepTranslation.type(stepType)}</h1>
        {children}
      </div>
    );
  }

  type RightProps = {
    formState: FormState<{}>;
    clearErrors: () => unknown;
    children?: ReactNode;
  };
  export function Right({ formState, clearErrors, children }: RightProps) {
    return (
      <div className="flex-1 pl-3 border-l-2 border-c-dim/20">
        {formState.errors.root?.message ? (
          <div className="border-3 border-c-error p-3 rounded-lg flex justify-between items-start">
            <pre className="text-c-error">{formState.errors.root.message}</pre>
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
  } & ({ input: "text" } | { input: "number" } | { input: "select"; options: string[] });
  export function LabeledInput<FORM extends FieldValues, F extends keyof FORM>(props: LabeledInputProps<FORM, F>) {
    const { field, label, labels, register, ...variant } = props;

    const fieldStr = field.toString();
    const fieldPath = field as unknown as Path<FORM>;

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
        <label htmlFor={fieldStr} className="w-72">
          {renderedLabel}
        </label>
        {variant.input === "text" && (
          <input type="text" id={fieldStr} className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register(fieldPath)} />
        )}
        {variant.input === "number" && (
          <input
            type="number"
            id={fieldStr}
            className="rounded flex-1 p-2 bg-c-dim/20 font-mono"
            {...register(fieldPath, { valueAsNumber: true })}
          />
        )}
        {variant.input === "select" && (
          <select id={fieldStr} className="rounded flex-1 p-2 bg-c-dim/20 font-mono" {...register(fieldPath)}>
            {variant.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }

  export function createLabeledInputComponent<FORM extends FieldValues>(
    labels: Record<keyof FORM, string>,
    register: UseFormRegister<FORM>,
  ) {
    type BoundLabeledInputProps<F extends string> = {
      field: F;
      label?: ReactNode;
    } & ({ input: "text" } | { input: "number" } | { input: "select"; options: string[] });

    return function BoundLabeledInput<F extends keyof FORM>(props: BoundLabeledInputProps<F & string>) {
      return LabeledInput<FORM, F>({ ...props, labels, register });
    };
  }
}
