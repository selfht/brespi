import { ProblemDetails } from "@/models/ProblemDetails";
import { Step } from "@/models/Step";
import { PipelineView } from "@/views/PipelineView";
import { Temporal } from "@js-temporal/polyfill";
import { QueryClient, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Form, useNavigate, useParams } from "react-router";
import { Block } from "../canvas/Block";
import { Canvas } from "../canvas/Canvas";
import { CanvasEvent } from "../canvas/CanvasEvent";
import { Interactivity } from "../canvas/Interactivity";
import { PipelineClient } from "../clients/PipelineClient";
import { QueryKey } from "../clients/QueryKey";
import { ArtifactSymbol } from "../comps/ArtifactSymbol";
import { Button } from "../comps/Button";
import { ErrorDump } from "../comps/ErrorDump";
import { Icon } from "../comps/Icon";
import { Paper } from "../comps/Paper";
import { Skeleton } from "../comps/Skeleton";
import { Spinner } from "../comps/Spinner";
import { SquareIcon } from "../comps/SquareIcon";
import { FormHelper } from "../forms/FormHelper";
import { StepForm } from "../forms/StepForm";
import { useRegistry } from "../hooks/useRegistry";
import bgCanvas from "../images/bg-canvas.svg";
import { StepTranslation } from "../translation/StepTranslation";

type Form = {
  interactivity: Interactivity;
  name: string;
  steps: Step[];
};

