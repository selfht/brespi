export type Artifact = Artifact.File | Artifact.Directory;

export namespace Artifact {
  type Common = {
    id: string;
    name: string;
    path: string;
  };

  export type File = Common & {
    type: "file";
    size: number;
  };

  export type Directory = Common & {
    type: "directory";
  };
}
