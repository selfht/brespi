import { ProblemDetails } from "@/models/ProblemDetails";
import { Step } from "@/models/Step";
import { StepFlatten } from "@/types/StepFlatten";
import { PipelineView } from "@/views/PipelineView";
import { Temporal } from "@js-temporal/polyfill";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { Block } from "../canvas/Block";
import { Canvas } from "../canvas/Canvas";
import { CanvasEvent } from "../canvas/CanvasEvent";
import { Interactivity } from "../canvas/Interactivity";
import { PipelineClient } from "../clients/PipelineClient";
import { QueryKey } from "../clients/QueryKey";
import { ArtifactSymbol } from "../comps/ArtifactSymbol";
import { Button } from "../comps/Button";
import { ErrorDump } from "../comps/ErrorDump";
import { Paper } from "../comps/Paper";
import { Skeleton } from "../comps/Skeleton";
import { Spinner } from "../comps/Spinner";
import { SquareIcon } from "../comps/SquareIcon";
import { StepForm } from "../forms/StepForm";
import { useRegistry } from "../hooks/useRegistry";
import { StepTranslation } from "../translation/StepTranslation";
import "./pipelines.$id.css";

type Form = {
  interactivity: Interactivity;
  name: string;
  steps: Step[];
};

export function pipelines_$id() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pipelineClient = useRegistry.instance(PipelineClient);

  const query = useQuery<Internal.PipelineWithInitialBlocks | "new", ProblemDetails>({
    queryKey: [QueryKey.pipelines, id],
    queryFn: () => {
      if (id === "new") {
        return "new";
      }
      return pipelineClient.find(id!).then<Internal.PipelineWithInitialBlocks>(Internal.convert);
    },
  });

  const [detailForm, setDetailForm] = useState<{ id: string; type: Step.Type; existingStep?: Step }>();
  const mainForm = useForm<Form>();

  const now = useMemo(() => Temporal.Now.plainDateTimeISO(), []);
  const reset = (basis: Internal.PipelineWithInitialBlocks | "new") => {
    if (basis === "new") {
      mainForm.reset({
        interactivity: Interactivity.editing,
        name: `My New Pipeline (${now.toLocaleString()})`,
        steps: [],
      });
    } else {
      mainForm.reset({
        interactivity: Interactivity.viewing,
        name: basis.name,
        steps: basis.steps,
      });
    }
  };
  const cancel = () => {
    if (query.data === "new") {
      navigate("/pipelines");
    } else {
      console.log("TODO: undo form changes");
      mainForm.setValue("interactivity", Interactivity.viewing);
    }
  };
  const save = () => {
    console.log("TODO: save updated pipeline");
    mainForm.setValue("interactivity", Interactivity.viewing);
  };
  const showDetailForm = (type: Step.Type, existingStep?: Step) => {
    const id = existingStep?.id ?? `${Math.random()}`; // TODO!!!
    setDetailForm({ id, type, existingStep });
    canvas.current?.insert({
      id,
      label: "NEW",
      details: {},
      handles: Internal.convertTypeToHandles(type),
      selected: true,
    });
  };

  /**
   * Initialze the form
   */
  useEffect(() => {
    if (query.data) {
      reset(query.data);
    }
  }, [query.data, mainForm]);

  /**
   * Handle new or updated steps
   */
  const handleStepUpdate = (step: Step) => {
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
    setDetailForm(undefined);
  };
  const handleStepCancel = () => {
    setDetailForm((df) => {
      if (df) {
        const didNewStepGetTemporarilyAdded = !df.existingStep;
        if (didNewStepGetTemporarilyAdded) {
          canvas.current?.remove(df.id);
        }
      }
      return undefined;
    });
  };
  /**
   * Handle arrow relation updates
   */
  const handleBlocksChange = (event: CanvasEvent, blocks: Block[]) => {
    console.log(event, blocks);
    mainForm.setValue(
      "steps",
      mainForm.getValues("steps").map((step) => {
        const block = blocks.find((b) => b.id === step.id);
        if (!block) {
          throw new Error(`Block not found ???`);
        }
        return {
          ...step,
          previousStepId: block.incomingId,
        };
      }),
    );
  };

  const canvas = useRef<Canvas.Api>(null);
  const { interactivity, name } = mainForm.watch();

  const buttonGroups = useMemo(() => Internal.getButtonGroups(), []);
  return (
    <Skeleton>
      <Paper className="col-span-full u-subgrid">
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
              <div className="flex gap-4">
                {interactivity === Interactivity.viewing ? (
                  <>
                    <Button icon="play">Execute</Button>
                    <Button onClick={() => mainForm.setValue("interactivity", Interactivity.editing)}>Edit</Button>
                  </>
                ) : (
                  <>
                    <Button onClick={cancel} className="border-c-primary/80 bg-c-primary/80 text-c-dark hover:bg-c-primary">
                      Cancel
                    </Button>
                    <Button onClick={save} className="border-c-success/80 bg-c-success/80 text-c-dark hover:bg-c-success">
                      Save
                    </Button>
                  </>
                )}
              </div>
            </div>
            {/* CANVAS */}
            <div className="col-span-full px-6">
              <div
                className={clsx("h-[500px] rounded-lg overflow-hidden", {
                  "bg-white": interactivity === Interactivity.viewing,
                  "bg-white/90": interactivity === Interactivity.editing,
                })}
              >
                <Canvas
                  ref={canvas}
                  interactivity={interactivity}
                  initialBlocks={query.data === "new" ? [] : query.data.initialBlocks}
                  onBlocksChange={handleBlocksChange}
                />
              </div>
            </div>
            {/* DETAILS */}
            {interactivity === Interactivity.viewing ? (
              <>
                <div className="col-span-6 p-6">
                  <h2 className="mb-6 text-xl font-extralight">Execution History</h2>
                  {(query.data as Internal.PipelineWithInitialBlocks).executions.map((execution) => (
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
                  {(query.data as Internal.PipelineWithInitialBlocks).executions.length === 0 && <SquareIcon variant="no_data" />}
                </div>
                {(query.data as Internal.PipelineWithInitialBlocks).executions.length > 0 && (
                  <div className="col-span-6 p-6">
                    <h2 className="mb-6 text-xl font-extralight">Execution Details</h2>
                    <p className="text-c-dim font-extralight">Select an execution to see its details.</p>
                  </div>
                )}
              </>
            ) : detailForm === undefined ? (
              <>
                {buttonGroups.map((bg) => (
                  <div key={bg.category} className="col-span-4 px-6 pt-10 pb-20 pr-3 flex flex-col">
                    <ArtifactSymbol variant={bg.category} />
                    <div className="font-extralight text-c-dim mt-3">{bg.categoryLabel}</div>
                    <div className="flex flex-wrap gap-2 mt-6">
                      {bg.steps.map((step) => (
                        <Button key={step.type} onClick={() => showDetailForm(step.type)} icon="new" className="border-c-info!">
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
                id={detailForm.id}
                type={detailForm.type}
                existing={detailForm.existingStep}
                onCancel={handleStepCancel}
                onSubmit={handleStepUpdate}
              />
            )}
          </>
        )}
      </Paper>
    </Skeleton>
  );
}

namespace Internal {
  export type PipelineWithInitialBlocks = PipelineView & {
    initialBlocks: Block[];
  };
  export function convert(pipeline: PipelineView): PipelineWithInitialBlocks {
    return {
      ...pipeline,
      initialBlocks: pipeline.steps.map<Block>((step) => {
        return {
          id: step.id,
          incomingId: step.previousStepId,
          label: StepTranslation.type(step.type),
          details: convertToDetails(step),
          handles: convertTypeToHandles(step.type),
          selected: false,
        };
      }),
    };
  }
  export function convertToDetails(step: Step): Block["details"] {
    type Primitive = string | number | boolean | undefined;
    const result: Record<string, Primitive> = {};
    const labels = StepTranslation.details(step.type);
    Object.entries(StepFlatten.perform(step)).forEach(([key, value]) => {
      if (value !== undefined) {
        result[(labels as Record<string, string>)[key]] = value as Primitive;
      }
    });
    return result;
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
