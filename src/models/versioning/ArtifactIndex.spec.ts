import { describe, expect, it } from "bun:test";
import { ArtifactIndex } from "./ArtifactIndex";

describe("ArtifactIndex", () => {
  type TestCase = {
    artifactNames: string[];
    expectation: {
      indexName: string;
    };
  };
  it.each<TestCase>([
    {
      artifactNames: ["normal", "non-clashing", "artifact", "names"],
      expectation: { indexName: "__brespi_artifact_index__.json" },
    },
    {
      artifactNames: ["brespi_artifact_index.json"],
      expectation: { indexName: "__brespi_artifact_index__.json" },
    },
    {
      artifactNames: ["__brespi_artifact_index__.json"],
      expectation: { indexName: "___brespi_artifact_index___.json" },
    },
    {
      artifactNames: ["__brespi_artifact_index__.json", "___brespi_artifact_index___.json"],
      expectation: { indexName: "____brespi_artifact_index____.json" },
    },
    {
      artifactNames: ["___brespi_artifact_index___.json"],
      expectation: { indexName: "__brespi_artifact_index__.json" },
    },
  ])("constructs a unique index name", ({ artifactNames, expectation }) => {
    // given
    const artifacts = artifactNames.map((name) => ({ name }));
    // when
    const indexName = ArtifactIndex.generateName(artifacts);
    // then
    expect(indexName).toEqual(expectation.indexName);
  });
});
