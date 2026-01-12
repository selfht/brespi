import { describe, expect, it } from "bun:test";
import { CommandRunner } from "./CommandRunner";
import { Test } from "@/testing/Test.test";

describe(CommandRunner.name, () => {
  const successCollection = Test.createCollection<{
    description: string;
    cmd: string[];
    expectation: {
      exitCode: number;
      stdout: string;
      stderr: string;
      stdallContains?: string[];
    };
  }>("description", [
    {
      description: "captures stdout only",
      cmd: ["sh", "-c", "echo 'hello stdout'"],
      expectation: {
        exitCode: 0,
        stdout: "hello stdout\n",
        stderr: "",
        stdallContains: ["hello stdout"],
      },
    },
    {
      description: "captures stderr only",
      cmd: ["sh", "-c", "echo 'hello stderr' >&2"],
      expectation: {
        exitCode: 0,
        stdout: "",
        stderr: "hello stderr\n",
        stdallContains: ["hello stderr"],
      },
    },
    {
      description: "captures both stdout and stderr separately",
      cmd: ["sh", "-c", "echo 'out1'; echo 'err1' >&2; echo 'out2'; echo 'err2' >&2"],
      expectation: {
        exitCode: 0,
        stdout: "out1\nout2\n",
        stderr: "err1\nerr2\n",
        stdallContains: ["out1", "err1", "out2", "err2"],
      },
    },
    {
      description: "handles non-zero exit code",
      cmd: ["sh", "-c", "echo 'before exit'; exit 42"],
      expectation: {
        exitCode: 42,
        stdout: "before exit\n",
        stderr: "",
      },
    },
    {
      description: "handles empty output",
      cmd: ["sh", "-c", "exit 0"],
      expectation: {
        exitCode: 0,
        stdout: "",
        stderr: "",
        stdallContains: [],
      },
    },
    {
      description: "preserves multiline output",
      cmd: ["sh", "-c", "printf 'line1\\nline2\\nline3'"],
      expectation: {
        exitCode: 0,
        stdout: "line1\nline2\nline3",
        stderr: "",
        stdallContains: ["line1", "line2", "line3"],
      },
    },
    {
      description: "handles interleaved stdout and stderr",
      cmd: ["sh", "-c", "echo 'A'; echo 'B' >&2; echo 'C'; echo 'D' >&2; echo 'E'"],
      expectation: {
        exitCode: 0,
        stdout: "A\nC\nE\n",
        stderr: "B\nD\n",
        stdallContains: ["A", "B", "C", "D", "E"],
      },
    },
  ]);

  it.each(successCollection.testCases)("%s", async (testCase) => {
    // given
    const { cmd, expectation } = successCollection.get(testCase);
    // when
    const result = await CommandRunner.run({ cmd });
    // then
    expect(result.exitCode).toBe(expectation.exitCode);
    expect(result.stdout).toBe(expectation.stdout);
    expect(result.stderr).toBe(expectation.stderr);
    if (expectation.stdallContains) {
      for (const str of expectation.stdallContains) {
        expect(result.stdall).toContain(str);
      }
    }
    expect(result.stdall.length).toBe(result.stdout.length + result.stderr.length);
  });

  it("stdall contains all output from both streams", async () => {
    // given
    const cmd = ["sh", "-c", "echo 'stdout1'; echo 'stderr1' >&2; echo 'stdout2'; echo 'stderr2' >&2"];
    // when
    const result = await CommandRunner.run({ cmd });
    // then
    expect(result.stdout).toBe("stdout1\nstdout2\n");
    expect(result.stderr).toBe("stderr1\nstderr2\n");
    expect(result.stdall).toContain("stdout1");
    expect(result.stdall).toContain("stdout2");
    expect(result.stdall).toContain("stderr1");
    expect(result.stdall).toContain("stderr2");
    expect(result.stdall.length).toBe(result.stdout.length + result.stderr.length);
    const stdallLines = result.stdall.split("\n").filter((l) => l.length > 0);
    expect(stdallLines).toHaveLength(4);
    expect(stdallLines).toContain("stdout1");
    expect(stdallLines).toContain("stdout2");
    expect(stdallLines).toContain("stderr1");
    expect(stdallLines).toContain("stderr2");
  });

  it("passes environment variables to command", async () => {
    // given
    const cmd = ["sh", "-c", "echo $TEST_VAR"];
    const env = { TEST_VAR: "test-value" };
    // when
    const result = await CommandRunner.run({ cmd, env });
    // then
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("test-value\n");
  });
});
