export type Artifact = {
  id: string;
  type: "file" | "directory";
  name: string;
  path: string;
};
