import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";
import { useEffect } from "react";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: (
    <>
      Used for creating MariaDB backups using <FormElements.Code>mariadb-dump</FormElements.Code>.
    </>
  ),
  fields: {
    connectionReference: {
      label: "Connection reference",
      description: (
        <>
          Specifies which environment variable contains the MariaDB connection string in the format{" "}
          <FormElements.Code break>mariadb://username:password@hostname:3306</FormElements.Code> or{" "}
          <FormElements.Code break>mysql://username:password@hostname:3306</FormElements.Code>.
        </>
      ),
    },
    toolkit_resolution: {
      label: "Toolkit resolution",
      description: (
        <>
          Specifies how to find MariaDB executables (like <FormElements.Code>mariadb</FormElements.Code>).
        </>
      ),
    },
    toolkit_mariadb: {
      label: 'Toolkit: "mariadb" path',
      description: (
        <>
          Specifies where to find the <FormElements.Code>mariadb</FormElements.Code> executable.
        </>
      ),
    },
    toolkit_mariadb_dump: {
      label: 'Toolkit: "mariadb-dump" path',
      description: (
        <>
          Specifies where to find the <FormElements.Code>mariadb-dump</FormElements.Code> executable.
        </>
      ),
    },
    databaseSelection_strategy: {
      label: "Database selection method",
      description: "Specifies whether to backup all databases, or only a selection.",
    },
    databaseSelection_inclusions: {
      label: "Database selection: inclusions",
      description: "Specifies (comma-separated) database names to include in the backup.",
    },
    databaseSelection_exclusions: {
      label: "Database selection: exclusions",
      description: "Specifies (comma-separated) database names to exclude from the backup.",
    },
  },
});

type Form = {
  [Field.connectionReference]: string;
  [Field.toolkit_resolution]: "automatic" | "manual";
  [Field.toolkit_mariadb]: string;
  [Field.toolkit_mariadb_dump]: string;
  [Field.databaseSelection_strategy]: "all" | "include" | "exclude";
  [Field.databaseSelection_inclusions]: string;
  [Field.databaseSelection_exclusions]: string;
};
function defaultValues(existing: Step.MariadbBackup | undefined): Form {
  return {
    [Field.connectionReference]: existing?.connectionReference ?? "",
    [Field.toolkit_resolution]: existing?.toolkit.resolution ?? "automatic",
    [Field.toolkit_mariadb]: existing?.toolkit.resolution === "manual" ? existing.toolkit.mariadb : "",
    [Field.toolkit_mariadb_dump]: existing?.toolkit.resolution === "manual" ? existing.toolkit["mariadb-dump"] : "",
    [Field.databaseSelection_strategy]: existing?.databaseSelection.method ?? "all",
    [Field.databaseSelection_inclusions]:
      existing?.databaseSelection.method === "include" ? existing.databaseSelection.inclusions.join(",") : "",
    [Field.databaseSelection_exclusions]:
      existing?.databaseSelection.method === "exclude" ? existing.databaseSelection.exclusions.join(",") : "",
  };
}

type Props = {
  id: string;
  existing?: Step.MariadbBackup;
  onSave: (step: Step.MariadbBackup) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function MariadbBackupForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const { register, handleSubmit, formState, watch, setError, clearErrors, reset } = useForm<Form>({
    defaultValues: defaultValues(existing),
  });
  useEffect(() => reset(defaultValues(existing)), [existing]);
  const submit: SubmitHandler<Form> = async (form) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId,
        object: "step",
        type: Step.Type.mariadb_backup,
        connectionReference: form[Field.connectionReference],
        toolkit:
          form[Field.toolkit_resolution] === "automatic"
            ? { resolution: "automatic" }
            : {
                resolution: "manual",
                mariadb: form[Field.toolkit_mariadb],
                "mariadb-dump": form[Field.toolkit_mariadb_dump],
              },
        databaseSelection:
          form[Field.databaseSelection_strategy] === "all"
            ? {
                method: "all",
              }
            : form[Field.databaseSelection_strategy] === "include"
              ? {
                  method: "include",
                  inclusions: form[Field.databaseSelection_inclusions].split(",").filter(Boolean),
                }
              : {
                  method: "exclude",
                  exclusions: form[Field.databaseSelection_exclusions].split(",").filter(Boolean),
                },
      });
    } catch (error) {
      setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const toolkitResolution = watch(Field.toolkit_resolution);
  const databaseSelectionStrategy = watch(Field.databaseSelection_strategy);
  const { activeField, setActiveField } = FormElements.useActiveField<Form>();
  return (
    <FormElements.Container className={className}>
      <FormElements.Left>
        <fieldset disabled={formState.isSubmitting} className="flex flex-col gap-4">
          <FormElements.LabeledInput
            field={Field.connectionReference}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.toolkit_resolution}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "select", options: ["automatic", "manual"] }}
          />
          {toolkitResolution === "manual" && (
            <>
              <FormElements.LabeledInput
                field={Field.toolkit_mariadb}
                labels={Label}
                register={register}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                input={{ type: "text" }}
              />
              <FormElements.LabeledInput
                field={Field.toolkit_mariadb_dump}
                labels={Label}
                register={register}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                input={{ type: "text" }}
              />
            </>
          )}
          <FormElements.LabeledInput
            field={Field.databaseSelection_strategy}
            labels={Label}
            register={register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "select", options: ["all", "include", "exclude"] }}
          />
          {databaseSelectionStrategy === "include" && (
            <FormElements.LabeledInput
              field={Field.databaseSelection_inclusions}
              labels={Label}
              register={register}
              activeField={activeField}
              onActiveFieldChange={setActiveField}
              input={{ type: "text" }}
            />
          )}
          {databaseSelectionStrategy === "exclude" && (
            <FormElements.LabeledInput
              field={Field.databaseSelection_exclusions}
              labels={Label}
              register={register}
              activeField={activeField}
              onActiveFieldChange={setActiveField}
              input={{ type: "text" }}
            />
          )}
        </fieldset>
        <FormElements.ButtonBar
          className="mt-12"
          existing={existing}
          formState={formState}
          onSubmit={handleSubmit(submit)}
          onDelete={onDelete}
          onCancel={onCancel}
        />
      </FormElements.Left>
      <FormElements.Right
        stepType={Step.Type.mariadb_backup}
        formState={formState}
        clearErrors={clearErrors}
        fieldDescriptions={Description}
        fieldCurrentlyActive={activeField}
      >
        {summary}
      </FormElements.Right>
    </FormElements.Container>
  );
}
MariadbBackupForm.Field = Field;
MariadbBackupForm.Label = Label;
