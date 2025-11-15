export type Artifact = {
  path: string;
  name: string;
  timestamp: number;
} & (
  | {
      type: "file";
      size: number;
    }
  | {
      type: "directory";
    }
);
