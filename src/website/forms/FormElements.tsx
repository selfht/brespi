import { Step } from "@/models/Step";
import clsx from "clsx";
import { ReactNode } from "react";
import { FormState } from "react-hook-form";
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
  export namespace Container {
    type LeftProps = {
      children?: ReactNode;
    };
    export function Left({ children }: LeftProps) {
      return <div className="flex-1 pr-3">{children}</div>;
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
  }

  type TitleProps = {
    stepType: Step.Type;
  };
  export function Title({ stepType }: TitleProps) {
    return <h1 className="text-2xl font-extralight text-c-dim">{StepTranslation.type(stepType)}</h1>;
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
          <Button disabled={formState.isSubmitting} onClick={onSubmit} className="border-c-success text-c-success hover:bg-c-success/20">
            {formState.isSubmitting ? <Spinner className="border-c-success" /> : existing ? "Update Step" : "Add Step"}
          </Button>
        </div>
        {existing && !formState.isSubmitting && (
          <Button className="border-c-error! text-c-error hover:bg-c-error/20" onClick={() => onDelete(existing.id)}>
            Delete Step
          </Button>
        )}
      </div>
    );
  }

  type DescriptionOrErrorProps = {
    formState: FormState<{}>;
    clearErrors: () => unknown;
    children?: ReactNode;
  };
  export function DescriptionOrError({ formState, clearErrors, children }: DescriptionOrErrorProps) {
    if (formState.errors.root?.message) {
      return (
        <div className="border-3 border-c-error p-3 rounded-lg flex justify-between items-start">
          <pre className="text-c-error">{formState.errors.root.message}</pre>
          <button className="cursor-pointer" onClick={() => clearErrors()}>
            <Icon variant="close" className="size-5" />
          </button>
        </div>
      );
    }
    return children;
  }
}
