import { Prettify } from "@/helpers/Prettify";
import { Action } from "@/models/Action";
import { Execution } from "@/models/Execution";
import { Outcome } from "@/models/Outcome";
import { Pipeline } from "@/models/Pipeline";
import { ProblemDetails } from "@/models/ProblemDetails";
import { Step } from "@/models/Step";
import { ServerMessage } from "@/socket/ServerMessage";
import { PipelineView } from "@/views/PipelineView";
import { Temporal } from "@js-temporal/polyfill";
import clsx from "clsx";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { Form, useNavigate, useParams } from "react-router";
import { Block } from "../canvas/Block";
import { Canvas } from "../canvas/Canvas";
import { CanvasEvent } from "../canvas/CanvasEvent";
import { Interactivity } from "../canvas/Interactivity";
import { ExecutionClient } from "../clients/ExecutionClient";
import { PipelineClient } from "../clients/PipelineClient";
import { SocketClient } from "../clients/SocketClient";
import { ArtifactSymbol } from "../comps/ArtifactSymbol";
import { Button } from "../comps/Button";
import { ErrorDump } from "../comps/ErrorDump";
import { ExecutionPanel } from "../comps/execution/ExecutionPanel";
import { Icon } from "../comps/Icon";
import { Paper } from "../comps/Paper";
import { Skeleton } from "../comps/Skeleton";
import { Spinner } from "../comps/Spinner";
import { ActionDetails } from "../details/ActionDetails";
import { StepDescription } from "../details/StepDescription";
import { StepDetails } from "../details/StepDetails";
import { FormHelper } from "../forms/FormHelper";
import { StepForm } from "../forms/StepForm";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useFullScreen } from "../hooks/useFullScreen";
import { useRegistry } from "../hooks/useRegistry";
import { useStateRef } from "../hooks/useStateRef";
import { useYesQuery } from "../hooks/useYesQuery";

type Form = {
  interactivity: Interactivity;
  name: string;
  steps: Step[];
};

