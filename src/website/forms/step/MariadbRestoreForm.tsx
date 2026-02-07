import { Step } from "@/models/Step";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormElements } from "../FormElements";
import { FormHelper } from "../FormHelper";
import { useEffect } from "react";

const { summary, Field, Label, Description } = FormHelper.meta({
  summary: (
    <>
      Used for restoring a MariaDB database from a backup artifact using the <FormElements.Code summary>mariadb</FormElements.Code> client.
    </>
  ),
  fields: {
    connection: {
      label: "Connection",
      description: (
        <>
          Specifies the MariaDB connection string in the format{" "}
          <FormElements.Code break>mariadb://username:password@hostname:3306</FormElements.Code>.
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
    database: {
      label: "Database",
      description: "Specifies the name of the target database to restore into.",
    },
  },
});

type Form = {
  [Field.connection]: string;
  [Field.toolkit_resolution]: "automatic" | "manual";
  [Field.toolkit_mariadb]: string;
  [Field.database]: string;
};
function defaultValues(existing: Step.MariadbRestore | undefined): Form {
  return {
    [Field.connection]: existing?.connection ?? "",
    [Field.toolkit_resolution]: existing?.toolkit.resolution ?? "automatic",
    [Field.toolkit_mariadb]: existing?.toolkit.resolution === "manual" ? existing.toolkit.mariadb : "",
    [Field.database]: existing?.database ?? "",
  };
}

type Props = {
  id: string;
  existing?: Step.MariadbRestore;
  onSave: (step: Step.MariadbRestore) => Promise<any>;
  onDelete: (id: string) => unknown;
  onCancel: () => unknown;
  className?: string;
};
export function MariadbRestoreForm({ id, existing, onSave, onDelete, onCancel, className }: Props) {
  const form = useForm<Form>({
    defaultValues: defaultValues(existing),
  });
  useEffect(() => form.reset(defaultValues(existing)), [existing]);
  const submit: SubmitHandler<Form> = async (values) => {
    await FormHelper.snoozeBeforeSubmit();
    try {
      await onSave({
        id,
        previousId: existing?.previousId,
        object: "step",
        type: Step.Type.mariadb_restore,
        connection: values[Field.connection],
        toolkit:
          values[Field.toolkit_resolution] === "automatic"
            ? { resolution: "automatic" }
            : {
                resolution: "manual",
                mariadb: values[Field.toolkit_mariadb],
              },
        database: values[Field.database],
      });
    } catch (error) {
      form.setError("root", {
        message: FormHelper.formatError(error),
      });
    }
  };

  const toolkitResolution = form.watch(Field.toolkit_resolution);
  const { activeField, setActiveField } = FormElements.useActiveField<Form>();
  return (
    <FormElements.Container className={className}>
      <FormElements.Left>
        <fieldset disabled={form.formState.isSubmitting} className="flex flex-col gap-4">
          <FormElements.LabeledInput
            field={Field.connection}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
          <FormElements.LabeledInput
            field={Field.toolkit_resolution}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "select", options: ["automatic", "manual"] }}
          />
          {toolkitResolution === "manual" && (
            <>
              <FormElements.LabeledInput
                field={Field.toolkit_mariadb}
                labels={Label}
                register={form.register}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
                input={{ type: "text" }}
              />
            </>
          )}
          <FormElements.LabeledInput
            field={Field.database}
            labels={Label}
            register={form.register}
            activeField={activeField}
            onActiveFieldChange={setActiveField}
            input={{ type: "text" }}
          />
        </fieldset>
        <FormElements.ButtonBar
          className="mt-12"
          existing={existing}
          formState={form.formState}
          onSubmit={form.handleSubmit(submit)}
          onDelete={onDelete}
          onCancel={onCancel}
        />
      </FormElements.Left>
      <FormElements.Right
        form={form} //
        stepType={Step.Type.mariadb_restore}
        fieldDescriptions={Description}
        fieldCurrentlyActive={activeField}
      >
        {summary}
      </FormElements.Right>
    </FormElements.Container>
  );
}
MariadbRestoreForm.Field = Field;
MariadbRestoreForm.Label = Label;