export function pipelines_$id() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useRegistry.instance(QueryClient);
  const pipelineClient = useRegistry.instance(PipelineClient);

  const queryKey = [QueryKey.pipelines, id];
  const query = useQuery<"new" | PipelineView, ProblemDetails>({
    queryKey: [QueryKey.pipelines, id],
    queryFn: () => {
      if (id === "new") {
        return "new";
      }
      return pipelineClient.find(id!);
    },
  });

  /**
   * Refs
   */
  const canvasApi = useRef<Canvas.Api>(null);

  /**
   * Forms
   */
  const mainForm = useForm<Form>();
  const [stepForm, setStepForm] = useState<{ id: string; type: Step.Type; existingStep?: Step }>();

  /**
   * General reset function (invoked initially, or after saving)
   */
  const reset = (initial: "new" | PipelineView) => {
    if (initial === "new") {
      mainForm.reset({
        interactivity: Interactivity.editing,
        name: `My New Pipeline (${Temporal.Now.plainTimeISO().toLocaleString()})`,
        steps: [],
      });
    } else {
      mainForm.reset({
        interactivity: Interactivity.viewing,
        name: initial.name,
        steps: initial.steps,
      });
    }
    const blocks = initial === "new" ? [] : initial.steps.map(Internal.convertStepToBlock);
    canvasApi.current!.reset(blocks);
  };

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
            id: id!,
            name: form.name,
            steps: form.steps,
          });
          queryClient.setQueryData(queryKey, pipeline);
          // Implicitly leads to a "reset" via the effect listener on "query.data"
        }
      } catch (error) {
        mainForm.setError("root", {
          message: FormHelper.formatError(error),
        });
      }
    },
    cancel() {
      if (query.data === "new") {
        navigate("/pipelines");
      } else {
        reset(query.data!);
      }
    },
  };

  /**
   * Step form API
   */
  const stepFormApi = {
    show(type: Step.Type, existingStep?: Step) {
      const stepId = existingStep?.id ?? FormHelper.generateStepId();
      setStepForm({ id: stepId, type, existingStep });
      if (!existingStep) {
        canvasApi.current?.insert({
          id: stepId,
          label: StepTranslation.type(type),
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
   * Initialze (reset) the main form
   */
  useEffect(() => {
    if (query.data) {
      reset(query.data);
    }
  }, [query.data, mainForm]);

  /**
   * Render
   */
  const { interactivity, name, steps } = mainForm.watch();
  const buttonGroups = useMemo(() => Internal.getButtonGroups(), []);
  return (
    <Skeleton>
      <Paper
        className={clsx("col-span-full u-subgrid", {
          "bg-black!": interactivity === Interactivity.editing,
        })}
        borderClassName={clsx({
          "border-c-info bg-c-info": interactivity === Interactivity.editing,
        })}
      >
        {query.error ? (
          <div className="col-span-full p-6 text-center">
            <ErrorDump error={query.error} />
          </div>
        ) : !query.data ? (
          <div className="col-span-full p-6 text-center">
            <Spinner />
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="col-span-full p-6 flex justify-between items-center">
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
                    <Button icon="play">Execute</Button>
                    <Button onClick={() => mainForm.setValue("interactivity", Interactivity.editing)}>Edit</Button>
                  </>
                ) : (
                  <>
                    {!mainForm.formState.isSubmitting && (
                      <Button
                        onClick={mainFormApi.cancel}
                        disabled={mainForm.formState.isSubmitting || Boolean(stepForm)}
                        className="border-c-primary/80 bg-c-primary/80 text-c-dark hover:bg-c-primary"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      onClick={mainForm.handleSubmit(mainFormApi.save)}
                      disabled={mainForm.formState.isSubmitting || Boolean(stepForm)}
                      className="border-c-success/80 bg-c-success/80 text-c-dark hover:bg-c-success"
                    >
                      {mainForm.formState.isSubmitting ? <Spinner className="border-black! border-t-transparent!" /> : "Save"}
                    </Button>
                  </>
                )}
              </div>
            </div>
            {/* CANVAS */}
            <div className="col-span-full px-6">
              <div
                className={clsx("relative h-[30rem] rounded-lg overflow-hidden", {
                  "bg-white bg-none!": interactivity === Interactivity.viewing,
                  "bg-white/95": interactivity === Interactivity.editing,
                })}
                style={{ backgroundImage: `url(${bgCanvas})`, backgroundSize: 10 }}
              >
                {mainForm.formState.errors.root?.message && (
                  <div className="absolute w-[calc(100%-1rem)] left-2 top-2 rounded-lg z-10 p-5 bg-black border-3 border-c-error flex justify-between items-start">
                    <pre className="text-c-error">{mainForm.formState.errors.root.message}</pre>
                    <button className="cursor-pointer" onClick={() => mainForm.clearErrors()}>
                      <Icon variant="close" className="size-5" />
                    </button>
                  </div>
                )}
                {steps && steps.length > 1 && (
                  <button
                    className="absolute bottom-2 right-2 p-2 rounded-lg bg-c-dark hover:text-white cursor-pointer z-10"
                    onClick={canvasApi.current?.format}
                  >
                    Reposition
                  </button>
                )}
                <Canvas ref={canvasApi} interactivity={interactivity} onBlocksChange={canvasListener.handleBlocksChange} />
              </div>
            </div>
            {/* DETAILS */}
            {interactivity === Interactivity.viewing ? (
              <>
                <div className="col-span-6 p-6">
                  <h2 className="mb-6 text-xl font-extralight">Execution History</h2>
                  {(query.data as PipelineView).executions.map((execution) => (
                    <button key={execution.id} className="mt-4 flex items-center text-left gap-4 group cursor-pointer">
                      <SquareIcon variant={execution.outcome} className="group-hover:border-white group-hover:bg-c-dim/20" />
                      <div>
                        <h3 className="text-base font-medium group-hover:text-white">
                          {execution.outcome === "success" ? "Successfully executed" : "Failed to execute"}
                        </h3>
                        <p className="font-light italic text-c-dim">{execution.completedAt.toLocaleString()}</p>
                      </div>
                    </button>
                  ))}
                  {(query.data as PipelineView).executions.length === 0 && <SquareIcon variant="no_data" />}
                </div>
                {(query.data as PipelineView).executions.length > 0 && (
                  <div className="col-span-6 p-6">
                    <h2 className="mb-6 text-xl font-extralight">Execution Details</h2>
                    <p className="text-c-dim font-extralight">Select an execution to see its details.</p>
                  </div>
                )}
              </>
            ) : stepForm === undefined ? (
              <>
                {buttonGroups.map((bg) => (
                  <div key={bg.category} className="col-span-4 px-6 pt-10 pb-20 pr-3 flex flex-col">
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
              </>
            ) : (
              <StepForm
                className="col-span-full p-6"
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
      label: StepTranslation.type(step.type),
      details: StepTranslation.details(step),
      handles: convertTypeToHandles(step.type),
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

    const categoryOrder: Step.Category[] = [Step.Category.producer, Step.Category.transformer, Step.Category.consumer];

    const typeOrder: Step.Type[] = [
      // Producers
      Step.Type.filesystem_read,
      Step.Type.s3_download,
      Step.Type.postgres_backup,
      // Transformers
      Step.Type.compression,
      Step.Type.decompression,
      Step.Type.encryption,
      Step.Type.decryption,
      Step.Type.folder_group,
      Step.Type.folder_flatten,
      Step.Type.decryption,
      Step.Type.script_execution,
      // Consumers
      Step.Type.filesystem_write,
      Step.Type.s3_upload,
      Step.Type.postgres_restore,
    ];

    Object.values(Step.Type).map((type) => {
      const category = Step.getCategory({ type });
      const existing = buttonGroups.find((x) => x.category === category);
      if (existing) {
        existing.steps.push({
          type,
          typeLabel: StepTranslation.type(type),
        });
      } else {
        buttonGroups.push({
          category,
          categoryLabel: StepTranslation.category(category),
          steps: [
            {
              type,
              typeLabel: StepTranslation.type(type),
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
