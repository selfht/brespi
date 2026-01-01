export class CommandRunner {
  public static async run({ cmd, cwd, env }: CommandRunner.Options): Promise<CommandRunner.Result> {
    const process = Bun.spawn({
      cmd,
      cwd,
      env,
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    const stdallChunks: string[] = [];

    // Read both streams concurrently and capture interleaved output
    await Promise.all([
      (async () => {
        const reader = process.stdout.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            stdoutChunks.push(text);
            stdallChunks.push(text);
          }
        } finally {
          reader.releaseLock();
        }
      })(),
      (async () => {
        const reader = process.stderr.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            stderrChunks.push(text);
            stdallChunks.push(text);
          }
        } finally {
          reader.releaseLock();
        }
      })(),
    ]);

    await process.exited;
    return {
      exitCode: process.exitCode!,
      stdout: stdoutChunks.join(""),
      stderr: stderrChunks.join(""),
      stdall: stdallChunks.join(""),
    };
  }
}

export namespace CommandRunner {
  export type Options = {
    cmd: string[];
    cwd?: string;
    env?: Record<string, string | undefined>;
  };
  export type Result = {
    exitCode: number;
    stdout: string;
    stderr: string;
    stdall: string;
  };
}
