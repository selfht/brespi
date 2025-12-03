import { ProblemDetails } from "@/models/ProblemDetails";
import { Step } from "@/models/Step";
import { PipelineView } from "@/views/PipelineView";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router";
import { Block } from "../canvas/Block";
import { Canvas } from "../canvas/Canvas";
import { PipelineClient } from "../clients/PipelineClient";
import { QueryKey } from "../clients/QueryKey";
import { ArtifactSymbol } from "../comps/ArtifactSymbol";
import { Button } from "../comps/Button";
import { ErrorDump } from "../comps/ErrorDump";
import { Paper } from "../comps/Paper";
import { Skeleton } from "../comps/Skeleton";
import { Spinner } from "../comps/Spinner";
import { SquareIcon } from "../comps/SquareIcon";
import { useRegistry } from "../hooks/useRegistry";
import "./pipelines.$id.css";
import { useNavigate } from "react-router";

type Form = {
  mode: "viewing" | "editing";
  name: string;
  steps: Step[];
};

export function pipelines_$id() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pipelineClient = useRegistry.instance(PipelineClient);

  const query = useQuery<Logic.PipelineWithBlocks | "new", ProblemDetails>({
    queryKey: [QueryKey.pipelines, id],
    queryFn: () => {
      if (id === "new") {
        return "new";
      }
      return pipelineClient.find(id!).then<Logic.PipelineWithBlocks>(Logic.convert);
    },
  });

  const form = useForm<Form>();
  const reset = (basis: Logic.PipelineWithBlocks | "new") => {
    if (basis === "new") {
      form.reset({
        mode: "editing",
        name: "",
        steps: [],
      });
    } else {
      form.reset({
        mode: "viewing",
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
      form.setValue("mode", "viewing");
    }
  };
  const save = () => {
    console.log("TODO: save updated pipeline");
    form.setValue("mode", "viewing");
  };

  useEffect(() => {
    if (query.data) {
      reset(query.data);
    }
  }, [query.data, form]);

  /**
   * Only responsibility: update the arrow relations on steps
   */
  const handleCanvasChange = (blocks: Block[]) => {
    form.setValue(
      "steps",
      form.getValues("steps").map((step) => {
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
  const { mode, name } = form.watch();

  const buttonGroups = useMemo(() => Logic.getButtonGroups(), []);
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
                    "py-2": mode === "viewing",
                    "whitespace-pre invisible h-0": mode === "editing",
                  })}
                >
                  {name}
                </div>
                {mode === "editing" && (
                  <input
                    placeholder="Enter pipeline name ..."
                    type="text"
                    className="bg-c-dim/20 py-2 w-full active:border-none"
                    {...form.register("name")}
                  />
                )}
              </h1>
              <div className="flex gap-4">
                {mode === "viewing" ? (
                  <>
                    <Button icon="play">Execute</Button>
                    <Button onClick={() => form.setValue("mode", "editing")}>Edit</Button>
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
                className={clsx("h-[400px] rounded-lg overflow-hidden", {
                  "bg-white": mode === "viewing",
                  "bg-white/90": mode === "editing",
                })}
              >
                <Canvas
                  ref={canvas}
                  mode={mode}
                  initialBlocks={query.data === "new" ? [] : query.data.blocks}
                  onBlocksChange={handleCanvasChange}
                />
              </div>
            </div>
            {/* DETAILS */}
            {mode === "viewing" ? (
              <>
                <div className="col-span-6 p-6">
                  <h2 className="mb-6 text-xl font-extralight">Execution History</h2>
                  {(query.data as Logic.PipelineWithBlocks).executions.map((execution) => (
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
                  {(query.data as Logic.PipelineWithBlocks).executions.length === 0 && <SquareIcon variant="no_data" />}
                </div>
                {(query.data as Logic.PipelineWithBlocks).executions.length > 0 && (
                  <div className="col-span-6 p-6">
                    <h2 className="mb-6 text-xl font-extralight">Execution Details</h2>
                    <p className="text-c-dim font-extralight">Select an execution to see its details.</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {buttonGroups.map((bg) => (
                  <div key={bg.category} className="col-span-4 px-6 pt-10 pb-20 pr-3 flex flex-col">
                    <ArtifactSymbol variant={bg.category} />
                    <div className="font-extralight text-c-dim mt-3">{bg.categoryLabel}</div>
                    <div className="flex flex-wrap gap-2 mt-6">
                      {bg.steps.map((step) => (
                        <Button key={step.type} icon="new" className="border-c-info!">
                          {step.typeLabel}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </Paper>
    </Skeleton>
  );
}

namespace Logic {
  // TODO: translation file?
  const categoryLabels: Record<Step.Category, string> = {
    [Step.Category.producer]: "Artifact producers",
    [Step.Category.transformer]: "Artifact transformers",
    [Step.Category.consumer]: "Artifact consumers",
  };
  const typeLabels: Record<Step.Type, string> = {
    [Step.Type.fs_read]: "Filesystem Read",
    [Step.Type.fs_write]: "Filesystem Write",
    [Step.Type.postgres_backup]: "Postgres Backup",
    [Step.Type.compression]: "Compression",
    [Step.Type.decompression]: "Decompression",
    [Step.Type.encryption]: "Encryption",
    [Step.Type.decryption]: "Decryption",
    [Step.Type.s3_upload]: "S3 Upload",
    [Step.Type.s3_download]: "S3 Download",
  };

  export type PipelineWithBlocks = PipelineView & {
    blocks: Block[];
  };
  export function convert(pipeline: PipelineView): PipelineWithBlocks {
    return {
      ...pipeline,
      blocks: pipeline.steps.map<Block>((step) => {
        const handles: Record<Step.Category, Block.Handle[]> = {
          [Step.Category.producer]: [Block.Handle.output],
          [Step.Category.transformer]: [Block.Handle.output, Block.Handle.input],
          [Step.Category.consumer]: [Block.Handle.input],
        };
        return {
          id: step.id,
          incomingId: step.previousStepId,
          label: typeLabels[step.type],
          handles: handles[Step.getCategory(step)],
        };
      }),
    };
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
      Step.Type.postgres_backup,
      Step.Type.s3_download,
      Step.Type.fs_read,
      // Transformers
      Step.Type.compression,
      Step.Type.decompression,
      Step.Type.encryption,
      Step.Type.decryption,
      // Consumers
      Step.Type.s3_upload,
      Step.Type.fs_write,
    ];

    Object.values(Step.Type).map((type) => {
      const category = Step.getCategory({ type });
      const existing = buttonGroups.find((x) => x.category === category);
      if (existing) {
        existing.steps.push({
          type,
          typeLabel: typeLabels[type],
        });
      } else {
        buttonGroups.push({
          category,
          categoryLabel: categoryLabels[category],
          steps: [
            {
              type,
              typeLabel: typeLabels[type],
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