export function pipelines_$id() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pipelineClient = useRegistry(PipelineClient);
  const executionClient = useRegistry(ExecutionClient);
  const socketClient = useRegistry(SocketClient);

  /**
   * Data
   */
  const pipelineQuery = useYesQuery<"new" | PipelineView, ProblemDetails>(
    {
      async queryFn() {
        if (id === "new") {
          return "new";
        }
        return await pipelineClient.find(id!);
      },
    },
    [id],
  );
  const executionsQuery = useYesQuery<Execution[], ProblemDetails>(
    {
      async queryFn() {
        if (id === "new") {
          return [];
        }
        return await executionClient.query({ pipelineId: id! });
      },
    },
    [id],
  );

  useDocumentTitle(
    pipelineQuery.data
      ? `${pipelineQuery.data === "new" ? "New" : pipelineQuery.data.name} | Pipelines | Brespi` //
      : "Pipelines | Brespi",
  );

  /**
   * Full screen
   */
  const { fullScreenElementRef, isFullScreen, toggleFullScreen } = useFullScreen();

  /**
   * Canvas
   */
  const canvasApi = useRef<Canvas.Api>(null);

  /**
   * Forms
   */
  const mainForm = useForm<Form>();
  const [stepForm, stepFormRef, setStepForm] = useStateRef<{ id: string; type: Step.Type; existingStep?: Step }>();

  /**
   * General reset function (invoked initially, or after saving)
   */
  const reset = (initial: "new" | PipelineView) => {
    // Reset the main form
    if (initial === "new") {
      mainForm.reset({
        interactivity: Interactivity.editing,
        name: `My New Pipeline (${Prettify.timestamp(Temporal.Now.plainDateTimeISO())})`,
        steps: [],
      });
    } else {
      mainForm.reset({
        interactivity: Interactivity.viewing,
        name: initial.name,
        steps: initial.steps,
      });
    }
    // Close the step form
    setStepForm(undefined);
    // Reset the canvas based on the currently available steps
    resetCanvas(initial);
  };
  const resetCanvas = (source: Pipeline | "new" | Execution) => {
    let blocks: Block[];
    if (source === "new") {
      blocks = [];
    } else if (source.object === "pipeline") {
      blocks = source.steps.map(Internal.convertStepToBlock);
    } else {
      blocks = source.actions.map(Internal.convertActionToBlock);
    }
    canvasApi.current!.reset(blocks);
  };

  /**
   * Execute a pipeline (causes a data refresh)
   */
  const isCurrentlyExecuting = executionsQuery.data?.some((e) => !e.result) || false;

  const [selectedExecutionId, selectedExecutionIdRef, setSelectedExecutionId] = useStateRef<string>();
  const selectExecution = (executionId: string) => {
    const execution = executionsQuery.getData()?.find(({ id }) => id === executionId);
    if (!execution) {
      throw new Error("Illegal state: could not find selected execution");
    }
    setSelectedExecutionId(executionId);
    resetCanvas(execution);
  };
  const deselectExecution = () => {
    setSelectedExecutionId(undefined);
    const pipeline = pipelineQuery.getData();
    if (pipeline) {
      resetCanvas(pipeline);
    }
  };

  // Actually execute
  const execute = async () => {
    if (pipelineQuery.getData() !== "new") {
      try {
        /**
         * We have to temporarily pause and buffer incoming execution updates during the creation ...
         * otherwise the socket updates come in too early, before we've even received an HTTP response on our `create` endpoint
         */
        socketClient.pauseAndBuffer(socketSubscriptionRef.current!);
        const lastExecution = await executionClient.create({ pipelineId: id! });
        executionsQuery.setData([lastExecution, ...(executionsQuery.getData() || [])]);
        selectExecution(lastExecution.id);
      } finally {
        socketClient.continueAndDrain(socketSubscriptionRef.current!);
      }
    }
  };

  // Listen for (socket) execution updates
  const socketSubscriptionRef = useRef<string>(undefined);
  useEffect(() => {
    socketSubscriptionRef.current = socketClient.subscribe({
      type: ServerMessage.Type.execution_update,
      callback({ execution: newExecution }) {
        const executions = executionsQuery.getData() || [];
        const oldExecution = executions.find(({ id }) => id === selectedExecutionIdRef.current);
        // Update the local overview (create or prepend, if new)
        const alreadyExistsInOverview = executions.some((e) => e.id === newExecution.id);
        if (alreadyExistsInOverview) {
          executionsQuery.setData(
            executions.map((e) => {
              if (e.id === newExecution.id) {
                return newExecution;
              }
              return e;
            }),
          );
        } else {
          executionsQuery.setData([newExecution, ...executions]);
        }
        // Update the canvas
        if (oldExecution && selectedExecutionIdRef.current === newExecution.id) {
          const { differingActions } = Internal.extractDifferingActions({ oldExecution, newExecution });
          differingActions.forEach((action) => {
            canvasApi.current!.update(action.stepId, Internal.convertActionToBlock(action));
          });
        }
      },
    });
    return () => {
      socketClient.unsubscribe(socketSubscriptionRef.current!);
      socketSubscriptionRef.current = undefined;
    };
  }, []);

  /**
   * Main form API
   */
  const mainFormApi = {
    async save(form: Form) {
      mainForm.clearErrors("root");
      await FormHelper.snoozeBeforeSubmit();
      try {
        if (id === "new") {
          const pipeline = await pipelineClient.create({
            name: form.name,
            steps: form.steps,
          });
          navigate(`/pipelines/${pipeline.id}`, { replace: true });
        } else {
          const pipeline = await pipelineClient.update(id!, {
            name: form.name,
            steps: form.steps,
          });
          pipelineQuery.setData(pipeline);
          // Implicitly leads to a "reset" via the effect listener on "query.data"
        }
      } catch (error) {
        mainForm.setError("root", {
          message: FormHelper.formatError(error),
        });
      }
    },
    async delete() {
      mainForm.clearErrors("root");
      await FormHelper.snoozeBeforeSubmit();
      try {
        if (confirm("Are you sure about deleting this pipeline?")) {
          await pipelineClient.delete(id!);
          navigate("/pipelines", { replace: true });
        }
      } catch (error) {
        mainForm.setError("root", {
          message: FormHelper.formatError(error),
        });
      }
    },
    cancel() {
      if (pipelineQuery.data === "new") {
        navigate("/pipelines");
      } else {
        reset(pipelineQuery.data!);
      }
    },
  };

  /**
   * Step form API
   */
  const stepFormApi = {
    show(type: Step.Type, existingStep?: Step) {
      const stepId = existingStep?.id ?? FormHelper.generateStepId();
      setStepForm((stepForm) => {
        if (stepForm) {
          const didNewStepGetTemporarilyAdded = !stepForm.existingStep;
          if (didNewStepGetTemporarilyAdded) {
            canvasApi.current!.remove(stepForm.id);
          }
        }
        return { id: stepId, type, existingStep };
      });
      if (!existingStep) {
        canvasApi.current?.insert({
          id: stepId,
          theme: "default",
          label: StepDescription.forType(type),
          details: {},
          handles: Internal.convertTypeToHandles(type),
          selected: true,
        });
      }
    },
    save(step: Step) {
      const steps = mainForm.getValues("steps");
      const existingStep: boolean = steps.some((s) => s.id === step.id);
      if (existingStep) {
        mainForm.setValue(
          "steps",
          steps.map((s) => (s.id === step.id ? step : s)),
        );
      } else {
        mainForm.setValue("steps", [...steps, step]);
      }
      setStepForm((stepForm) => {
        if (stepForm) {
          canvasApi.current!.deselect(stepForm.id);
          canvasApi.current!.update(stepForm.id, Internal.convertStepToBlock(step));
        }
        return undefined;
      });
    },
    delete(id: string) {
      const steps = mainForm.getValues("steps");
      const existingStep: boolean = steps.some((s) => s.id === id);
      if (existingStep) {
        mainForm.setValue(
          "steps",
          steps.filter((s) => s.id !== id),
        );
        setStepForm(undefined);
        canvasApi.current!.remove(id);
      } else {
        throw new Error(`Illegal state: step does not exist; id=${id}`);
      }
    },
    cancel() {
      setStepForm((stepForm) => {
        if (stepForm) {
          const didNewStepGetTemporarilyAdded = !stepForm.existingStep;
          if (didNewStepGetTemporarilyAdded) {
            canvasApi.current!.remove(stepForm.id);
          } else {
            canvasApi.current!.deselect(stepForm.id);
          }
        }
        return undefined;
      });
    },
  };

  /**
   * Handle arrow relation updates
   */
  const canvasListener = {
    handleBlocksChange(event: CanvasEvent, blocks: Block[]) {
      const interactivity = mainForm.getValues("interactivity");
      // Click events
      if (event === CanvasEvent.select) {
        const selectedBlock = blocks.find((block) => block.selected);
        const selectedStep = mainForm.getValues("steps").find((step) => step.id === selectedBlock?.id);
        if (interactivity === Interactivity.editing && selectedStep) {
          stepFormApi.show(selectedStep.type, selectedStep);
        }
      }
      if (event === CanvasEvent.deselect) {
        if (interactivity === Interactivity.editing) {
          stepFormApi.cancel();
        }
      }
      // Relation events
      if (event === CanvasEvent.relation) {
        mainForm.setValue(
          "steps",
          mainForm.getValues("steps").map((step): Step => {
            const block = blocks.find((b) => b.id === step.id);
            if (block) {
              return {
                ...step,
                previousId: block.incomingId,
              };
            }
            throw new Error(`Block not found: ${step.id}`);
          }),
        );
      }
    },
  };

  /**
   * Initializers and listeners
   */
  useEffect(() => {
    if (pipelineQuery.data) {
      reset(pipelineQuery.data);
    }
  }, [pipelineQuery.data, mainForm]);

  /**
   * Render
   */
  const { interactivity, name, steps } = mainForm.watch();
  const selectedExecution = executionsQuery.data?.find((e) => e.id === selectedExecutionId);
  const buttonGroups = useMemo(() => Internal.getButtonGroups(), []);
  return (
    <Skeleton>
      <Paper
        ref={fullScreenElementRef}
        className={clsx("col-span-full flex flex-col", {
          "bg-black!": interactivity === Interactivity.editing,
          "w-screen overflow-x-hidden overflow-y-auto": isFullScreen,
        })}
        borderClassName={clsx({
          "border-c-info bg-c-info": interactivity === Interactivity.editing && !isFullScreen,
          "border-none": isFullScreen,
        })}
      >
        {pipelineQuery.error ? (
          <div className="p-6">
            <ErrorDump error={pipelineQuery.error} />
          </div>
        ) : !pipelineQuery.data ? (
          <div className="p-6 text-center">
            <Spinner />
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="p-6 flex justify-between items-center">
              {/*<h1 className="text-xl font-extralight">{name}</h1>*/}
              <h1 className="text-xl font-extralight relative inline-block">
                <div
                  className={clsx({
                    "py-2": interactivity === Interactivity.viewing,
                    "whitespace-pre invisible h-0": interactivity === Interactivity.editing,
                  })}
                >
                  {name}
                </div>
                {interactivity === Interactivity.editing && (
                  <input type="text" className="bg-c-dim/20 py-2 w-full active:border-none" {...mainForm.register("name")} />
                )}
              </h1>
              <div className="flex items-center gap-4">
                {interactivity === Interactivity.viewing ? (
                  <>
                    {selectedExecutionId ? (
                      <Button onClick={deselectExecution}>Close execution view</Button>
                    ) : (
                      <>
                        <Button icon={isCurrentlyExecuting ? "loading" : "play"} onClick={execute} disabled={isCurrentlyExecuting}>
                          {isCurrentlyExecuting ? "Executing" : "Execute"}
                        </Button>
                        <Button onClick={() => mainForm.setValue("interactivity", Interactivity.editing)}>Edit</Button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {!mainForm.formState.isSubmitting && (
                      <>
                        <Button onClick={mainFormApi.cancel} disabled={Boolean(stepForm)}>
                          Cancel
                        </Button>
                        {id !== "new" && (
                          <Button onClick={mainForm.handleSubmit(mainFormApi.delete)} disabled={Boolean(stepForm)} theme="error">
                            Delete
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      onClick={mainForm.handleSubmit(mainFormApi.save)}
                      disabled={mainForm.formState.isSubmitting || Boolean(stepForm)}
                      theme="success"
                    >
                      {mainForm.formState.isSubmitting ? <Spinner className="border-black! border-t-transparent!" /> : "Save"}
                    </Button>
                  </>
                )}
              </div>
            </div>
            {/* CANVAS */}
            <div className={clsx("flex flex-col px-6", isFullScreen ? "flex-1 min-h-120" : "h-120")}>
              <div
                className={clsx("h-full relative rounded-lg overflow-hidden", {
                  "bg-white": interactivity === Interactivity.viewing && !selectedExecution,
                  "bg-sky-100": interactivity === Interactivity.viewing && selectedExecution && !selectedExecution.result,
                  "bg-emerald-100":
                    interactivity === Interactivity.viewing &&
                    selectedExecution &&
                    selectedExecution.result &&
                    selectedExecution.result.outcome === Outcome.success,
                  "bg-rose-100":
                    interactivity === Interactivity.viewing &&
                    selectedExecution &&
                    selectedExecution.result &&
                    selectedExecution.result.outcome === Outcome.error,
                  "bg-gray-200": interactivity === Interactivity.editing,
                })}
              >
                {mainForm.formState.errors.root?.message && (
                  <div className="absolute left-2 right-2 top-2 rounded-lg z-10 p-5 bg-black border-3 border-c-error flex justify-between items-start">
                    <pre className="text-c-error">{mainForm.formState.errors.root.message}</pre>
                    <button className="cursor-pointer" onClick={() => mainForm.clearErrors()}>
                      <Icon variant="close" className="size-5" />
                    </button>
                  </div>
                )}
                <div className="absolute left-2 right-2 bottom-2 z-10 flex justify-end gap-2 text-xs">
                  {steps && steps.length > 1 && (
                    <button
                      className={clsx("p-2 rounded-lg cursor-pointer bg-c-dark hover:text-white", {
                        "bg-black!": interactivity === Interactivity.editing,
                      })}
                      onClick={canvasApi.current?.format}
                    >
                      Reposition
                    </button>
                  )}
                  <button
                    className={clsx("p-2 rounded-lg cursor-pointer bg-c-dark hover:text-white", {
                      "bg-black!": interactivity === Interactivity.editing,
                    })}
                    onClick={toggleFullScreen}
                  >
                    Full screen
                  </button>
                </div>
                <Canvas
                  ref={canvasApi}
                  interactivity={interactivity}
                  onBlocksChange={canvasListener.handleBlocksChange}
                  extraValidateArrow={() => !stepFormRef.current} // no linking during form edits
                />
              </div>
            </div>
            {/* DETAILS */}
            {interactivity === Interactivity.viewing ? (
              <ExecutionPanel
                query={executionsQuery}
                selectedExecutionId={selectedExecutionId}
                onSelect={selectExecution}
                onDeselect={deselectExecution}
              />
            ) : stepForm === undefined ? (
              <div className="flex items-start">
                {buttonGroups.map((bg) => (
                  <div key={bg.category} className="flex-1 px-6 pt-10 pb-20 pr-3 flex flex-col">
                    <ArtifactSymbol variant={bg.category} />
                    <div className="font-extralight text-c-dim mt-3">{bg.categoryLabel}</div>
                    <div className="flex flex-wrap gap-2 mt-6">
                      {bg.steps.map((step) => (
                        <Button key={step.type} onClick={() => stepFormApi.show(step.type)} icon="new" className="border-c-info!">
                          {step.typeLabel}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <StepForm
                className="w-full p-6"
                id={stepForm.id}
                type={stepForm.type}
                existing={stepForm.existingStep}
                onSave={stepFormApi.save}
                onDelete={stepFormApi.delete}
                onCancel={stepFormApi.cancel}
              />
            )}
          </>
        )}
      </Paper>
    </Skeleton>
  );
}

namespace Internal {
  export function convertStepToBlock(step: Step): Block {
    return {
      id: step.id,
      incomingId: step.previousId,
      theme: "default",
      label: StepDescription.forType(step.type),
      details: StepDetails.get(step),
      handles: convertTypeToHandles(step.type),
      selected: false,
    };
  }
  export function convertActionToBlock(action: Action): Block {
    return {
      id: action.stepId,
      incomingId: action.previousStepId,
      theme: !action.startedAt
        ? "unused"
        : action.startedAt && !action.result
          ? "busy"
          : action.result?.outcome === Outcome.success
            ? "success"
            : "error",
      label: Step.isTypeInstance(action.stepType) ? StepDescription.forType(action.stepType) : action.stepType,
      details: ActionDetails.get(action),
      handles: Step.isTypeInstance(action.stepType) ? convertTypeToHandles(action.stepType) : [Block.Handle.input, Block.Handle.output],
      selected: false,
    };
  }

  export function convertTypeToHandles(type: Step.Type): Block["handles"] {
    const handles: Record<Step.Category, Block.Handle[]> = {
      [Step.Category.producer]: [Block.Handle.output],
      [Step.Category.transformer]: [Block.Handle.output, Block.Handle.input],
      [Step.Category.consumer]: [Block.Handle.input],
    };
    return handles[Step.getCategory({ type })];
  }

  type ActionStatusOverview = Map<string, Block["theme"]>;

  function extractActionStatuses(execution: Execution): ActionStatusOverview {
    const actionsMap: ActionStatusOverview = new Map();
    execution.actions.forEach((action) => {
      const theme: Block["theme"] = !action.startedAt
        ? "unused"
        : !action.result
          ? "busy"
          : action.result?.outcome === Outcome.success
            ? "success"
            : "error";
      actionsMap.set(action.stepId, theme);
    });
    return actionsMap;
  }

  export function extractDifferingActions({ oldExecution, newExecution }: { oldExecution: Execution; newExecution: Execution }): {
    differingActions: Action[];
  } {
    const oldActionStatuses = extractActionStatuses(oldExecution);
    const newActionStatuses = extractActionStatuses(newExecution);

    const oldActionIds = [...oldActionStatuses.keys()];
    const newActionIds = [...newActionStatuses.keys()];
    if (oldActionIds.length !== newActionIds.length || !oldActionIds.every((id) => newActionIds.includes(id))) {
      // This should never happen, because the action IDs are determined once when the action gets created
      throw new Error("Illegal state: old and new execution have different action ids");
    }
    // `oldActionIds` and `newActionIds` are the same at this point
    const differingActions: Action[] = oldActionIds
      .filter((id) => {
        const oldStatus = oldActionStatuses.get(id)!;
        const newStatus = newActionStatuses.get(id)!;
        return oldStatus !== newStatus;
      })
      .map((id) => {
        const differingAction = newExecution.actions.find((a) => a.stepId === id)!;
        return differingAction;
      });
    return { differingActions };
  }

  type ButtonGroup = {
    category: Step.Category;
    categoryLabel: string;
    steps: Array<{
      type: Step.Type;
      typeLabel: string;
    }>;
  };

  export function getButtonGroups(): ButtonGroup[] {
    const buttonGroups: ButtonGroup[] = [];
    const categoryOrder: Step.Category[] = [
      Step.Category.producer, //
      Step.Category.transformer,
      Step.Category.consumer,
    ];
    const typeOrder: Step.Type[] = [
      // Producers
      Step.Type.filesystem_read,
      Step.Type.s3_download,
      Step.Type.postgresql_backup,
      Step.Type.mariadb_backup,
      // Transformers
      Step.Type.compression,
      Step.Type.decompression,
      Step.Type.encryption,
      Step.Type.decryption,
      Step.Type.folder_group,
      Step.Type.folder_flatten,
      Step.Type.filter,
      Step.Type.custom_script,
      // Consumers
      Step.Type.filesystem_write,
      Step.Type.s3_upload,
      Step.Type.postgresql_restore,
      Step.Type.mariadb_restore,
    ];

    Object.values(Step.Type).map((type) => {
      const category = Step.getCategory({ type });
      const existing = buttonGroups.find((x) => x.category === category);
      if (existing) {
        existing.steps.push({
          type,
          typeLabel: StepDescription.forType(type),
        });
      } else {
        buttonGroups.push({
          category,
          categoryLabel: StepDescription.forCategory(category),
          steps: [
            {
              type,
              typeLabel: StepDescription.forType(type),
            },
          ],
        });
      }
    });
    return [...buttonGroups]
      .sort(({ category: c1 }, { category: c2 }) => {
        return categoryOrder.indexOf(c1) - categoryOrder.indexOf(c2);
      })
      .map(({ steps, ...bg }) => ({
        ...bg,
        steps: [...steps].sort(({ type: t1 }, { type: t2 }) => {
          return typeOrder.indexOf(t1) - typeOrder.indexOf(t2);
        }),
      }));
  }
}
